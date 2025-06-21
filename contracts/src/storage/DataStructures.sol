// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DataStructures
 * @dev Collection of all data structures, enums, and events for the Flash Loan Executor
 */

library DataStructures {
    // ============ ENUMS ============

    enum StrategyType {
        ARBITRAGE, // Cross-DEX price differences
        LIQUIDATION, // Liquidating undercollateralized positions
        YIELD_FARMING, // Optimizing yield strategies
        LEVERAGE, // Leverage trading strategies
        DEFI_COMPOSE, // Complex DeFi composability
        CUSTOM // Custom user-defined strategies
    }

    enum DEXType {
        UNISWAP_V2, // Uniswap V2 and forks
        UNISWAP_V3, // Uniswap V3
        SUSHISWAP, // SushiSwap
        QUICKSWAP, // QuickSwap
        BALANCER, // Balancer
        CURVE, // Curve Finance
        PANCAKESWAP, // PancakeSwap (for BSC)
        CUSTOM // Custom DEX implementation
    }

    enum ActionType {
        SWAP, // Token swapping
        LEND, // Lending/supplying to protocols
        BORROW, // Borrowing from protocols
        STAKE, // Staking tokens
        UNSTAKE, // Unstaking tokens
        HARVEST, // Harvesting rewards
        BRIDGE, // Cross-chain bridging
        WRAP, // Wrapping tokens (ETH -> WETH)
        UNWRAP, // Unwrapping tokens (WETH -> ETH)
        CUSTOM // Custom action
    }

    enum ExecutionStatus {
        PENDING, // Strategy execution pending
        IN_PROGRESS, // Currently executing
        SUCCESS, // Successfully executed
        FAILED, // Execution failed
        CANCELLED // Execution cancelled
    }

    enum PriceSource {
        CHAINLINK, // Chainlink oracle
        AAVE_ORACLE, // Aave price oracle
        DEX_ORACLE, // DEX-based pricing
        CUSTOM_ORACLE // Custom oracle implementation
    }

    // ============ CORE STRUCTURES ============

    struct Strategy {
        uint256 id; // Unique strategy identifier
        StrategyType strategyType; // Type of strategy
        address creator; // Strategy creator
        bool active; // Whether strategy is active
        uint256 minProfitBPS; // Minimum profit in basis points
        uint256 maxGasPrice; // Maximum gas price for execution
        uint256 deadline; // Strategy expiration timestamp
        Action[] actions; // Array of actions to execute
        string name; // Strategy name
        string description; // Strategy description
        uint256 executionCount; // Number of times executed
        uint256 totalProfit; // Total profit generated
        uint256 createdAt; // Creation timestamp
        mapping(address => bool) authorizedExecutors; // Authorized executors
    }

    struct Action {
        address target; // Target contract address
        bytes data; // Encoded function call data
        uint256 value; // ETH value to send
        ActionType actionType; // Type of action
        uint256 expectedGasUsage; // Expected gas consumption
        bool critical; // Whether failure should revert entire strategy
        string description; // Action description
    }

    struct SwapParams {
        DEXType dexType; // Which DEX to use
        address tokenIn; // Input token
        address tokenOut; // Output token
        uint256 amountIn; // Input amount
        uint256 minAmountOut; // Minimum output amount
        address[] path; // Token path for routing
        uint24 fee; // Fee tier (for V3)
        address recipient; // Recipient of output tokens
        uint256 deadline; // Transaction deadline
        bytes extraData; // Additional DEX-specific data
    }

    struct ArbitrageOpportunity {
        address tokenA; // First token in pair
        address tokenB; // Second token in pair
        address dexA; // First DEX address
        address dexB; // Second DEX address
        uint256 amountIn; // Input amount for arbitrage
        uint256 expectedProfit; // Expected profit amount
        uint256 slippageTolerance; // Allowed slippage in BPS
        uint256 gasEstimate; // Estimated gas cost
        uint256 validUntil; // Opportunity valid until timestamp
        PriceSource priceSource; // Source of price data
    }

    struct LiquidationParams {
        address protocol; // Lending protocol address
        address user; // User to liquidate
        address collateralAsset; // Collateral token
        address debtAsset; // Debt token
        uint256 debtToCover; // Amount of debt to cover
        bool receiveAToken; // Whether to receive aTokens
    }

    struct YieldFarmingParams {
        address farmContract; // Farming contract address
        uint256 poolId; // Pool ID in farm
        address stakingToken; // Token to stake
        address rewardToken; // Reward token
        uint256 amount; // Amount to stake/unstake
        bool isStaking; // True for stake, false for unstake
    }

    struct LeverageParams {
        address asset; // Asset to leverage
        uint256 initialAmount; // Initial amount
        uint256 leverageRatio; // Leverage multiplier (in BPS)
        address collateralAsset; // Collateral asset
        address borrowAsset; // Asset to borrow
        uint256 maxSlippage; // Maximum allowed slippage
    }

    // ============ EXECUTION TRACKING ============

    struct ExecutionResult {
        uint256 strategyId; // Strategy that was executed
        address executor; // Who executed the strategy
        ExecutionStatus status; // Execution status
        uint256 gasUsed; // Gas consumed
        uint256 profitGenerated; // Profit in USD
        uint256 executionTime; // Execution timestamp
        string errorMessage; // Error message if failed
        bytes32 txHash; // Transaction hash
    }

    struct ProfitReport {
        address token; // Token address
        uint256 amount; // Profit amount
        uint256 valueUSD; // Value in USD
        uint256 timestamp; // When profit was generated
        uint256 strategyId; // Strategy that generated profit
    }

    // ============ CONFIGURATION STRUCTURES ============

    struct ProtocolConfig {
        address addressProvider; // Protocol address provider
        bool active; // Whether protocol is active
        uint256 maxFlashLoanAmount; // Maximum flash loan amount
        uint256 flashLoanFee; // Flash loan fee in BPS
        mapping(address => bool) supportedAssets; // Supported assets
    }

    struct DEXConfig {
        string name; // DEX name
        address router; // Router contract address
        address factory; // Factory contract address
        DEXType dexType; // Type of DEX
        bool active; // Whether DEX is active
        uint256 swapFee; // Swap fee in BPS
        mapping(address => mapping(address => address)) pairAddresses; // Token pair addresses
    }

    struct SafetyParams {
        uint256 maxSlippageBPS; // Maximum allowed slippage
        uint256 deadlineBuffer; // Deadline buffer in seconds
        uint256 minProfitBPS; // Minimum profit requirement
        uint256 maxGasPrice; // Maximum gas price
        uint256 maxExecutionTime; // Maximum execution time
        bool emergencyStop; // Emergency stop flag
    }

    struct GasOptimization {
        uint256 maxGasUsage; // Maximum gas per transaction
        uint256 gasBuffer; // Gas buffer for calculations
        mapping(ActionType => uint256) avgGasUsage; // Average gas per action type
    }

    // ============ EVENTS ============

    event StrategyCreated(
        uint256 indexed strategyId,
        address indexed creator,
        StrategyType strategyType,
        string name
    );

    event StrategyExecuted(
        uint256 indexed strategyId,
        address indexed executor,
        uint256 profitGenerated,
        uint256 gasUsed
    );

    event FlashLoanExecuted(
        address indexed initiator,
        uint256 indexed strategyId,
        address[] assets,
        uint256[] amounts,
        uint256 totalProfit
    );

    event ArbitrageExecuted(
        address indexed executor,
        address tokenA,
        address tokenB,
        address dexA,
        address dexB,
        uint256 profit
    );

    event LiquidationExecuted(
        address indexed executor,
        address indexed protocol,
        address indexed user,
        address collateralAsset,
        address debtAsset,
        uint256 profit
    );

    event DEXRouterUpdated(
        string indexed dexName,
        address indexed oldRouter,
        address indexed newRouter
    );

    event SlippageUpdated(uint256 oldSlippageBPS, uint256 newSlippageBPS);

    event ProfitExtracted(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );

    event EmergencyStop(bool stopped, address indexed admin, string reason);

    event StrategyStatusUpdated(
        uint256 indexed strategyId,
        bool active,
        address indexed updater
    );

    event GasOptimizationUpdated(
        ActionType indexed actionType,
        uint256 oldGasUsage,
        uint256 newGasUsage
    );

    event PriceOracleUpdated(
        address indexed oldOracle,
        address indexed newOracle,
        PriceSource priceSource
    );

    // ============ ERRORS ============

    error InsufficientProfit(uint256 expected, uint256 actual);
    error SlippageExceeded(uint256 expected, uint256 actual);
    error DeadlineExceeded(uint256 deadline, uint256 currentTime);
    error UnauthorizedExecutor(address executor);
    error StrategyNotActive(uint256 strategyId);
    error InvalidSwapPath(address[] path);
    error InsufficientBalance(
        address token,
        uint256 required,
        uint256 available
    );
    error FlashLoanFailed(address asset, uint256 amount);
    error ExecutionReverted(string reason);
    error GasLimitExceeded(uint256 gasUsed, uint256 gasLimit);
    error InvalidConfiguration(string parameter);
    error ProtocolNotSupported(address protocol);
    error TokenNotSupported(address token);
    error EmergencyStopActive();
    error StrategyExpired(uint256 strategyId, uint256 deadline);
}
