// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FlashLoanExecutorStorage
 * @dev Base contract containing all shared state variables
 */
abstract contract FlashLoanExecutorStorage is Ownable {
    // ============ IMMUTABLE VARIABLES ============
    IAaveV3Pool public immutable aavePool;
    IPoolAddressesProvider public immutable addressProvider;
    IWETH public immutable weth;
    IAaveOracle public aaveOracle;

    // ============ STRATEGY MANAGEMENT ============
    mapping(uint256 => DataStructures.Strategy) public strategies;
    mapping(address => mapping(uint256 => bool)) public userStrategies;
    mapping(uint256 => DataStructures.Action[]) public strategyActions;
    mapping(uint256 => DataStructures.ExecutionResult[]) public strategyExecutions;
    uint256 public nextStrategyId;

    // ============ DEX CONFIGURATION ============
    mapping(string => address) public dexRouters;
    mapping(string => bool) public supportedDEXes;

    // ============ SAFETY PARAMETERS ============
    DataStructures.SafetyParams public safetyParams;

    // ============ PROFIT TRACKING ============
    mapping(address => uint256) public totalProfits;
    mapping(address => mapping(address => uint256)) public userProfits;
    mapping(address => uint256) private balancesBefore;
    mapping(address => uint256) private balancesAfter;

    // ============ EMERGENCY CONTROLS ============
    bool public emergencyStop;
    mapping(address => bool) public authorizedExecutors;

    // ============ GAS OPTIMIZATION ============
    mapping(DataStructures.ActionType => uint256) public avgGasUsage;

    // ============ PROTOCOL CONFIGURATIONS ============
    mapping(address => address) public priceOracles;
    mapping(address => DataStructures.ProtocolConfig) public protocolConfigs;

    // ============ CONSTANTS ============
    uint256 public constant MAX_STRATEGIES_PER_USER = 50;
    uint256 public constant MAX_SLIPPAGE_BPS = 1000; // 10%
    uint256 public constant BPS_BASE = 10000;

    // ============ CONSTRUCTOR ============
    constructor(address _addressProvider, address _weth, address _owner) Ownable(_owner) {
        addressProvider = IPoolAddressesProvider(_addressProvider);
        aavePool = IAaveV3Pool(addressProvider.getPool());
        aaveOracle = IAaveOracle(addressProvider.getPriceOracle());
        weth = IWETH(_weth);
        nextStrategyId = 1;
        authorizedExecutors[_owner] = true;
    }

    // ============ MODIFIERS ============
    modifier onlyAuthorized() {
        require(
            authorizedExecutors[msg.sender] || msg.sender == owner(),
            "Unauthorized"
        );
        _;
    }

    modifier notInEmergency() {
        require(!emergencyStop, "Emergency stop active");
        _;
    }

    modifier validStrategy(uint256 strategyId) {
        require(
            strategyId > 0 && strategyId < nextStrategyId,
            "Invalid strategy ID"
        );
        require(strategies[strategyId].active, "Strategy not active");
        require(
            strategies[strategyId].deadline > block.timestamp,
            "Strategy expired"
        );
        _;
    }

    // ============ INTERNAL HELPER FUNCTIONS ============
    function _recordBalancesBefore(address[] calldata assets) internal {
        for (uint i = 0; i < assets.length; i++) {
            balancesBefore[assets[i]] = IERC20Extended(assets[i]).balanceOf(address(this));
        }
    }

    function _recordBalancesAfter(address[] calldata assets) internal {
        for (uint i = 0; i < assets.length; i++) {
            balancesAfter[assets[i]] = IERC20Extended(assets[i]).balanceOf(address(this));
        }
    }

    function _getBalanceBefore(address asset) internal view returns (uint256) {
        return balancesBefore[asset];
    }

    function _getBalanceAfter(address asset) internal view returns (uint256) {
        return balancesAfter[asset];
    }
}
