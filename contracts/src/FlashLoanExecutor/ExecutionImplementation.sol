// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "../libraries/DEXLibrary.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/safeMath.sol";
import "./FlashLoanExecutorStorage.sol";

/**
 * @title ExecutionImplementation
 * @dev Implementation contract for strategy execution logic
 */
contract ExecutionImplementation is FlashLoanExecutorStorage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Extended;
    using DEXLibrary for *;

    // ============ EVENTS ============
    event ActionExecuted(
        uint256 indexed strategyId,
        uint256 actionIndex,
        DataStructures.ActionType actionType,
        bool success
    );

    // Implementation contract constructor - disable initialization
    constructor() FlashLoanExecutorStorage(address(1), address(1), address(1)) {
        // Disable initialization in implementation contract
        // The proxy will handle proper initialization
    }

    // ============ STRATEGY EXECUTION ============
    function executeStrategyAndTrack(
        StrategyParams memory sp,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums
    ) external returns (uint256 gasUsed) {
        uint256 gasStart = gasleft();
        
        _recordBalancesBefore(assets);
        bool success = _executeStrategyActions(sp.strategyId, assets, amounts, sp.userData);
        _recordBalancesAfter(assets);
        
        uint256 profit = _calculateProfit(assets, amounts, premiums);
        _repayFlashLoan(assets, amounts, premiums);
        _validateProfitInternal(profit, sp, assets, amounts);
        
        require(success, "Strategy execution failed");
        gasUsed = gasStart - gasleft();

        // Update user profits
        userProfits[sp.executor][assets[0]] = userProfits[sp.executor][assets[0]].add(profit);
    }

    struct StrategyParams {
        uint256 strategyId;
        address executor;
        bytes userData;
    }

    function _executeStrategyActions(
        uint256 strategyId,
        address[] calldata flashLoanAssets,
        uint256[] calldata flashLoanAmounts,
        bytes memory userData
    ) internal returns (bool) {
        DataStructures.Action[] storage actions = strategyActions[strategyId];

        for (uint i = 0; i < actions.length; i++) {
            DataStructures.Action memory action = actions[i];

            bool actionSuccess = _executeAction(
                action,
                flashLoanAssets,
                flashLoanAmounts,
                userData
            );

            emit ActionExecuted(strategyId, i, action.actionType, actionSuccess);

            if (!actionSuccess) {
                return false;
            }
        }
        return true;
    }

    function _executeAction(
        DataStructures.Action memory action,
        address[] calldata, /* flashLoanAssets */
        uint256[] calldata, /* flashLoanAmounts */
        bytes memory /* userData */
    ) internal returns (bool) {
        if (action.actionType == DataStructures.ActionType.SWAP) {
            return _executeSwap(action);
        } else if (action.actionType == DataStructures.ActionType.LEND) {
            return _executeLend(action);
        } else if (action.actionType == DataStructures.ActionType.BORROW) {
            return _executeBorrow(action);
        } else if (action.actionType == DataStructures.ActionType.WRAP) {
            return _executeWrap(action);
        } else if (action.actionType == DataStructures.ActionType.UNWRAP) {
            return _executeUnwrap(action);
        } else {
            // Generic action execution using target and data
            return _executeGenericAction(action);
        }
    }

    function _executeSwap(DataStructures.Action memory action) internal returns (bool) {
        // Decode swap parameters from action.data
        DataStructures.SwapParams memory swapParams;
        
        // Safe decoding
        if (action.data.length > 0) {
            swapParams = abi.decode(action.data, (DataStructures.SwapParams));
        } else {
            return false;
        }

        uint256 amountOut = DEXLibrary.executeSwap(swapParams, dexRouters);
        return amountOut >= swapParams.minAmountOut;
    }

    function _executeLend(DataStructures.Action memory action) internal returns (bool) {
        // Generic lending action via Aave
        (bool success, ) = action.target.call{value: action.value}(action.data);
        return success;
    }

    function _executeBorrow(DataStructures.Action memory action) internal returns (bool) {
        // Generic borrowing action via Aave
        (bool success, ) = action.target.call{value: action.value}(action.data);
        return success;
    }

    function _executeWrap(DataStructures.Action memory action) internal returns (bool) {
        // WETH wrapping
        (bool success, ) = action.target.call{value: action.value}(action.data);
        return success;
    }

    function _executeUnwrap(DataStructures.Action memory action) internal returns (bool) {
        // WETH unwrapping
        (bool success, ) = action.target.call{value: action.value}(action.data);
        return success;
    }

    function _executeGenericAction(DataStructures.Action memory action) internal returns (bool) {
        // Generic action execution
        (bool success, ) = action.target.call{value: action.value}(action.data);
        return success;
    }

    function _calculateProfit(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums
    ) internal view returns (uint256 totalProfit) {
        for (uint i = 0; i < assets.length; i++) {
            uint256 balanceAfter = _getBalanceAfter(assets[i]);
            uint256 balanceBefore = _getBalanceBefore(assets[i]);
            uint256 totalOwed = amounts[i].add(premiums[i]);
            
            if (balanceAfter > balanceBefore.add(totalOwed)) {
                totalProfit = totalProfit.add(balanceAfter.sub(balanceBefore).sub(totalOwed));
            }
        }
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

    function _validateProfitInternal(
        uint256 profit,
        StrategyParams memory sp,
        address[] calldata assets,
        uint256[] calldata amounts
    ) internal view {
        if (strategies[sp.strategyId].minProfitBPS > 0) {
            uint256 minProfit = _calculateMinProfit(assets, amounts);
            require(profit >= minProfit, "Insufficient profit generated");
        }
    }

    function _calculateMinProfit(
        address[] calldata assets,
        uint256[] calldata amounts
    ) internal view returns (uint256) {
        uint256 totalValue;
        for (uint i = 0; i < assets.length; i++) {
            totalValue = totalValue.add(amounts[i]);
        }
        return totalValue.mul(safetyParams.minProfitBPS).div(10000);
    }
}
