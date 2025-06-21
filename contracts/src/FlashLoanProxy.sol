// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/Interfaces.sol";
import "./storage/DataStructures.sol";
import "./libraries/safeMath.sol";
import "./libraries/SafeERC20.sol";
import "./FlashLoanExecutor/FlashLoanExecutorStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title FlashLoanProxy
 * @dev Lightweight proxy contract that delegates to implementation contracts
 * @notice This contract solves the EIP-170 size limit by using a delegate pattern
 */
contract FlashLoanProxy is 
    IFlashLoanReceiver, 
    FlashLoanExecutorStorage, 
    ReentrancyGuard,
    Initializable {
    
    using SafeMath for uint256;
    using SafeERC20 for IERC20Extended;

    // ============ IMPLEMENTATION CONTRACTS ============
    address public immutable adminImpl;
    address public immutable executionImpl;
    address public immutable profitImpl;
    address public immutable strategyImpl;

    // ============ CONSTANTS ============
    uint256 public constant MIN_PROFIT_BPS = 50; // 0.5%
    uint256 public constant DEADLINE_BUFFER = 300; // 5 minutes

    // ============ EVENTS ============
    event FlashLoanInitiated(
        address indexed initiator,
        uint256 indexed strategyId,
        address[] assets,
        uint256[] amounts
    );
    event StrategyExecuted(
        uint256 indexed strategyId,
        address indexed executor,
        uint256 profitGenerated,
        uint256 gasUsed,
        bool success
    );

    constructor(
        address _addressProvider,
        address _weth,
        address _adminImpl,
        address _executionImpl,
        address _profitImpl,
        address _strategyImpl
    ) FlashLoanExecutorStorage(_addressProvider, _weth, msg.sender) {
        require(_adminImpl != address(0), "Invalid admin implementation");
        require(_executionImpl != address(0), "Invalid execution implementation");
        require(_profitImpl != address(0), "Invalid profit implementation");
        require(_strategyImpl != address(0), "Invalid strategy implementation");

        adminImpl = _adminImpl;
        executionImpl = _executionImpl;
        profitImpl = _profitImpl;
        strategyImpl = _strategyImpl;
    }

    function initialize() external initializer onlyOwner {
        safetyParams = DataStructures.SafetyParams({
            maxSlippageBPS: 300,
            deadlineBuffer: DEADLINE_BUFFER,
            minProfitBPS: MIN_PROFIT_BPS,
            maxGasPrice: 100 gwei,
            maxExecutionTime: 600,
            emergencyStop: false
        });

        // Initialize average gas usage estimates
        avgGasUsage[DataStructures.ActionType.SWAP] = 150000;
        avgGasUsage[DataStructures.ActionType.LEND] = 200000;
        avgGasUsage[DataStructures.ActionType.BORROW] = 250000;
        avgGasUsage[DataStructures.ActionType.STAKE] = 180000;
        avgGasUsage[DataStructures.ActionType.HARVEST] = 120000;
        avgGasUsage[DataStructures.ActionType.WRAP] = 50000;
        avgGasUsage[DataStructures.ActionType.UNWRAP] = 50000;
    }

    // ============ AAVE FLASH LOAN CALLBACK ============
    struct StrategyParams {
        uint256 strategyId;
        address executor;
        bytes userData;
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(aavePool), "Caller is not Aave V3 Pool");
        require(initiator == address(this), "Initiator is not this contract");

        StrategyParams memory sp = _decodeParams(params);
        
        // Delegate to execution implementation
        (bool success, ) = executionImpl.delegatecall(
            abi.encodeWithSignature(
                "executeStrategyAndTrack((uint256,address,bytes),address[],uint256[],uint256[])",
                sp,
                assets,
                amounts,
                premiums
            )
        );
        
        require(success, "Execution failed");
        return true;
    }

    function _decodeParams(bytes calldata params) internal pure returns (StrategyParams memory) {
        (uint256 strategyId, address executor, bytes memory userData) = abi.decode(
            params, 
            (uint256, address, bytes)
        );
        return StrategyParams(strategyId, executor, userData);
    }

    // ============ MAIN EXTERNAL FUNCTIONS ============
    function executeStrategy(
        uint256 strategyId,
        address[] calldata assets,
        uint256[] calldata amounts,
        bytes calldata userData
    )
        external
        nonReentrant
        notInEmergency
        validStrategy(strategyId)
        onlyAuthorized
    {
        require(assets.length == amounts.length, "Array length mismatch");
        require(assets.length > 0, "No assets specified");
        require(tx.gasprice <= safetyParams.maxGasPrice, "Gas price too high");

        // Validate strategy permissions
        require(
            strategies[strategyId].creator == msg.sender ||
                authorizedExecutors[msg.sender] ||
                msg.sender == owner(),
            "Not authorized to execute this strategy"
        );

        bytes memory params = abi.encode(strategyId, msg.sender, userData);
        emit FlashLoanInitiated(msg.sender, strategyId, assets, amounts);

        aavePool.flashLoan(
            address(this),
            assets,
            amounts,
            new uint256[](assets.length),
            address(this),
            params,
            0
        );
    }

    // ============ DELEGATED FUNCTIONS ============
    
    // Admin functions
    function setDEXRouter(string calldata /* dexName */, address /* router */) external {
        _delegateToAdmin(msg.data);
    }

    function toggleEmergencyStop(bool /* _stopped */) external {
        _delegateToAdmin(msg.data);
    }

    function setAuthorizedExecutor(address /* executor */, bool /* isAuthorized */) external {
        _delegateToAdmin(msg.data);
    }

    // Strategy functions
    function createStrategy(
        string calldata /* name */,
        DataStructures.Action[] calldata /* actions */,
        uint256 /* deadline */,
        uint256 /* minProfitBPS */
    ) external {
        _delegateToStrategy(msg.data);
    }

    function getStrategyBasicInfo(uint256 strategyId) external view returns (
        uint256 id,
        address creator,
        bool active,
        uint256 executionCount
    ) {
        DataStructures.Strategy storage strategy = strategies[strategyId];
        return (strategy.id, strategy.creator, strategy.active, strategy.executionCount);
    }

    // Profit functions
    function withdrawProfits(address /* token */, uint256 /* amount */) external {
        _delegateToProfit(msg.data);
    }

    function getUserProfit(address user, address token) external view returns (uint256) {
        return userProfits[user][token];
    }

    // ============ INTERNAL DELEGATION HELPERS ============
    function _delegateToAdmin(bytes memory data) internal {
        (bool success, ) = adminImpl.delegatecall(data);
        require(success, "Admin delegation failed");
    }

    function _delegateToStrategy(bytes memory data) internal {
        (bool success, ) = strategyImpl.delegatecall(data);
        require(success, "Strategy delegation failed");
    }

    function _delegateToProfit(bytes memory data) internal {
        (bool success, ) = profitImpl.delegatecall(data);
        require(success, "Profit delegation failed");
    }

    // ============ EMERGENCY FUNCTIONS ============
    function emergencyWithdraw(address token, address to) external onlyOwner {
        require(emergencyStop, "Emergency stop not active");
        require(to != address(0), "Invalid recipient");

        if (token == address(0)) {
            payable(to).transfer(address(this).balance);
        } else {
            uint256 balance = IERC20Extended(token).balanceOf(address(this));
            if (balance > 0) {
                IERC20Extended(token).safeTransfer(to, balance);
            }
        }
    }

    // ============ FALLBACK FUNCTIONS ============
    receive() external payable {}
    fallback() external payable {}
}
