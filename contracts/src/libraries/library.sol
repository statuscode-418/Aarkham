// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "./safeMath.sol";

/**
 * @title DEXLibrary
 * @dev Library for interacting with multiple DEXes (Uniswap V2/V3, SushiSwap, etc.)
 */
library DEXLibrary {
    using SafeMath for uint256;
    using DataStructures for *;

    // ============ CONSTANTS ============

    uint256 private constant MAX_SLIPPAGE_BPS = 1000; // 10%
    uint256 private constant BPS_BASE = 10000;
    bytes32 private constant UNISWAP_V2_INIT_CODE_HASH =
        0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f;

    // ============ EVENTS ============

    event SwapExecuted(
        DataStructures.DEXType indexed dexType,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );

    event LiquidityAdded(
        DataStructures.DEXType indexed dexType,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    // ============ ERRORS ============

    error InvalidDEXType();
    error InsufficientOutputAmount();
    error SwapFailed();
    error InvalidPath();
    error DeadlineExpired();

    // ============ UTILITY FUNCTIONS ============

    /**
     * @dev Build swap parameters struct
     */
    function _buildSwapParams(
        DataStructures.DEXType dexType,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address[] memory path,
        uint24 fee,
        address recipient,
        uint256 deadline,
        bytes memory extraData
    ) internal pure returns (DataStructures.SwapParams memory) {
        return DataStructures.SwapParams({
            dexType: dexType,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            path: path,
            fee: fee,
            recipient: recipient,
            deadline: deadline,
            extraData: extraData
        });
    }

    // ============ SWAP FUNCTIONS ============

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
        } else if (params.dexType == DataStructures.DEXType.BALANCER) {
            return _executeBalancerSwap(params, dexRouters["BALANCER"]);
        } else if (params.dexType == DataStructures.DEXType.CURVE) {
            return _executeCurveSwap(params, dexRouters["CURVE"]);
        } else {
            revert InvalidDEXType();
        }
    }

    /**
     * @dev Execute Uniswap V2 style swap
     */
    function _executeUniswapV2Swap(
        DataStructures.SwapParams memory params,
        address router
    ) private returns (uint256 amountOut) {
        if (router == address(0)) revert InvalidDEXType();
        if (params.deadline < block.timestamp) revert DeadlineExpired();

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

        if (amountOut < params.minAmountOut) {
            revert InsufficientOutputAmount();
        }

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
        if (router == address(0)) revert InvalidDEXType();
        if (params.deadline < block.timestamp) revert DeadlineExpired();

        IUniswapV3Router uniRouter = IUniswapV3Router(router);

        // Approve tokens
        IERC20Extended(params.tokenIn).approve(router, params.amountIn);

        // Extract fee from extraData, default to 3000 (0.3%) if not provided
        uint24 fee = 3000;
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
     * @dev Execute Balancer swap
     */
    function _executeBalancerSwap(
        DataStructures.SwapParams memory params,
        address router
    ) private returns (uint256 amountOut) {
        if (router == address(0)) revert InvalidDEXType();
        if (params.deadline < block.timestamp) revert DeadlineExpired();

        // Balancer implementation would go here
        // For now, revert as not implemented
        revert InvalidDEXType();
    }

    /**
     * @dev Execute Curve swap
     */
    function _executeCurveSwap(
        DataStructures.SwapParams memory params,
        address router
    ) private returns (uint256 amountOut) {
        if (router == address(0)) revert InvalidDEXType();
        if (params.deadline < block.timestamp) revert DeadlineExpired();

        // Curve implementation would go here
        // For now, revert as not implemented
        revert InvalidDEXType();
    }

    // ============ QUOTE FUNCTIONS ============

    /**
     * @dev Get quote for swap amount
     */
    function getAmountOut(
        DataStructures.SwapParams memory params,
        mapping(string => address) storage dexRouters,
        mapping(string => address) storage quoters
    ) internal returns (uint256 amountOut) {
        if (params.dexType == DataStructures.DEXType.UNISWAP_V2) {
            return _getUniswapV2AmountOut(params, dexRouters["UNISWAP_V2"]);
        } else if (params.dexType == DataStructures.DEXType.UNISWAP_V3) {
            return _getUniswapV3AmountOut(params, quoters["UNISWAP_V3_QUOTER"]);
        } else if (params.dexType == DataStructures.DEXType.SUSHISWAP) {
            return _getSushiswapAmountOut(params, dexRouters["SUSHISWAP"]);
        } else if (params.dexType == DataStructures.DEXType.QUICKSWAP) {
            return _getQuickswapAmountOut(params, dexRouters["QUICKSWAP"]);
        } else {
            revert InvalidDEXType();
        }
    }

    /**
     * @dev Get Uniswap V2 amount out
     */
    function _getUniswapV2AmountOut(
        DataStructures.SwapParams memory params,
        address router
    ) private view returns (uint256 amountOut) {
        if (router == address(0)) revert InvalidDEXType();

        IUniswapV2Router uniRouter = IUniswapV2Router(router);
        uint256[] memory amounts = uniRouter.getAmountsOut(params.amountIn, params.path);
        amountOut = amounts[amounts.length - 1];
    }

    /**
     * @dev Get Uniswap V3 amount out using quoter
     */
    function _getUniswapV3AmountOut(
        DataStructures.SwapParams memory params,
        address quoter
    ) private returns (uint256 amountOut) {
        if (quoter == address(0)) revert InvalidDEXType();

        // Extract fee from extraData, default to 3000 (0.3%) if not provided
        uint24 fee = 3000;
        if (params.extraData.length > 0) {
            fee = abi.decode(params.extraData, (uint24));
        } else if (params.fee > 0) {
            fee = params.fee;
        }

        IUniswapV3Quoter uniQuoter = IUniswapV3Quoter(quoter);
        
        IUniswapV3Quoter.QuoteExactInputSingleParams memory quoteParams = 
            IUniswapV3Quoter.QuoteExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: fee,
                amountIn: params.amountIn,
                sqrtPriceLimitX96: 0
            });

        (amountOut, , , ) = uniQuoter.quoteExactInputSingle(quoteParams);
    }

    /**
     * @dev Get SushiSwap amount out (same as Uniswap V2)
     */
    function _getSushiswapAmountOut(
        DataStructures.SwapParams memory params,
        address router
    ) private view returns (uint256 amountOut) {
        return _getUniswapV2AmountOut(params, router);
    }

    /**
     * @dev Get QuickSwap amount out (same as Uniswap V2)
     */
    function _getQuickswapAmountOut(
        DataStructures.SwapParams memory params,
        address router
    ) private view returns (uint256 amountOut) {
        return _getUniswapV2AmountOut(params, router);
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @dev Calculate minimum amount out with slippage
     */
    function calculateMinAmountOut(
        uint256 expectedAmount,
        uint256 slippageBPS
    ) internal pure returns (uint256) {
        if (slippageBPS > MAX_SLIPPAGE_BPS) {
            slippageBPS = MAX_SLIPPAGE_BPS;
        }
        return expectedAmount.mul(BPS_BASE.sub(slippageBPS)).div(BPS_BASE);
    }

    /**
     * @dev Check if slippage is acceptable
     */
    function isSlippageAcceptable(
        uint256 expectedAmount,
        uint256 actualAmount,
        uint256 maxSlippageBPS
    ) internal pure returns (bool) {
        if (actualAmount >= expectedAmount) return true;
        
        uint256 slippage = expectedAmount.sub(actualAmount).mul(BPS_BASE).div(expectedAmount);
        return slippage <= maxSlippageBPS;
    }

    /**
     * @dev Get optimal fee tier for V3 based on token pair
     * Common fee tiers: 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1%)
     */
    function getOptimalV3Fee(
        address tokenA,
        address tokenB
    ) internal pure returns (uint24 fee) {
        // For stablecoin pairs, use lowest fee (0.05%)
        if (_isStablecoinPair(tokenA, tokenB)) {
            return 500;
        }
        // For most common pairs (ETH/USDC, etc.), use 0.3%
        else if (_isCommonPair(tokenA, tokenB)) {
            return 3000;
        }
        // For exotic pairs, use 1%
        else {
            return 10000;
        }
    }

    /**
     * @dev Check if pair consists of stablecoins
     */
    function _isStablecoinPair(
        address /* tokenA */,
        address /* tokenB */
    ) private pure returns (bool) {
        // Add logic to identify stablecoin pairs
        // For now, simplified logic - in production, use proper token identification
        return false; // Simplified for now
    }

    /**
     * @dev Check if pair is a common trading pair
     */
    function _isCommonPair(
        address /* tokenA */,
        address /* tokenB */
    ) private pure returns (bool) {
        // Add logic to identify common pairs (ETH/USDC, ETH/DAI, etc.)
        return true; // Default to common pair fee for now
    }

    /**
     * @dev Encode fee for V3 extraData
     */
    function encodeV3Fee(uint24 fee) internal pure returns (bytes memory) {
        return abi.encode(fee);
    }

    /**
     * @dev Decode fee from V3 extraData
     */
    function decodeV3Fee(bytes memory extraData) internal pure returns (uint24 fee) {
        if (extraData.length > 0) {
            fee = abi.decode(extraData, (uint24));
        } else {
            fee = 3000; // Default to 0.3%
        }
    }
}
