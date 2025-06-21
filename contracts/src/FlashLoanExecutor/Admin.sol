// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "./FlashLoanExecutorStorage.sol";

/**
 * @title Admin
 * @dev Administrative functions for FlashLoanExecutor
 */
abstract contract Admin is FlashLoanExecutorStorage {
    // ============ EVENTS ============
    event DEXRouterUpdated(string indexed dexName, address indexed newRouter);
    event EmergencyStopToggled(bool stopped);
    event AuthorizedExecutorUpdated(address indexed executor, bool isAuthorized);
    event SafetyParamsUpdated(uint256 maxSlippageBPS, uint256 minProfitBPS, uint256 maxGasPrice);
    event PriceOracleUpdated(address indexed token, address indexed oracle);

    // ============ ADMIN FUNCTIONS ============
    function setDEXRouter(
        string calldata dexName,
        address router
    ) external onlyOwner {
        require(router != address(0), "Invalid router address");

        dexRouters[dexName] = router;
        supportedDEXes[dexName] = true;

        emit DEXRouterUpdated(dexName, router);
    }

    function toggleEmergencyStop(bool _stopped) external onlyOwner {
        emergencyStop = _stopped;
        safetyParams.emergencyStop = _stopped;
        emit EmergencyStopToggled(_stopped);
    }

    function setAuthorizedExecutor(
        address executor,
        bool isAuthorized
    ) external onlyOwner {
        require(executor != address(0), "Invalid executor address");
        authorizedExecutors[executor] = isAuthorized;
        emit AuthorizedExecutorUpdated(executor, isAuthorized);
    }

    function updateSafetyParams(
        uint256 maxSlippageBPS,
        uint256 minProfitBPS,
        uint256 maxGasPrice
    ) external onlyOwner {
        require(maxSlippageBPS <= MAX_SLIPPAGE_BPS, "Slippage too high");

        safetyParams.maxSlippageBPS = maxSlippageBPS;
        safetyParams.minProfitBPS = minProfitBPS;
        safetyParams.maxGasPrice = maxGasPrice;

        emit SafetyParamsUpdated(maxSlippageBPS, minProfitBPS, maxGasPrice);
    }

    function setPriceOracle(address token, address oracle) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(oracle != address(0), "Invalid oracle address");
        
        priceOracles[token] = oracle;
        emit PriceOracleUpdated(token, oracle);
    }

    // ============ VIEW FUNCTIONS ============
    function getDEXRouter(string calldata dexName) external view returns (address) {
        return dexRouters[dexName];
    }

    function isDEXSupported(string calldata dexName) external view returns (bool) {
        return supportedDEXes[dexName];
    }

    function isAuthorizedExecutor(address executor) external view returns (bool) {
        return authorizedExecutors[executor] || executor == owner();
    }

    function getSafetyParams() external view returns (DataStructures.SafetyParams memory) {
        return safetyParams;
    }
}
