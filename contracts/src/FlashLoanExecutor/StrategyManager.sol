// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "./FlashLoanExecutorStorage.sol";

/**
 * @title StrategyManager
 * @dev Strategy management functions for FlashLoanExecutor
 */
abstract contract StrategyManager is FlashLoanExecutorStorage {
    // ============ EVENTS ============
    event StrategyCreated(
        uint256 indexed strategyId,
        address indexed creator,
        DataStructures.StrategyType strategyType,
        string name
    );
    event StrategyStatusUpdated(
        uint256 indexed strategyId,
        bool active,
        address indexed updater
    );
    event StrategyUpdated(
        uint256 indexed strategyId,
        address indexed updater,
        uint256 newDeadline
    );

    // ============ MODIFIERS ============
    modifier onlyStrategyCreator(uint256 strategyId) {
        require(
            strategies[strategyId].creator == msg.sender ||
                msg.sender == owner(),
            "Not strategy creator"
        );
        _;
    }

    // ============ STRATEGY MANAGEMENT ============
    function createStrategy(
        string memory name,
        string memory description,
        DataStructures.StrategyType strategyType,
        DataStructures.Action[] memory actions,
        uint256 deadline,
        uint256 minProfitBPS
    ) external returns (uint256 strategyId) {
        require(actions.length > 0, "No actions provided");
        require(deadline > block.timestamp, "Invalid deadline");
        require(bytes(name).length > 0, "Name required");
        require(bytes(description).length > 0, "Description required");

        strategyId = nextStrategyId++;

        strategies[strategyId].id = strategyId;
        strategies[strategyId].name = name;
        strategies[strategyId].description = description;
        strategies[strategyId].strategyType = strategyType;
        strategies[strategyId].creator = msg.sender;
        strategies[strategyId].active = true;
        strategies[strategyId].deadline = deadline;
        strategies[strategyId].minProfitBPS = minProfitBPS;
        strategies[strategyId].createdAt = block.timestamp;

        // Store actions separately to avoid deep storage access
        for (uint i = 0; i < actions.length; i++) {
            strategyActions[strategyId].push(actions[i]);
        }

        userStrategies[msg.sender][strategyId] = true;

        emit StrategyCreated(strategyId, msg.sender, strategyType, name);
    }

    function updateStrategy(
        uint256 strategyId,
        bool active,
        uint256 deadline
    ) external validStrategy(strategyId) onlyStrategyCreator(strategyId) {
        require(deadline > block.timestamp, "Invalid deadline");

        strategies[strategyId].active = active;
        strategies[strategyId].deadline = deadline;

        emit StrategyStatusUpdated(strategyId, active, msg.sender);
        emit StrategyUpdated(strategyId, msg.sender, deadline);
    }

    function deactivateStrategy(uint256 strategyId) external onlyStrategyCreator(strategyId) {
        strategies[strategyId].active = false;
        emit StrategyStatusUpdated(strategyId, false, msg.sender);
    }

    function extendStrategyDeadline(
        uint256 strategyId,
        uint256 newDeadline
    ) external validStrategy(strategyId) onlyStrategyCreator(strategyId) {
        require(newDeadline > strategies[strategyId].deadline, "New deadline must be later");
        require(newDeadline > block.timestamp, "Deadline must be in future");

        strategies[strategyId].deadline = newDeadline;
        emit StrategyUpdated(strategyId, msg.sender, newDeadline);
    }

    function updateStrategyMinProfit(
        uint256 strategyId,
        uint256 minProfitBPS
    ) external validStrategy(strategyId) onlyStrategyCreator(strategyId) {
        require(minProfitBPS <= 5000, "Min profit too high"); // Max 50%
        
        strategies[strategyId].minProfitBPS = minProfitBPS;
    }

    function addStrategyAction(
        uint256 strategyId,
        DataStructures.Action memory action
    ) external validStrategy(strategyId) onlyStrategyCreator(strategyId) {
        require(action.target != address(0), "Invalid action target");
        
        strategyActions[strategyId].push(action);
    }

    function removeStrategyAction(
        uint256 strategyId,
        uint256 actionIndex
    ) external validStrategy(strategyId) onlyStrategyCreator(strategyId) {
        require(actionIndex < strategyActions[strategyId].length, "Invalid action index");
        
        // Move the last element to the deleted position and remove the last element
        uint256 lastIndex = strategyActions[strategyId].length - 1;
        if (actionIndex != lastIndex) {
            strategyActions[strategyId][actionIndex] = strategyActions[strategyId][lastIndex];
        }
        strategyActions[strategyId].pop();
    }

    // ============ EXECUTION TRACKING ============
    function recordExecution(
        uint256 strategyId,
        address executor,
        bool success,
        uint256 gasUsed,
        uint256 profit
    ) internal {
        strategies[strategyId].executionCount++;
        if (success) {
            strategies[strategyId].totalProfit += profit;
        }

        DataStructures.ExecutionResult memory result = DataStructures.ExecutionResult({
            strategyId: strategyId,
            executor: executor,
            status: success ? DataStructures.ExecutionStatus.SUCCESS : DataStructures.ExecutionStatus.FAILED,
            gasUsed: gasUsed,
            profitGenerated: profit,
            executionTime: block.timestamp,
            errorMessage: success ? "" : "Strategy execution failed",
            txHash: blockhash(block.number - 1)
        });

        strategyExecutions[strategyId].push(result);
    }

    // ============ VIEW FUNCTIONS ============
    function getStrategy(
        uint256 strategyId
    )
        external
        view
        returns (
            uint256 id,
            string memory name,
            string memory description,
            DataStructures.StrategyType strategyType,
            address creator,
            bool active,
            uint256 executionCount,
            uint256 totalProfit,
            uint256 createdAt,
            uint256 deadline,
            uint256 minProfitBPS
        )
    {
        DataStructures.Strategy storage strategy = strategies[strategyId];
        return (
            strategy.id,
            strategy.name,
            strategy.description,
            strategy.strategyType,
            strategy.creator,
            strategy.active,
            strategy.executionCount,
            strategy.totalProfit,
            strategy.createdAt,
            strategy.deadline,
            strategy.minProfitBPS
        );
    }

    function getStrategyActions(
        uint256 strategyId
    ) external view virtual returns (DataStructures.Action[] memory) {
        return strategyActions[strategyId];
    }

    function getUserStrategies(
        address user
    ) external view returns (uint256[] memory) {
        uint256[] memory userStrategyIds = new uint256[](MAX_STRATEGIES_PER_USER);
        uint256 count = 0;

        for (
            uint256 i = 1;
            i < nextStrategyId && count < MAX_STRATEGIES_PER_USER;
            i++
        ) {
            if (userStrategies[user][i]) {
                userStrategyIds[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = userStrategyIds[i];
        }

        return result;
    }

    function getExecutionHistory(
        uint256 strategyId
    ) external view returns (DataStructures.ExecutionResult[] memory) {
        return strategyExecutions[strategyId];
    }

    function getStrategyCount() external view returns (uint256) {
        return nextStrategyId - 1; // Subtract 1 because nextStrategyId starts at 1
    }

    function isStrategyActive(uint256 strategyId) external view returns (bool) {
        return strategies[strategyId].active && 
               strategies[strategyId].deadline > block.timestamp;
    }

    function getActiveStrategies() external view returns (uint256[] memory) {
        uint256[] memory activeIds = new uint256[](nextStrategyId);
        uint256 count = 0;

        for (uint256 i = 1; i < nextStrategyId; i++) {
            if (strategies[i].active && strategies[i].deadline > block.timestamp) {
                activeIds[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeIds[i];
        }

        return result;
    }
}
