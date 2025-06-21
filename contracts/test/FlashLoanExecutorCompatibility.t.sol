// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/FlashLoanExecutor.sol";
import "../src/interfaces/Interfaces.sol";
import "../src/storage/DataStructures.sol";

/**
 * @title FlashLoanExecutorCompatibility.t.sol
 * @dev Compatibility tests for Aave V3, Uniswap V2, and Uniswap V3 integration
 */
contract FlashLoanExecutorCompatibilityTest is Test {
    FlashLoanExecutor public flashLoanExecutor;
    
    // Mock contracts for testing
    MockAavePool public mockAavePool;
    MockERC20 public mockWETH;
    MockERC20 public mockUSDC;
    MockERC20 public mockDAI;
    MockUniswapV2Router public mockV2Router;
    MockUniswapV3Router public mockV3Router;
    MockUniswapV3Quoter public mockV3Quoter;
    MockAddressProvider public mockAddressProvider;
    
    // Test addresses
    address public constant OWNER = address(0x1);
    address public constant USER = address(0x2);
    address public constant LIQUIDATOR = address(0x3);
    
    // Test amounts
    uint256 public constant FLASH_LOAN_AMOUNT = 10 ether;
    uint256 public constant SWAP_AMOUNT_IN = 1 ether;
    uint256 public constant EXPECTED_USDC_OUT = 2000 * 1e6; // 2000 USDC
    uint256 public constant FLASH_LOAN_PREMIUM = 0.0009 ether; // 0.09% premium
    
    event FlashLoanInitiated(address indexed initiator, uint256 indexed strategyId);
    event StrategyExecuted(uint256 indexed strategyId, address indexed executor, uint256 profit);
    event StrategyCreated(uint256 indexed strategyId, address indexed creator);
    
    function setUp() public {
        vm.startPrank(OWNER);
        
        // Deploy mock contracts
        mockWETH = new MockERC20("Wrapped Ether", "WETH", 18);
        mockUSDC = new MockERC20("USD Coin", "USDC", 6);
        mockDAI = new MockERC20("Dai Stablecoin", "DAI", 18);
        
        mockAavePool = new MockAavePool();
        mockAddressProvider = new MockAddressProvider(address(mockAavePool));
        mockV2Router = new MockUniswapV2Router(address(mockWETH));
        mockV3Router = new MockUniswapV3Router();
        mockV3Quoter = new MockUniswapV3Quoter();
        
        // Deploy FlashLoanExecutor
        flashLoanExecutor = new FlashLoanExecutor(
            address(mockAddressProvider),
            address(mockWETH)
        );
        
        // Setup DEX routers
        flashLoanExecutor.setDEXRouter("UNISWAP_V2", address(mockV2Router));
        flashLoanExecutor.setDEXRouter("UNISWAP_V3", address(mockV3Router));
        
        // Authorize test users
        flashLoanExecutor.setAuthorizedExecutor(USER, true);
        flashLoanExecutor.setAuthorizedExecutor(LIQUIDATOR, true);
        
        // Setup initial balances
        mockWETH.mint(address(flashLoanExecutor), 100 ether);
        mockUSDC.mint(address(flashLoanExecutor), 100000 * 1e6);
        mockDAI.mint(address(flashLoanExecutor), 100000 ether);
        
        // Setup mock router balances
        mockWETH.mint(address(mockV2Router), 1000 ether);
        mockUSDC.mint(address(mockV2Router), 1000000 * 1e6);
        mockWETH.mint(address(mockV3Router), 1000 ether);
        mockUSDC.mint(address(mockV3Router), 1000000 * 1e6);
        
        vm.stopPrank();
    }
    
    // ============ AAVE V3 COMPATIBILITY TESTS ============
    
    function testAaveV3FlashLoanIntegration() public {
        vm.startPrank(OWNER);
        
        // Create simple strategy
        uint256 strategyId = _createSimpleSwapStrategy();
        
        // Prepare flash loan parameters
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = FLASH_LOAN_AMOUNT;
        
        // Setup mock Aave pool to call back
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        // Execute flash loan
        vm.expectEmit(true, true, false, true);
        emit FlashLoanInitiated(OWNER, strategyId);
        
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        // Verify strategy was executed
        (,,,, uint256 executionCount,) = flashLoanExecutor.getStrategy(strategyId);
        assertEq(executionCount, 1, "Strategy should be executed once");
        
        vm.stopPrank();
    }
    
    function testAaveV3CallbackValidation() public {
        vm.startPrank(OWNER);
        
        uint256 strategyId = _createSimpleSwapStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = FLASH_LOAN_AMOUNT;
        uint256[] memory premiums = _calculatePremiums(amounts);
        
        // Test invalid caller
        vm.expectRevert("Caller is not Aave V3 Pool");
        flashLoanExecutor.executeOperation(
            assets,
            amounts,
            premiums,
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        vm.stopPrank();
        
        // Test invalid initiator
        vm.startPrank(address(mockAavePool));
        vm.expectRevert("Initiator is not this contract");
        flashLoanExecutor.executeOperation(
            assets,
            amounts,
            premiums,
            address(0x999), // Invalid initiator
            abi.encode(strategyId, OWNER)
        );
        
        vm.stopPrank();
    }
    
    function testAaveV3PremiumCalculation() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 ether;
        amounts[1] = 50 ether;
        
        uint256[] memory premiums = _calculatePremiums(amounts);
        
        // Aave V3 premium is 0.09%
        assertEq(premiums[0], 90000000000000000, "Premium should be 0.09% of 100 ETH");
        assertEq(premiums[1], 45000000000000000, "Premium should be 0.09% of 50 ETH");
    }
    
    // ============ UNISWAP V2 COMPATIBILITY TESTS ============
    
    function testUniswapV2SingleSwap() public {
        vm.startPrank(OWNER);
        
        uint256 strategyId = _createV2SwapStrategy();
        
        // Execute strategy with flash loan
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = SWAP_AMOUNT_IN;
        
        // Setup mock callback
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        uint256 balanceBefore = mockUSDC.balanceOf(address(flashLoanExecutor));
        
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        uint256 balanceAfter = mockUSDC.balanceOf(address(flashLoanExecutor));
        
        // Should have received USDC from swap
        assertGt(balanceAfter, balanceBefore, "Should receive USDC from V2 swap");
        
        vm.stopPrank();
    }
    
    function testUniswapV2MultiHopSwap() public {
        vm.startPrank(OWNER);
        
        uint256 strategyId = _createV2MultiHopStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = SWAP_AMOUNT_IN;
        
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        uint256 balanceBefore = mockDAI.balanceOf(address(flashLoanExecutor));
        
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        uint256 balanceAfter = mockDAI.balanceOf(address(flashLoanExecutor));
        
        assertGt(balanceAfter, balanceBefore, "Should receive DAI from multi-hop V2 swap");
        
        vm.stopPrank();
    }
    
    function testUniswapV2SlippageProtection() public {
        vm.startPrank(OWNER);
        
        // Create strategy with high slippage requirement
        uint256 strategyId = _createV2HighSlippageStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = SWAP_AMOUNT_IN;
        
        // Setup mock to return insufficient output
        mockV2Router.setInsufficientOutput(true);
        
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        // Should revert due to slippage
        vm.expectRevert();
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        vm.stopPrank();
    }
    
    // ============ UNISWAP V3 COMPATIBILITY TESTS ============
    
    function testUniswapV3SingleSwap() public {
        vm.startPrank(OWNER);
        
        uint256 strategyId = _createV3SwapStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = SWAP_AMOUNT_IN;
        
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        uint256 balanceBefore = mockUSDC.balanceOf(address(flashLoanExecutor));
        
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        uint256 balanceAfter = mockUSDC.balanceOf(address(flashLoanExecutor));
        
        assertGt(balanceAfter, balanceBefore, "Should receive USDC from V3 swap");
        
        vm.stopPrank();
    }
    
    function testUniswapV3FeeTiers() public {
        vm.startPrank(OWNER);
        
        // Test different fee tiers
        uint24[3] memory feeTiers = [uint24(500), uint24(3000), uint24(10000)];
        
        for (uint i = 0; i < feeTiers.length; i++) {
            uint256 strategyId = _createV3StrategyWithFee(feeTiers[i]);
            
            address[] memory assets = new address[](1);
            assets[0] = address(mockWETH);
            uint256[] memory amounts = new uint256[](1);
            amounts[0] = SWAP_AMOUNT_IN;
            
            mockAavePool.setFlashLoanCallback(
                address(flashLoanExecutor),
                assets,
                amounts,
                _calculatePremiums(amounts),
                address(flashLoanExecutor),
                abi.encode(strategyId, OWNER)
            );
            
            // Should execute successfully with any fee tier
            flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
            
            (,,,, uint256 executionCount,) = flashLoanExecutor.getStrategy(strategyId);
            assertEq(executionCount, 1, "Strategy should execute with any fee tier");
        }
        
        vm.stopPrank();
    }
    
    function testUniswapV3OptimalFeeSelection() public {
        // Test automatic fee tier selection
        vm.startPrank(OWNER);
        
        uint256 strategyId = _createV3OptimalFeeStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = SWAP_AMOUNT_IN;
        
        // Setup different quotes for different fee tiers
        mockV3Quoter.setQuote(address(mockWETH), address(mockUSDC), 500, 1900 * 1e6);
        mockV3Quoter.setQuote(address(mockWETH), address(mockUSDC), 3000, 2000 * 1e6); // Best
        mockV3Quoter.setQuote(address(mockWETH), address(mockUSDC), 10000, 1950 * 1e6);
        
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        // Should select the 3000 fee tier (best quote)
        (,,,, uint256 executionCount,) = flashLoanExecutor.getStrategy(strategyId);
        assertEq(executionCount, 1, "Should execute with optimal fee tier");
        
        vm.stopPrank();
    }
    
    // ============ CROSS-PROTOCOL ARBITRAGE TESTS ============
    
    function testV2V3ArbitrageStrategy() public {
        vm.startPrank(OWNER);
        
        uint256 strategyId = _createCrossProtocolArbitrageStrategy();
        
        // Setup price difference: V2 cheaper, V3 more expensive
        mockV2Router.setSwapRate(address(mockWETH), address(mockUSDC), 1900 * 1e6); // Cheaper on V2
        mockV3Router.setSwapRate(address(mockUSDC), address(mockWETH), 2.1 ether); // More expensive on V3
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = SWAP_AMOUNT_IN;
        
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, OWNER)
        );
        
        uint256 balanceBefore = mockWETH.balanceOf(address(flashLoanExecutor));
        
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        uint256 balanceAfter = mockWETH.balanceOf(address(flashLoanExecutor));
        
        // Should have profit from arbitrage
        assertGt(balanceAfter, balanceBefore, "Should profit from cross-protocol arbitrage");
        
        vm.stopPrank();
    }
    
    // ============ LIQUIDATION STRATEGY TESTS ============
    
    function testLiquidationStrategy() public {
        vm.startPrank(LIQUIDATOR);
        
        uint256 strategyId = _createLiquidationStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockUSDC);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10000 * 1e6; // 10k USDC for liquidation
        
        mockAavePool.setFlashLoanCallback(
            address(flashLoanExecutor),
            assets,
            amounts,
            _calculatePremiums(amounts),
            address(flashLoanExecutor),
            abi.encode(strategyId, LIQUIDATOR)
        );
        
        // Should execute liquidation strategy
        flashLoanExecutor.executeStrategy(strategyId, assets, amounts);
        
        (,,,, uint256 executionCount,) = flashLoanExecutor.getStrategy(strategyId);
        assertEq(executionCount, 1, "Liquidation strategy should execute");
        
        vm.stopPrank();
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _createSimpleSwapStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(flashLoanExecutor);
        
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V2,
            tokenIn: address(mockWETH),
            tokenOut: address(mockUSDC),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: EXPECTED_USDC_OUT,
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: 0,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: ""
        });
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            "Simple Swap",
            actionTypes,
            targets,
            datas,
            100 // 1% min profit
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createV2SwapStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(flashLoanExecutor);
        
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V2,
            tokenIn: address(mockWETH),
            tokenOut: address(mockUSDC),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: 1900 * 1e6,
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: 0,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: ""
        });
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            "V2 Swap",
            actionTypes,
            targets,
            datas,
            50
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createV2MultiHopStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(flashLoanExecutor);
        
        address[] memory path = new address[](3);
        path[0] = address(mockWETH);
        path[1] = address(mockUSDC);
        path[2] = address(mockDAI);
        
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V2,
            tokenIn: address(mockWETH),
            tokenOut: address(mockDAI),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: 1800 ether, // Expecting ~1800 DAI
            path: path,
            fee: 0,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: ""
        });
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            "V2 Multi-hop",
            actionTypes,
            targets,
            datas,
            50
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createV2HighSlippageStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(flashLoanExecutor);
        
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V2,
            tokenIn: address(mockWETH),
            tokenOut: address(mockUSDC),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: 2500 * 1e6, // Unrealistically high expectation
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: 0,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: ""
        });
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            "V2 High Slippage",
            actionTypes,
            targets,
            datas,
            50
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createV3SwapStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(flashLoanExecutor);
        
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V3,
            tokenIn: address(mockWETH),
            tokenOut: address(mockUSDC),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: 1950 * 1e6,
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: 3000, // 0.3% fee tier
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: abi.encode(uint24(3000))
        });
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            "V3 Swap",
            actionTypes,
            targets,
            datas,
            50
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createV3StrategyWithFee(uint24 fee) internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(flashLoanExecutor);
        
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V3,
            tokenIn: address(mockWETH),
            tokenOut: address(mockUSDC),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: 1900 * 1e6,
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: fee,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: abi.encode(fee)
        });
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            string(abi.encodePacked("V3 Fee ", _uint24ToString(fee))),
            actionTypes,
            targets,
            datas,
            50
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createV3OptimalFeeStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(flashLoanExecutor);
        
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V3,
            tokenIn: address(mockWETH),
            tokenOut: address(mockUSDC),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: 1900 * 1e6,
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: 0, // Auto-select optimal fee
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: "" // Empty for auto-selection
        });
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            "V3 Optimal Fee",
            actionTypes,
            targets,
            datas,
            50
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createCrossProtocolArbitrageStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](2);
        actionTypes[0] = DataStructures.ActionType.SWAP; // Buy on V2
        actionTypes[1] = DataStructures.ActionType.SWAP; // Sell on V3
        
        address[] memory targets = new address[](2);
        targets[0] = address(flashLoanExecutor);
        targets[1] = address(flashLoanExecutor);
        
        bytes[] memory datas = new bytes[](2);
        
        // Buy USDC on V2
        DataStructures.SwapParams memory v2Buy = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V2,
            tokenIn: address(mockWETH),
            tokenOut: address(mockUSDC),
            amountIn: SWAP_AMOUNT_IN,
            minAmountOut: 1900 * 1e6,
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: 0,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: ""
        });
        datas[0] = abi.encode(v2Buy);
        
        // Sell USDC on V3
        DataStructures.SwapParams memory v3Sell = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V3,
            tokenIn: address(mockUSDC),
            tokenOut: address(mockWETH),
            amountIn: 1900 * 1e6,
            minAmountOut: 1.05 ether, // Profit target
            path: _createPath(address(mockUSDC), address(mockWETH)),
            fee: 3000,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: abi.encode(uint24(3000))
        });
        datas[1] = abi.encode(v3Sell);
        
        flashLoanExecutor.createStrategy(
            "Cross-Protocol Arbitrage",
            actionTypes,
            targets,
            datas,
            100 // 1% min profit
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createLiquidationStrategy() internal returns (uint256 strategyId) {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](2);
        actionTypes[0] = DataStructures.ActionType.CUSTOM; // Liquidation
        actionTypes[1] = DataStructures.ActionType.SWAP;   // Swap collateral
        
        address[] memory targets = new address[](2);
        targets[0] = address(mockAavePool); // Mock liquidation
        targets[1] = address(flashLoanExecutor); // Swap handler
        
        bytes[] memory datas = new bytes[](2);
        
        // Mock liquidation call
        datas[0] = abi.encodeWithSignature("mockLiquidation()");
        
        // Swap seized collateral
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V3,
            tokenIn: address(mockWETH), // Seized collateral
            tokenOut: address(mockUSDC), // Debt asset
            amountIn: 5 ether,
            minAmountOut: 9500 * 1e6,
            path: _createPath(address(mockWETH), address(mockUSDC)),
            fee: 3000,
            recipient: address(flashLoanExecutor),
            deadline: block.timestamp + 300,
            extraData: abi.encode(uint24(3000))
        });
        datas[1] = abi.encode(swapParams);
        
        flashLoanExecutor.createStrategy(
            "Liquidation Strategy",
            actionTypes,
            targets,
            datas,
            500 // 5% min profit for liquidation
        );
        
        return flashLoanExecutor.nextStrategyId() - 1;
    }
    
    function _createPath(address tokenA, address tokenB) internal pure returns (address[] memory path) {
        path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;
    }
    
    function _calculatePremiums(uint256[] memory amounts) internal pure returns (uint256[] memory premiums) {
        premiums = new uint256[](amounts.length);
        for (uint i = 0; i < amounts.length; i++) {
            premiums[i] = amounts[i] * 9 / 10000; // 0.09% premium
        }
    }
    
    function _uint24ToString(uint24 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint24 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}

// ============ MOCK CONTRACTS ============

contract MockAddressProvider {
    address public pool;
    
    constructor(address _pool) {
        pool = _pool;
    }
    
    function getPool() external view returns (address) {
        return pool;
    }
}

contract MockAavePool {
    struct FlashLoanData {
        address receiver;
        address[] assets;
        uint256[] amounts;
        uint256[] premiums;
        address initiator;
        bytes params;
    }
    
    FlashLoanData private flashLoanData;
    bool private shouldCallback;
    
    function setFlashLoanCallback(
        address receiver,
        address[] memory assets,
        uint256[] memory amounts,
        uint256[] memory premiums,
        address initiator,
        bytes memory params
    ) external {
        flashLoanData = FlashLoanData(receiver, assets, amounts, premiums, initiator, params);
        shouldCallback = true;
    }
    
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata, // modes
        address, // onBehalfOf
        bytes calldata params,
        uint16 // referralCode
    ) external {
        if (shouldCallback) {
            // Transfer tokens to receiver
            for (uint i = 0; i < assets.length; i++) {
                MockERC20(assets[i]).transfer(receiverAddress, amounts[i]);
            }
            
            // Call receiver
            IFlashLoanReceiver(receiverAddress).executeOperation(
                flashLoanData.assets,
                flashLoanData.amounts,
                flashLoanData.premiums,
                flashLoanData.initiator,
                params
            );
            
            shouldCallback = false;
        }
    }
    
    function mockLiquidation() external pure {
        // Mock liquidation function
    }
}

contract MockERC20 is IERC20Extended {
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
    }
    
    function name() external view override returns (string memory) { return _name; }
    function symbol() external view override returns (string memory) { return _symbol; }
    function decimals() external view override returns (uint8) { return _decimals; }
    function totalSupply() external view override returns (uint256) { return _totalSupply; }
    
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "Transfer amount exceeds allowance");
        
        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);
        
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0) && to != address(0), "Invalid address");
        require(_balances[from] >= amount, "Insufficient balance");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0) && spender != address(0), "Invalid address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}

contract MockUniswapV2Router {
    address public immutable WETH;
    bool private insufficientOutput;
    mapping(address => mapping(address => uint256)) private swapRates;
    
    constructor(address _weth) {
        WETH = _weth;
    }
    
    function setInsufficientOutput(bool _insufficient) external {
        insufficientOutput = _insufficient;
    }
    
    function setSwapRate(address tokenIn, address tokenOut, uint256 rate) external {
        swapRates[tokenIn][tokenOut] = rate;
    }
    
    function factory() external pure returns (address) { return address(0); }
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts)
    {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        
        for (uint i = 0; i < path.length - 1; i++) {
            if (swapRates[path[i]][path[i + 1]] > 0) {
                amounts[i + 1] = swapRates[path[i]][path[i + 1]];
            } else {
                // Default rate: 1 WETH = 2000 USDC, 1 USDC = 1 DAI
                if (path[i] == WETH) {
                    amounts[i + 1] = amountIn * 2000; // Adjust for decimals in real implementation
                } else {
                    amounts[i + 1] = amountIn; // 1:1 for stablecoins
                }
            }
        }
    }
    
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(deadline >= block.timestamp, "Deadline expired");
        
        amounts = this.getAmountsOut(amountIn, path);
        uint256 amountOut = amounts[amounts.length - 1];
        
        if (insufficientOutput) {
            amountOut = amountOutMin - 1; // Force insufficient output
        }
        
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        // Transfer tokens
        MockERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(path[path.length - 1]).transfer(to, amountOut);
    }
}

contract MockUniswapV3Router {
    mapping(address => mapping(address => uint256)) private swapRates;
    
    function setSwapRate(address tokenIn, address tokenOut, uint256 rate) external {
        swapRates[tokenIn][tokenOut] = rate;
    }
    
    function exactInputSingle(IUniswapV3Router.ExactInputSingleParams calldata params)
        external returns (uint256 amountOut)
    {
        require(params.deadline >= block.timestamp, "Deadline expired");
        
        if (swapRates[params.tokenIn][params.tokenOut] > 0) {
            amountOut = swapRates[params.tokenIn][params.tokenOut];
        } else {
            // Default: slightly better rate than V2
            amountOut = params.amountIn * 2050 / 1000; // 2050 for WETH->USDC
        }
        
        require(amountOut >= params.amountOutMinimum, "Insufficient output");
        
        // Transfer tokens
        MockERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        MockERC20(params.tokenOut).transfer(params.recipient, amountOut);
    }
}

contract MockUniswapV3Quoter {
    mapping(address => mapping(address => mapping(uint24 => uint256))) private quotes;
    
    function setQuote(address tokenIn, address tokenOut, uint24 fee, uint256 quote) external {
        quotes[tokenIn][tokenOut][fee] = quote;
    }
    
    function quoteExactInputSingle(IUniswapV3Quoter.QuoteExactInputSingleParams memory params)
        external view returns (
            uint256 amountOut,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        )
    {
        amountOut = quotes[params.tokenIn][params.tokenOut][params.fee];
        if (amountOut == 0) {
            // Default quote based on fee tier
            if (params.fee == 500) {
                amountOut = params.amountIn * 2040; // Slightly lower for higher fee
            } else if (params.fee == 3000) {
                amountOut = params.amountIn * 2000; // Standard rate
            } else {
                amountOut = params.amountIn * 1980; // Lower for highest fee
            }
        }
        
        sqrtPriceX96After = 0;
        initializedTicksCrossed = 0;
        gasEstimate = 120000;
    }
}
