// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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
) pure returns (DataStructures.SwapParams memory) {
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

        // Prepare swap parameters
        IUniswapV3Router.ExactInputSingleParams
            memory swapParams = IUniswapV3Router.ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
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
        address vault
    ) private returns (uint256 amountOut) {
        if (vault == address(0)) revert InvalidDEXType();

        IBalancerVault balancerVault = IBalancerVault(vault);

        // Decode pool ID from extraData
        bytes32 poolId = abi.decode(params.extraData, (bytes32));

        // Approve tokens
        IERC20Extended(params.tokenIn).approve(vault, params.amountIn);

        // Prepare swap parameters
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault
            .SingleSwap({
                poolId: poolId,
                kind: IBalancerVault.SwapKind.GIVEN_IN,
                assetIn: params.tokenIn,
                assetOut: params.tokenOut,
                amount: params.amountIn,
                userData: ""
            });

        IBalancerVault.FundManagement memory funds = IBalancerVault
            .FundManagement({
                sender: address(this),
                fromInternalBalance: false,
                recipient: payable(params.recipient),
                toInternalBalance: false
            });

        // Execute swap
        amountOut = balancerVault.swap(
            singleSwap,
            funds,
            params.minAmountOut,
            params.deadline
        );

        emit SwapExecuted(
            DataStructures.DEXType.BALANCER,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.recipient
        );
    }

    /**
     * @dev Execute Curve swap
     */
    function _executeCurveSwap(
        DataStructures.SwapParams memory params,
        address pool
    ) private returns (uint256 amountOut) {
        if (pool == address(0)) revert InvalidDEXType();

        ICurvePool curvePool = ICurvePool(pool);

        // Decode token indices from extraData
        (int128 i, int128 j) = abi.decode(params.extraData, (int128, int128));

        // Approve tokens
        IERC20Extended(params.tokenIn).approve(pool, params.amountIn);

        // Execute swap
        amountOut = curvePool.exchange(
            i,
            j,
            params.amountIn,
            params.minAmountOut
        );

        emit SwapExecuted(
            DataStructures.DEXType.CURVE,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.recipient
        );
    }

    // ============ PRICE FUNCTIONS ============

    /**
     * @dev Get output amount for a given input across DEXes
     */
    function getAmountOut(
        DataStructures.SwapParams memory params,
        mapping(string => address) storage dexRouters
    ) internal view returns (uint256 amountOut) {
        if (params.dexType == DataStructures.DEXType.UNISWAP_V2) {
            return _getUniswapV2AmountOut(params, dexRouters["UNISWAP_V2"]);
        } else if (params.dexType == DataStructures.DEXType.UNISWAP_V3) {
            return _getUniswapV3AmountOut(params, dexRouters["UNISWAP_V3"]);
        } else if (params.dexType == DataStructures.DEXType.SUSHISWAP) {
            return _getUniswapV2AmountOut(params, dexRouters["SUSHISWAP"]);
        } else if (params.dexType == DataStructures.DEXType.QUICKSWAP) {
            return _getUniswapV2AmountOut(params, dexRouters["QUICKSWAP"]);
        } else if (params.dexType == DataStructures.DEXType.CURVE) {
            return _getCurveAmountOut(params, dexRouters["CURVE"]);
        }
        return 0;
    }

    function _getUniswapV2AmountOut(
        DataStructures.SwapParams memory params,
        address router
    ) private view returns (uint256 amountOut) {
        if (router == address(0)) return 0;

        try
            IUniswapV2Router(router).getAmountsOut(params.amountIn, params.path)
        returns (uint256[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
        } catch {
            amountOut = 0;
        }
    }

    function _getUniswapV3AmountOut(
        DataStructures.SwapParams memory /* params */,
        address /* router */
    ) private pure returns (uint256 amountOut) {
        // For V3, we'd need to use quoter contract or calculate from pool state
        // This is a simplified version - in production, use the Quoter contract
        return 0;
    }

    function _getCurveAmountOut(
        DataStructures.SwapParams memory params,
        address pool
    ) private view returns (uint256 amountOut) {
        if (pool == address(0)) return 0;

        (int128 i, int128 j) = abi.decode(params.extraData, (int128, int128));
        try ICurvePool(pool).get_dy(i, j, params.amountIn)
        returns (uint256 dy) {
            amountOut = dy;
        } catch {
            amountOut = 0;
        }
    }

    // ============ ARBITRAGE FUNCTIONS ============

    /**
     * @dev Find arbitrage opportunities between DEXes
     */
    function findArbitrageOpportunity(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DataStructures.DEXType[] memory dexTypes,
        mapping(string => address) storage dexRouters
    )
        internal
        view
        returns (DataStructures.ArbitrageOpportunity memory opportunity)
    {
        uint256 bestBuyPrice = 0;
        uint256 bestSellPrice = 0;
        DataStructures.DEXType bestBuyDex;
        DataStructures.DEXType bestSellDex;

        // Check prices across all DEXes
        for (uint i = 0; i < dexTypes.length; i++) {
            address[] memory path = new address[](2);
            path[0] = tokenA;
            path[1] = tokenB;

            DataStructures.SwapParams memory buyParams = _buildSwapParams(
                dexTypes[i],
                tokenA,
                tokenB,
                amountIn,
                0,
                path,
                3000,
                address(this),
                block.timestamp + 300,
                ""
            );

            uint256 buyPrice = getAmountOut(buyParams, dexRouters);

            if (buyPrice > bestBuyPrice) {
                bestBuyPrice = buyPrice;
                bestBuyDex = dexTypes[i];
            }

            // Check reverse direction
            path[0] = tokenB;
            path[1] = tokenA;

            DataStructures.SwapParams memory sellParams = _buildSwapParams(
                dexTypes[i],
                tokenB,
                tokenA,
                buyPrice,
                0,
                path,
                3000,
                address(this),
                block.timestamp + 300,
                ""
            );

            uint256 sellPrice = getAmountOut(sellParams, dexRouters);

            if (sellPrice > bestSellPrice) {
                bestSellPrice = sellPrice;
                bestSellDex = dexTypes[i];
            }
        }

        // Calculate profit
        uint256 profit = bestSellPrice > amountIn
            ? bestSellPrice - amountIn
            : 0;

        opportunity = DataStructures.ArbitrageOpportunity({
            tokenA: tokenA,
            tokenB: tokenB,
            dexA: address(0), // Would be set to actual DEX addresses
            dexB: address(0),
            amountIn: amountIn,
            expectedProfit: profit,
            slippageTolerance: 300, // 3%
            gasEstimate: 300000,
            validUntil: block.timestamp + 300,
            priceSource: DataStructures.PriceSource.DEX_ORACLE
        });
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @dev Calculate slippage for a trade
     */
    function calculateSlippage(
        uint256 expectedAmount,
        uint256 actualAmount
    ) internal pure returns (uint256 slippageBPS) {
        if (expectedAmount == 0) return 0;
        if (actualAmount >= expectedAmount) return 0;

        uint256 slippage = expectedAmount.sub(actualAmount);
        slippageBPS = slippage.mul(BPS_BASE).div(expectedAmount);
    }

    /**
     * @dev Apply slippage tolerance to minimum output
     */
    function applySlippageTolerance(
        uint256 amount,
        uint256 slippageBPS
    ) internal pure returns (uint256) {
        return amount.mul(BPS_BASE.sub(slippageBPS)).div(BPS_BASE);
    }

    /**
     * @dev Validate swap parameters
     */
    function validateSwapParams(
        DataStructures.SwapParams memory params
    ) internal view {
        if (params.tokenIn == address(0) || params.tokenOut == address(0))
            revert InvalidPath();
        if (params.amountIn == 0) revert InvalidPath();
        if (params.deadline < block.timestamp) revert DeadlineExpired();
        if (params.path.length < 2) revert InvalidPath();
        if (
            params.path[0] != params.tokenIn ||
            params.path[params.path.length - 1] != params.tokenOut
        ) revert InvalidPath();
    }

    /**
     * @dev Get pair address for Uniswap V2 style DEXes
     */
    function getPairAddress(
        address tokenA,
        address tokenB,
        address factory
    ) internal view returns (address pair) {
        try IUniswapV2Factory(factory).getPair(tokenA, tokenB) returns (
            address pairAddr
        ) {
            pair = pairAddr;
        } catch {
            pair = address(0);
        }
    }

    /**
     * @dev Sort tokens for pair address calculation
     */
    function sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "Identical tokens");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "Zero address");
    }
}
