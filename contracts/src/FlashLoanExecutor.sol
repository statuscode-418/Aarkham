// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/Interfaces.sol";
import "./storage/DataStructures.sol";
import "./libraries/library.sol";
import "./libraries/SafeERC20.sol";
import "./libraries/safeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FlashLoanExecutorOptimized
 * @dev Optimized Flash Loan Executor that fits within EIP-170 size limit
 * @notice This contract enables DeFi strategies using Aave V3 flash loans
 */
contract FlashLoanExecutor is IFlashLoanReceiver, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Extended;

    // ============ IMMUTABLE VARIABLES ============
    IAaveV3Pool public immutable aavePool;
    IPoolAddressesProvider public immutable addressProvider;
    IWETH public immutable weth;

    // ============ STATE VARIABLES ============
    mapping(uint256 => DataStructures.Strategy) public strategies;
    mapping(uint256 => DataStructures.Action[]) public strategyActions;
    mapping(string => address) public dexRouters;
    mapping(address => bool) public authorizedExecutors;
    mapping(address => mapping(address => uint256)) public userProfits;
    
    uint256 public nextStrategyId = 1;
    bool public emergencyStop;
    
    // Safety parameters
    uint256 public maxSlippageBPS = 300;
    uint256 public minProfitBPS = 50;
    uint256 public maxGasPrice = 100 gwei;

    // ============ EVENTS ============
    event FlashLoanInitiated(address indexed initiator, uint256 indexed strategyId);
    event StrategyExecuted(uint256 indexed strategyId, address indexed executor, uint256 profit);
    event StrategyCreated(uint256 indexed strategyId, address indexed creator);

    // ============ CONSTRUCTOR ============
    constructor(
        address _addressProvider,
        address _weth
    ) Ownable(msg.sender) {
        require(_addressProvider != address(0), "Invalid address provider");
        require(_weth != address(0), "Invalid WETH address");

        addressProvider = IPoolAddressesProvider(_addressProvider);
        
        // Try to get pool from address provider, fallback to using the address directly
        try addressProvider.getPool() returns (address poolAddress) {
            require(poolAddress != address(0), "Pool address is zero");
            aavePool = IAaveV3Pool(poolAddress);
        } catch {
            // If getPool() fails, assume the address provider is actually the pool address
            aavePool = IAaveV3Pool(_addressProvider);
        }
        
        weth = IWETH(_weth);
        authorizedExecutors[msg.sender] = true;
    }

    // ============ MODIFIERS ============
    modifier onlyAuthorized() {
        require(authorizedExecutors[msg.sender] || msg.sender == owner(), "Unauthorized");
        _;
    }

    modifier notInEmergency() {
        require(!emergencyStop, "Emergency stop active");
        _;
    }

    modifier validStrategy(uint256 strategyId) {
        require(strategyId > 0 && strategyId < nextStrategyId, "Invalid strategy ID");
        require(strategies[strategyId].active, "Strategy not active");
        _;
    }

    // ============ AAVE FLASH LOAN CALLBACK ============
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(aavePool), "Caller is not Aave V3 Pool");
        require(initiator == address(this), "Initiator is not this contract");

        (uint256 strategyId, address executor) = abi.decode(params, (uint256, address));
        
        uint256 profit = _executeStrategy(strategyId, assets, amounts, premiums);
        _repayFlashLoan(assets, amounts, premiums);
        
        userProfits[executor][assets[0]] = userProfits[executor][assets[0]].add(profit);
        emit StrategyExecuted(strategyId, executor, profit);
        
        return true;
    }

    // ============ STRATEGY FUNCTIONS ============
    function createStrategy(
        string calldata name,
        DataStructures.ActionType[] calldata actionTypes,
        address[] calldata targets,
        bytes[] calldata datas,
        uint256 minProfitBPS_
    ) external onlyAuthorized {
        require(actionTypes.length == targets.length && targets.length == datas.length, "Array length mismatch");
        
        uint256 strategyId = nextStrategyId++;
        
        DataStructures.Strategy storage strategy = strategies[strategyId];
        strategy.id = strategyId;
        strategy.strategyType = DataStructures.StrategyType.CUSTOM;
        strategy.creator = msg.sender;
        strategy.active = true;
        strategy.minProfitBPS = minProfitBPS_;
        strategy.maxGasPrice = maxGasPrice;
        strategy.deadline = block.timestamp + 30 days;
        strategy.name = name;
        strategy.description = "";
        strategy.executionCount = 0;
        strategy.totalProfit = 0;
        strategy.createdAt = block.timestamp;

        // Add actions
        for (uint i = 0; i < actionTypes.length; i++) {
            strategyActions[strategyId].push(DataStructures.Action({
                target: targets[i],
                data: datas[i],
                value: 0,
                actionType: actionTypes[i],
                expectedGasUsage: 150000,
                critical: true,
                description: ""
            }));
        }

        emit StrategyCreated(strategyId, msg.sender);
    }

    function executeStrategy(
        uint256 strategyId,
        address[] calldata assets,
        uint256[] calldata amounts
    ) external nonReentrant notInEmergency validStrategy(strategyId) onlyAuthorized {
        require(assets.length == amounts.length, "Array length mismatch");
        require(tx.gasprice <= maxGasPrice, "Gas price too high");

        bytes memory params = abi.encode(strategyId, msg.sender);
        emit FlashLoanInitiated(msg.sender, strategyId);

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

    // ============ INTERNAL FUNCTIONS ============
    function _executeStrategy(
        uint256 strategyId,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums
    ) internal returns (uint256 profit) {
        uint256 balanceBefore = IERC20Extended(assets[0]).balanceOf(address(this));
        
        DataStructures.Action[] storage actions = strategyActions[strategyId];
        for (uint i = 0; i < actions.length; i++) {
            _executeAction(actions[i]);
        }
        
        uint256 balanceAfter = IERC20Extended(assets[0]).balanceOf(address(this));
        uint256 totalOwed = amounts[0].add(premiums[0]);
        
        if (balanceAfter > balanceBefore.add(totalOwed)) {
            profit = balanceAfter.sub(balanceBefore).sub(totalOwed);
        }
        
        strategies[strategyId].executionCount++;
        strategies[strategyId].totalProfit = strategies[strategyId].totalProfit.add(profit);
    }

    function _executeAction(DataStructures.Action memory action) internal {
        if (action.actionType == DataStructures.ActionType.SWAP) {
            _executeSwap(action);
        } else {
            // Generic action execution
            (bool success,) = action.target.call{value: action.value}(action.data);
            require(success || !action.critical, "Action failed");
        }
    }

    function _executeSwap(DataStructures.Action memory action) internal {
        DataStructures.SwapParams memory swapParams = abi.decode(action.data, (DataStructures.SwapParams));
        DEXLibrary.executeSwap(swapParams, dexRouters);
    }

    function _repayFlashLoan(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums
    ) internal {
        for (uint i = 0; i < assets.length; i++) {
            uint256 amountOwing = amounts[i].add(premiums[i]);
            IERC20Extended(assets[i]).approve(address(aavePool), amountOwing);
        }
    }

    // ============ ADMIN FUNCTIONS ============
    function setDEXRouter(string calldata dexName, address router) external onlyOwner {
        dexRouters[dexName] = router;
    }

    function setAuthorizedExecutor(address executor, bool isAuthorized) external onlyOwner {
        authorizedExecutors[executor] = isAuthorized;
    }

    function toggleEmergencyStop() external onlyOwner {
        emergencyStop = !emergencyStop;
    }

    function updateSafetyParams(
        uint256 _maxSlippageBPS,
        uint256 _minProfitBPS,
        uint256 _maxGasPrice
    ) external onlyOwner {
        maxSlippageBPS = _maxSlippageBPS;
        minProfitBPS = _minProfitBPS;
        maxGasPrice = _maxGasPrice;
    }

    // ============ EMERGENCY FUNCTIONS ============
    function emergencyWithdraw(address token, address to) external onlyOwner {
        require(emergencyStop, "Emergency stop not active");
        if (token == address(0)) {
            payable(to).transfer(address(this).balance);
        } else {
            uint256 balance = IERC20Extended(token).balanceOf(address(this));
            if (balance > 0) {
                IERC20Extended(token).safeTransfer(to, balance);
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    function getStrategy(uint256 strategyId) external view returns (
        uint256 id,
        address creator,
        bool active,
        uint256 minProfitBPS_,
        uint256 executionCount,
        uint256 totalProfit
    ) {
        DataStructures.Strategy storage strategy = strategies[strategyId];
        return (
            strategy.id,
            strategy.creator,
            strategy.active,
            strategy.minProfitBPS,
            strategy.executionCount,
            strategy.totalProfit
        );
    }

    function getUserProfit(address user, address token) external view returns (uint256) {
        return userProfits[user][token];
    }

    function getStrategyActionsCount(uint256 strategyId) external view returns (uint256) {
        return strategyActions[strategyId].length;
    }

    // ============ FALLBACK FUNCTIONS ============
    receive() external payable {}
    fallback() external payable {}
}
