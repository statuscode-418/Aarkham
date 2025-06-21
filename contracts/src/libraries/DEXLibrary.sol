// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "./safeMath.sol";

/**
 * @title DEXLibrary
 * @dev Complete library for interacting with multiple DEXes with proper Uniswap V3 support
 */
library DEXLibrary {
    using SafeMath for uint256;

    // ============ CONSTANTS ============
    uint256 private constant MAX_SLIPPAGE_BPS = 1000; // 10%
    uint256 private constant BPS_BASE = 10000;
    
    // Uniswap V3 fee tiers
    uint24 public constant FEE_LOW = 500;      // 0.05%
    uint24 public constant FEE_MEDIUM = 3000;  // 0.3%
    uint24 public constant FEE_HIGH = 10000;   // 1%

    // Sepolia addresses
    address private constant UNISWAP_V3_QUOTER = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    address private constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // ============ EVENTS ============
    event SwapExecuted(
        DataStructures.DEXType indexed dexType,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );

    event V3FeeTierUsed(
        address indexed tokenIn,
        address indexed tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOut
    );

    // ============ ERRORS ============
    error InvalidDEXType();
    error InsufficientOutputAmount();
    error SwapFailed();
    error InvalidPath();
    error DeadlineExpired();
    error InvalidFee();

    // ============ ARBITRAGE UTILITIES ============

    /**
     * @dev Find best arbitrage opportunity across V2 and V3
     */
    function findBestArbitrageOpportunity(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        mapping(string => address) storage dexRouters
    ) internal returns (
        uint256 maxProfit,
        DataStructures.DEXType buyDex,
        DataStructures.DEXType sellDex,
        bytes memory buyExtraData,
        bytes memory sellExtraData
    ) {
        // Check V2 buy, V3 sell
        uint256 v2Quote = getAmountOutV2(dexRouters["UNISWAP_V2"], tokenA, tokenB, amountIn);
        (uint256 v3Quote, uint24 optimalFee) = getAmountOutV3Optimal(tokenB, tokenA, v2Quote);
        
        if (v3Quote > amountIn) {
            uint256 profit = v3Quote - amountIn;
            if (profit > maxProfit) {
                maxProfit = profit;
                buyDex = DataStructures.DEXType.UNISWAP_V2;
                sellDex = DataStructures.DEXType.UNISWAP_V3;
                buyExtraData = "";
                sellExtraData = abi.encode(optimalFee);
            }
        }

        // Check V3 buy, V2 sell
        (v3Quote, optimalFee) = getAmountOutV3Optimal(tokenA, tokenB, amountIn);
        v2Quote = getAmountOutV2(dexRouters["UNISWAP_V2"], tokenB, tokenA, v3Quote);
        
        if (v2Quote > amountIn) {
            uint256 profit = v2Quote - amountIn;
            if (profit > maxProfit) {
                maxProfit = profit;
                buyDex = DataStructures.DEXType.UNISWAP_V3;
                sellDex = DataStructures.DEXType.UNISWAP_V2;
                buyExtraData = abi.encode(optimalFee);
                sellExtraData = "";
            }
        }
    }

    /**
     * @dev Get amount out for V3 with optimal fee tier
     */
    function getAmountOutV3Optimal(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut, uint24 optimalFee) {
        uint24[3] memory feeTiers = [FEE_MEDIUM, FEE_LOW, FEE_HIGH];
        uint256 bestQuote = 0;
        uint24 bestFee = FEE_MEDIUM;

        for (uint i = 0; i < feeTiers.length; i++) {
            uint256 quote = _getV3Quote(tokenIn, tokenOut, feeTiers[i], amountIn);
            if (quote > bestQuote) {
                bestQuote = quote;
                bestFee = feeTiers[i];
            }
        }

        return (bestQuote, bestFee);
    }

    /**
     * @dev Get V3 quote for specific fee tier
     */
    function _getV3Quote(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn
    ) private returns (uint256 amountOut) {
        try IUniswapV3Quoter(UNISWAP_V3_QUOTER).quoteExactInputSingle(
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
            amountOut = quote;
        } catch {
            amountOut = 0;
        }
    }

    /**
     * @dev Get amount out for V2
     */
    function getAmountOutV2(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256 amountOut) {
        if (router == address(0)) return 0;

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        try IUniswapV2Router(router).getAmountsOut(amountIn, path)
        returns (uint256[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
        } catch {
            amountOut = 0;
        }
    }

    /**
     * @dev Build swap parameters for V3
     */
    function buildV3SwapParams(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee,
        address recipient,
        uint256 deadline
    ) internal pure returns (DataStructures.SwapParams memory) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        return DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V3,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            path: path,
            fee: fee,
            recipient: recipient,
            deadline: deadline,
            extraData: abi.encode(fee)
        });
    }

    /**
     * @dev Build swap parameters for V2
     */
    function buildV2SwapParams(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) internal pure returns (DataStructures.SwapParams memory) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        return DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V2,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            path: path,
            fee: 0,
            recipient: recipient,
            deadline: deadline,
            extraData: ""
        });
    }

    /**
     * @dev Calculate slippage tolerance
     */
    function applySlippageTolerance(
        uint256 amount,
        uint256 slippageBPS
    ) internal pure returns (uint256) {
        require(slippageBPS <= MAX_SLIPPAGE_BPS, "Slippage too high");
        return amount.mul(BPS_BASE.sub(slippageBPS)).div(BPS_BASE);
    }

    // ============ SWAP EXECUTION FUNCTIONS ============

    /**
     * @dev Execute swap based on DEX type
     */
    function executeSwap(
        DataStructures.SwapParams memory params,
        mapping(string => address) storage dexRouters
    ) internal returns (uint256 amountOut) {
        if (params.dexType == DataStructures.DEXType.UNISWAP_V2) {
            return _executeUniswapV2Swap(params, dexRouters["UNISWAP_V2"]);
        } else if (params.dexType == DataStructures.DEXType.UNISWAP_V3) {
            return _executeUniswapV3Swap(params, dexRouters["UNISWAP_V3"]);
        } else if (params.dexType == DataStructures.DEXType.SUSHISWAP) {
            return _executeSushiswapSwap(params, dexRouters["SUSHISWAP"]);
        } else if (params.dexType == DataStructures.DEXType.QUICKSWAP) {
            return _executeQuickswapSwap(params, dexRouters["QUICKSWAP"]);
        } else {
            revert("Invalid DEX type");
        }
    }

    /**
     * @dev Execute Uniswap V2 style swap
     */
    function _executeUniswapV2Swap(
        DataStructures.SwapParams memory params,
        address router
    ) private returns (uint256 amountOut) {
        require(router != address(0), "Invalid router");
        require(params.deadline >= block.timestamp, "Deadline expired");

        IUniswapV2Router uniRouter = IUniswapV2Router(router);

        // Approve tokens
        IERC20Extended(params.tokenIn).approve(router, params.amountIn);

        // Execute swap
        uint256[] memory amounts = uniRouter.swapExactTokensForTokens(
            params.amountIn,
            params.minAmountOut,
            params.path,
            params.recipient,
            params.deadline
        );

        amountOut = amounts[amounts.length - 1];
        require(amountOut >= params.minAmountOut, "Insufficient output amount");

        emit SwapExecuted(
            DataStructures.DEXType.UNISWAP_V2,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.recipient
        );
    }

    /**
     * @dev Execute Uniswap V3 swap
     */
    function _executeUniswapV3Swap(
        DataStructures.SwapParams memory params,
        address router
    ) private returns (uint256 amountOut) {
        require(router != address(0), "Invalid router");
        require(params.deadline >= block.timestamp, "Deadline expired");

        IUniswapV3Router uniRouter = IUniswapV3Router(router);

        // Approve tokens
        IERC20Extended(params.tokenIn).approve(router, params.amountIn);

        // Extract fee from extraData, default to 3000 (0.3%) if not provided
        uint24 fee = FEE_MEDIUM;
        if (params.extraData.length > 0) {
            fee = abi.decode(params.extraData, (uint24));
        } else if (params.fee > 0) {
            fee = params.fee;
        }

        // Prepare swap parameters
        IUniswapV3Router.ExactInputSingleParams
            memory swapParams = IUniswapV3Router.ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: fee,
                recipient: params.recipient,
                deadline: params.deadline,
                amountIn: params.amountIn,
                amountOutMinimum: params.minAmountOut,
                sqrtPriceLimitX96: 0
            });

        // Execute swap
        amountOut = uniRouter.exactInputSingle(swapParams);

        emit SwapExecuted(
            DataStructures.DEXType.UNISWAP_V3,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.recipient
        );
    }

    /**
     * @dev Execute SushiSwap swap (same as Uniswap V2)
     */
    function _executeSushiswapSwap(
        DataStructures.SwapParams memory params,
        address router
    ) private returns (uint256 amountOut) {
        return _executeUniswapV2Swap(params, router);
    }

    /**
     * @dev Execute QuickSwap swap (same as Uniswap V2)
     */
    function _executeQuickswapSwap(
        DataStructures.SwapParams memory params,
        address router
    ) private returns (uint256 amountOut) {
        return _executeUniswapV2Swap(params, router);
    }

    /**
     * @dev Validate swap parameters
     */
    function validateSwapParams(DataStructures.SwapParams memory params) internal view {
        require(params.tokenIn != address(0), "Invalid tokenIn");
        require(params.tokenOut != address(0), "Invalid tokenOut");
        require(params.amountIn > 0, "Invalid amountIn");
        require(params.deadline >= block.timestamp, "Deadline expired");
        require(params.path.length >= 2, "Invalid path");
        require(params.path[0] == params.tokenIn, "Path start mismatch");
        require(params.path[params.path.length - 1] == params.tokenOut, "Path end mismatch");
    }
}