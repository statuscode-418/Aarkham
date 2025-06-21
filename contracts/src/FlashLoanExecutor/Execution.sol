// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "../libraries/library.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/safeMath.sol";
import "./FlashLoanExecutorStorage.sol";

/**
 * @title Execution
 * @dev Strategy and action execution logic for FlashLoanExecutor
 */
abstract contract Execution is FlashLoanExecutorStorage {
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

    // ============ STRATEGY EXECUTION ============
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

            emit ActionExecuted(
                strategyId,
                i,
                action.actionType,
                actionSuccess
            );

            if (!actionSuccess && action.critical) {
                return false;
            }
        }

        return true;
    }

    function _executeAction(
        DataStructures.Action memory action,
        address[] calldata, /* flashLoanAssets */
        uint256[] calldata, /* flashLoanAmounts */
        bytes memory userData
    ) internal returns (bool) {
        if (action.actionType == DataStructures.ActionType.SWAP) {
            return _executeSwapAction(action, userData);
        } else if (action.actionType == DataStructures.ActionType.LEND) {
            return _executeLendAction(action);
        } else if (action.actionType == DataStructures.ActionType.BORROW) {
            return _executeBorrowAction(action);
        } else if (action.actionType == DataStructures.ActionType.STAKE) {
            return _executeStakeAction(action);
        } else if (action.actionType == DataStructures.ActionType.HARVEST) {
            return _executeHarvestAction(action);
        } else if (action.actionType == DataStructures.ActionType.WRAP) {
            return _executeWrapAction(action);
        } else if (action.actionType == DataStructures.ActionType.UNWRAP) {
            return _executeUnwrapAction(action);
        } else {
            return _executeCustomAction(action);
        }
    }

    // ============ ACTION IMPLEMENTATIONS ============
    function _executeSwapAction(
        DataStructures.Action memory action,
        bytes memory /* userData */
    ) internal returns (bool) {
        // Decode swap parameters from action data
        DataStructures.SwapParams memory swapParams = abi.decode(
            action.data,
            (DataStructures.SwapParams)
        );

        // Validate swap parameters
        DEXLibrary.validateSwapParams(swapParams);

        // Execute the swap
        uint256 amountOut = DEXLibrary.executeSwap(swapParams, dexRouters);
        return amountOut >= swapParams.minAmountOut;
    }

    function _executeLendAction(
        DataStructures.Action memory action
    ) internal returns (bool) {
        (address asset, uint256 amount, address protocol) = abi.decode(
            action.data,
            (address, uint256, address)
        );

        // Approve tokens
        IERC20Extended(asset).safeApprove(protocol, amount);

        // Execute lending based on protocol
        if (protocol == address(aavePool)) {
            try aavePool.supply(asset, amount, address(this), 0) {
                return true;
            } catch {
                return false;
            }
        }

        return false;
    }

    function _executeBorrowAction(
        DataStructures.Action memory action
    ) internal returns (bool) {
        (address asset, uint256 amount, address protocol) = abi.decode(
            action.data,
            (address, uint256, address)
        );

        // Execute borrowing based on protocol
        if (protocol == address(aavePool)) {
            try aavePool.borrow(asset, amount, 2, 0, address(this)) {
                return true;
            } catch {
                return false;
            }
        }

        return false;
    }

    function _executeStakeAction(
        DataStructures.Action memory action
    ) internal returns (bool) {
        DataStructures.YieldFarmingParams memory params = abi.decode(
            action.data,
            (DataStructures.YieldFarmingParams)
        );

        // Approve staking token
        IERC20Extended(params.stakingToken).safeApprove(
            params.farmContract,
            params.amount
        );

        try
            IMasterChef(params.farmContract).deposit(
                params.poolId,
                params.amount
            )
        {
            return true;
        } catch {
            return false;
        }
    }

    function _executeHarvestAction(
        DataStructures.Action memory action
    ) internal returns (bool) {
        (address farmContract, uint256 poolId) = abi.decode(
            action.data,
            (address, uint256)
        );

        try IMasterChef(farmContract).deposit(poolId, 0) {
            // Harvest by depositing 0
            return true;
        } catch {
            return false;
        }
    }

    function _executeWrapAction(
        DataStructures.Action memory action
    ) internal returns (bool) {
        uint256 amount = abi.decode(action.data, (uint256));

        try weth.deposit{value: amount}() {
            return true;
        } catch {
            return false;
        }
    }

    function _executeUnwrapAction(
        DataStructures.Action memory action
    ) internal returns (bool) {
        uint256 amount = abi.decode(action.data, (uint256));

        try weth.withdraw(amount) {
            return true;
        } catch {
            return false;
        }
    }

    function _executeCustomAction(
        DataStructures.Action memory action
    ) internal returns (bool) {
        // Execute arbitrary contract call
        (bool success, ) = action.target.call{value: action.value}(action.data);
        return success;
    }

    // ============ FLASH LOAN HELPERS ============
    function _repayFlashLoan(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums
    ) internal {
        for (uint i = 0; i < assets.length; i++) {
            uint256 totalDebt = amounts[i].add(premiums[i]);
            require(
                IERC20Extended(assets[i]).balanceOf(address(this)) >= totalDebt,
                "Insufficient balance for repayment"
            );
            IERC20Extended(assets[i]).safeApprove(address(aavePool), totalDebt);
        }
    }

    // ============ VIEW FUNCTIONS ============
    function getStrategyActions(
        uint256 strategyId
    ) external view virtual returns (DataStructures.Action[] memory) {
        return strategyActions[strategyId];
    }

    function getAvgGasUsage(
        DataStructures.ActionType actionType
    ) external view returns (uint256) {
        return avgGasUsage[actionType];
    }
}
