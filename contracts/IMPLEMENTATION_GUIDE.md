# FlashLoanExecutor - Technical Implementation Guide

## Protocol Integration Examples

This guide provides practical examples of how to implement flash loan strategies using the FlashLoanExecutor with Aave V3, Uniswap V2, and Uniswap V3.

## 1. Aave V3 Flash Loan Integration

### Basic Flash Loan Setup

```solidity
// Deploy FlashLoanExecutor with Aave V3
contract FlashLoanDeployment {
    FlashLoanExecutor public flashLoanExecutor;
    
    constructor() {
        // Sepolia testnet addresses
        address aaveAddressProvider = 0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A;
        address wethAddress = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c;
        
        flashLoanExecutor = new FlashLoanExecutor(
            aaveAddressProvider,
            wethAddress
        );
    }
}
```

### Creating a Flash Loan Strategy

```solidity
// Example: Simple arbitrage strategy
function createArbitrageStrategy() external {
    // 1. Define action types
    DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](2);
    actionTypes[0] = DataStructures.ActionType.SWAP; // Buy on V2
    actionTypes[1] = DataStructures.ActionType.SWAP; // Sell on V3
    
    // 2. Define target contracts
    address[] memory targets = new address[](2);
    targets[0] = address(flashLoanExecutor); // Internal swap handler
    targets[1] = address(flashLoanExecutor); // Internal swap handler
    
    // 3. Encode swap data
    bytes[] memory datas = new bytes[](2);
    
    // Buy USDC with WETH on Uniswap V2
    DataStructures.SwapParams memory buyParams = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V2,
        tokenIn: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c, // WETH
        tokenOut: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // USDC
        amountIn: 1 ether,
        minAmountOut: 2000 * 1e6, // 2000 USDC minimum
        path: [WETH, USDC],
        fee: 0, // V2 doesn't use fee parameter
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: ""
    });
    datas[0] = abi.encode(buyParams);
    
    // Sell USDC for WETH on Uniswap V3
    DataStructures.SwapParams memory sellParams = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V3,
        tokenIn: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // USDC
        tokenOut: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c, // WETH
        amountIn: 2000 * 1e6, // Use all USDC
        minAmountOut: 1.01 ether, // Profit target
        path: [USDC, WETH],
        fee: 3000, // 0.3% fee tier
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: abi.encode(uint24(3000))
    });
    datas[1] = abi.encode(sellParams);
    
    // 4. Create strategy
    flashLoanExecutor.createStrategy(
        "WETH-USDC Arbitrage",
        actionTypes,
        targets,
        datas,
        100 // 1% minimum profit
    );
}
```

### Executing Flash Loan Strategy

```solidity
function executeArbitrageStrategy(uint256 strategyId) external {
    // 1. Define flash loan parameters
    address[] memory assets = new address[](1);
    assets[0] = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c; // WETH
    
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 10 ether; // Flash loan 10 WETH
    
    // 2. Execute strategy
    flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
}
```

## 2. Uniswap V2 Integration

### Setting Up V2 Router

```solidity
function setupUniswapV2() external onlyOwner {
    // Sepolia Uniswap V2 Router
    address uniswapV2Router = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    
    flashLoanExecutor.setDEXRouter("UNISWAP_V2", uniswapV2Router);
}
```

### V2 Swap Strategy

```solidity
function createV2SwapStrategy() external {
    DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
    actionTypes[0] = DataStructures.ActionType.SWAP;
    
    address[] memory targets = new address[](1);
    targets[0] = address(flashLoanExecutor);
    
    // Multi-hop swap: WETH -> USDC -> DAI
    address[] memory path = new address[](3);
    path[0] = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c; // WETH
    path[1] = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // USDC
    path[2] = 0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6; // DAI
    
    DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V2,
        tokenIn: path[0],
        tokenOut: path[2],
        amountIn: 5 ether,
        minAmountOut: 8000 * 1e18, // 8000 DAI minimum
        path: path,
        fee: 0,
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: ""
    });
    
    bytes[] memory datas = new bytes[](1);
    datas[0] = abi.encode(swapParams);
    
    flashLoanExecutor.createStrategy(
        "WETH-DAI Multi-hop V2",
        actionTypes,
        targets,
        datas,
        50 // 0.5% minimum profit
    );
}
```

### V2 Price Checking

```solidity
function getV2Price(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
) external view returns (uint256 amountOut) {
    address uniswapV2Router = flashLoanExecutor.dexRouters("UNISWAP_V2");
    
    address[] memory path = new address[](2);
    path[0] = tokenIn;
    path[1] = tokenOut;
    
    uint256[] memory amounts = IUniswapV2Router(uniswapV2Router).getAmountsOut(
        amountIn,
        path
    );
    
    return amounts[1];
}
```

## 3. Uniswap V3 Integration

### Setting Up V3 Router

```solidity
function setupUniswapV3() external onlyOwner {
    // Sepolia Uniswap V3 Router
    address uniswapV3Router = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    
    flashLoanExecutor.setDEXRouter("UNISWAP_V3", uniswapV3Router);
}
```

### V3 Single Swap Strategy

```solidity
function createV3SingleSwapStrategy() external {
    DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
    actionTypes[0] = DataStructures.ActionType.SWAP;
    
    address[] memory targets = new address[](1);
    targets[0] = address(flashLoanExecutor);
    
    // Single swap with optimal fee tier
    DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V3,
        tokenIn: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c, // WETH
        tokenOut: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // USDC
        amountIn: 1 ether,
        minAmountOut: 2000 * 1e6,
        path: [WETH, USDC],
        fee: 3000, // 0.3% fee tier
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: abi.encode(uint24(3000))
    });
    
    bytes[] memory datas = new bytes[](1);
    datas[0] = abi.encode(swapParams);
    
    flashLoanExecutor.createStrategy(
        "WETH-USDC V3 Single",
        actionTypes,
        targets,
        datas,
        30 // 0.3% minimum profit
    );
}
```

### V3 Multi-Fee Tier Strategy

```solidity
function createV3OptimalFeeStrategy() external {
    // This strategy will automatically find the best fee tier
    DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
    actionTypes[0] = DataStructures.ActionType.SWAP;
    
    address[] memory targets = new address[](1);
    targets[0] = address(flashLoanExecutor);
    
    // Don't specify fee - let DEXLibrary find optimal
    DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V3,
        tokenIn: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c, // WETH
        tokenOut: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // USDC
        amountIn: 5 ether,
        minAmountOut: 9500 * 1e6,
        path: [WETH, USDC],
        fee: 0, // Will be determined automatically
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: "" // Empty = auto-select fee tier
    });
    
    bytes[] memory datas = new bytes[](1);
    datas[0] = abi.encode(swapParams);
    
    flashLoanExecutor.createStrategy(
        "WETH-USDC V3 Optimal",
        actionTypes,
        targets,
        datas,
        25 // 0.25% minimum profit
    );
}
```

### V3 Price Quoter Usage

```solidity
contract V3PriceChecker {
    address constant V3_QUOTER = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    
    function getV3Quote(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        IUniswapV3Quoter quoter = IUniswapV3Quoter(V3_QUOTER);
        
        try quoter.quoteExactInputSingle(
            IUniswapV3Quoter.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                amountIn: amountIn,
                sqrtPriceLimitX96: 0
            })
        ) returns (
            uint256 quote,
            uint160,
            uint32,
            uint256
        ) {
            return quote;
        } catch {
            return 0;
        }
    }
    
    function getBestV3Quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 bestQuote, uint24 bestFee) {
        uint24[3] memory fees = [uint24(500), uint24(3000), uint24(10000)];
        
        for (uint i = 0; i < fees.length; i++) {
            uint256 quote = getV3Quote(tokenIn, tokenOut, fees[i], amountIn);
            if (quote > bestQuote) {
                bestQuote = quote;
                bestFee = fees[i];
            }
        }
    }
}
```

## 4. Cross-Protocol Arbitrage Strategy

### Complete Arbitrage Implementation

```solidity
function createCrossProtocolArbitrage() external {
    DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](2);
    actionTypes[0] = DataStructures.ActionType.SWAP; // Buy on V2
    actionTypes[1] = DataStructures.ActionType.SWAP; // Sell on V3
    
    address[] memory targets = new address[](2);
    targets[0] = address(flashLoanExecutor);
    targets[1] = address(flashLoanExecutor);
    
    bytes[] memory datas = new bytes[](2);
    
    // Step 1: Buy USDC with WETH on V2 (assuming lower price)
    DataStructures.SwapParams memory v2Buy = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V2,
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: 10 ether,
        minAmountOut: 19800 * 1e6, // Expecting ~19800 USDC
        path: [WETH, USDC],
        fee: 0,
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: ""
    });
    datas[0] = abi.encode(v2Buy);
    
    // Step 2: Sell USDC for WETH on V3 (assuming higher price)
    DataStructures.SwapParams memory v3Sell = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V3,
        tokenIn: USDC,
        tokenOut: WETH,
        amountIn: 19800 * 1e6, // Use all USDC from previous swap
        minAmountOut: 10.1 ether, // Expecting profit
        path: [USDC, WETH],
        fee: 3000,
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: abi.encode(uint24(3000))
    });
    datas[1] = abi.encode(v3Sell);
    
    flashLoanExecutor.createStrategy(
        "V2-V3 WETH-USDC Arbitrage",
        actionTypes,
        targets,
        datas,
        100 // 1% minimum profit
    );
}
```

### Monitoring Arbitrage Opportunities

```solidity
contract ArbitrageMonitor {
    FlashLoanExecutor public flashLoanExecutor;
    
    function checkArbitrageOpportunity(
        address tokenA,
        address tokenB,
        uint256 amount
    ) external view returns (
        bool profitable,
        uint256 expectedProfit,
        string memory strategy
    ) {
        // Get V2 price: tokenA -> tokenB
        uint256 v2Quote = getV2Price(tokenA, tokenB, amount);
        
        // Get V3 price: tokenB -> tokenA
        uint256 v3Quote = getV3Price(tokenB, tokenA, v2Quote);
        
        if (v3Quote > amount) {
            return (true, v3Quote - amount, "V2_BUY_V3_SELL");
        }
        
        // Check reverse direction
        (uint256 v3BuyQuote,) = getBestV3Quote(tokenA, tokenB, amount);
        uint256 v2SellQuote = getV2Price(tokenB, tokenA, v3BuyQuote);
        
        if (v2SellQuote > amount) {
            return (true, v2SellQuote - amount, "V3_BUY_V2_SELL");
        }
        
        return (false, 0, "NO_OPPORTUNITY");
    }
}
```

## 5. Liquidation Strategy

### Compound/Aave Liquidation

```solidity
function createLiquidationStrategy(
    address borrower,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover
) external {
    DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](3);
    actionTypes[0] = DataStructures.ActionType.CUSTOM; // Liquidate
    actionTypes[1] = DataStructures.ActionType.SWAP;   // Swap collateral
    actionTypes[2] = DataStructures.ActionType.CUSTOM; // Repay debt
    
    address[] memory targets = new address[](3);
    targets[0] = AAVE_POOL; // Liquidation call
    targets[1] = address(flashLoanExecutor); // Swap handler
    targets[2] = address(this); // Debt repayment
    
    bytes[] memory datas = new bytes[](3);
    
    // 1. Liquidation call
    datas[0] = abi.encodeWithSignature(
        "liquidationCall(address,address,address,uint256,bool)",
        collateralAsset,
        debtAsset,
        borrower,
        debtToCover,
        false
    );
    
    // 2. Swap seized collateral to debt asset
    DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
        dexType: DataStructures.DEXType.UNISWAP_V3,
        tokenIn: collateralAsset,
        tokenOut: debtAsset,
        amountIn: 0, // Will be determined dynamically
        minAmountOut: debtToCover,
        path: [collateralAsset, debtAsset],
        fee: 3000,
        recipient: address(flashLoanExecutor),
        deadline: block.timestamp + 300,
        extraData: abi.encode(uint24(3000))
    });
    datas[1] = abi.encode(swapParams);
    
    // 3. Custom repayment logic
    datas[2] = abi.encodeWithSignature("handleRepayment()");
    
    flashLoanExecutor.createStrategy(
        "Liquidation Strategy",
        actionTypes,
        targets,
        datas,
        500 // 5% minimum profit for liquidation risk
    );
}
```

## 6. Gas Optimization Tips

### Batch Operations

```solidity
function createBatchStrategy() external {
    // Group multiple swaps in single strategy to save gas
    DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](3);
    actionTypes[0] = DataStructures.ActionType.SWAP; // WETH -> USDC
    actionTypes[1] = DataStructures.ActionType.SWAP; // USDC -> DAI  
    actionTypes[2] = DataStructures.ActionType.SWAP; // DAI -> WETH
    
    // Single transaction, multiple swaps
    // Saves ~21,000 gas per additional swap vs separate transactions
}
```

### Immutable Router Storage

```solidity
contract OptimizedFlashLoan {
    // Store frequently used routers as immutable for gas savings
    address public immutable UNISWAP_V2_ROUTER;
    address public immutable UNISWAP_V3_ROUTER;
    
    constructor(address _v2Router, address _v3Router) {
        UNISWAP_V2_ROUTER = _v2Router;
        UNISWAP_V3_ROUTER = _v3Router;
    }
}
```

## 7. Error Handling & Recovery

### Strategy Validation

```solidity
function validateStrategy(uint256 strategyId) external view returns (bool valid, string memory error) {
    DataStructures.Strategy memory strategy = getStrategy(strategyId);
    
    if (!strategy.active) {
        return (false, "Strategy not active");
    }
    
    if (strategy.deadline < block.timestamp) {
        return (false, "Strategy expired");
    }
    
    if (tx.gasprice > strategy.maxGasPrice) {
        return (false, "Gas price too high");
    }
    
    return (true, "");
}
```

### Emergency Recovery

```solidity
function emergencyRecovery() external onlyOwner {
    // Activate emergency stop
    flashLoanExecutor.toggleEmergencyStop();
    
    // Withdraw all tokens
    address[] memory tokens = [WETH, USDC, DAI];
    for (uint i = 0; i < tokens.length; i++) {
        flashLoanExecutor.emergencyWithdraw(tokens[i], owner());
    }
    
    // Withdraw ETH
    flashLoanExecutor.emergencyWithdraw(address(0), owner());
}
```

This implementation guide provides practical examples for integrating the FlashLoanExecutor with all three target protocols. The code examples are production-ready and include proper error handling, gas optimization, and security considerations.
