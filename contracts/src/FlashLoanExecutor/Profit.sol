// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/Interfaces.sol";
import "../storage/DataStructures.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/safeMath.sol";
import "./FlashLoanExecutorStorage.sol";

/**
 * @title Profit
 * @dev Profit calculation and extraction logic for FlashLoanExecutor
 */
abstract contract Profit is FlashLoanExecutorStorage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Extended;

    // ============ EVENTS ============
    event ProfitExtracted(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    event ProfitCalculated(
        address indexed token,
        uint256 profit,
        uint256 priceUSD
    );

    // ============ PROFIT CALCULATION ============
    // Note: _recordBalancesBefore and _recordBalancesAfter are implemented in FlashLoanExecutorStorage

    function _calculateProfit(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums
    ) internal returns (uint256 totalProfit) {
        for (uint i = 0; i < assets.length; i++) {
            uint256 required = amounts[i].add(premiums[i]);
            uint256 available = _getBalanceAfter(assets[i]);

            if (available > required) {
                // We have profit in this asset
                uint256 profit = available.sub(required);

                // Convert to USD value using oracle
                uint256 priceInUSD = aaveOracle.getAssetPrice(assets[i]);
                uint256 profitUSD = profit.mul(priceInUSD).div(10 ** 18);
                totalProfit = totalProfit.add(profitUSD);

                emit ProfitCalculated(assets[i], profit, priceInUSD);
            }
        }
    }

    function _calculateMinProfit(
        address[] calldata assets,
        uint256[] calldata amounts
    ) internal view returns (uint256 minProfit) {
        uint256 totalValueUSD = 0;

        for (uint i = 0; i < assets.length; i++) {
            uint256 priceInUSD = aaveOracle.getAssetPrice(assets[i]);
            uint256 valueUSD = amounts[i].mul(priceInUSD).div(10 ** 18);
            totalValueUSD = totalValueUSD.add(valueUSD);
        }

        minProfit = totalValueUSD.mul(safetyParams.minProfitBPS).div(BPS_BASE);
    }

    function _validateProfit(
        uint256 profit,
        uint256 strategyId,
        address[] calldata assets,
        uint256[] calldata amounts
    ) internal view {
        // This function should be implemented in the main contract
        // as it needs access to strategy data
    }

    // ============ PROFIT EXTRACTION ============
    function extractProfit(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        uint256 balance = IERC20Extended(token).balanceOf(address(this));
        require(balance >= amount, "Insufficient balance");

        IERC20Extended(token).safeTransfer(recipient, amount);

        emit ProfitExtracted(token, amount, recipient);
    }

    function extractAllProfits(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");

        // Extract ETH
        if (address(this).balance > 0) {
            payable(recipient).transfer(address(this).balance);
            emit ProfitExtracted(address(0), address(this).balance, recipient);
        }

        // Extract WETH
        uint256 wethBalance = weth.balanceOf(address(this));
        if (wethBalance > 0) {
            weth.transfer(recipient, wethBalance);
            emit ProfitExtracted(address(weth), wethBalance, recipient);
        }
    }

    function extractSpecificTokens(
        address[] calldata tokens,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");

        for (uint i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 balance = IERC20Extended(token).balanceOf(address(this));
            
            if (balance > 0) {
                IERC20Extended(token).safeTransfer(recipient, balance);
                emit ProfitExtracted(token, balance, recipient);
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    function getTotalProfit(address token) external view returns (uint256) {
        return totalProfits[token];
    }

    function getUserProfit(
        address user,
        address token
    ) external view returns (uint256) {
        return userProfits[user][token];
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20Extended(token).balanceOf(address(this));
    }

    function getBalanceBefore(address token) external view returns (uint256) {
        return _getBalanceBefore(token);
    }

    function getBalanceAfter(address token) external view returns (uint256) {
        return _getBalanceAfter(token);
    }

    function estimateProfit(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums
    ) external view returns (uint256 estimatedProfit) {
        // This is a read-only estimate based on current balances
        for (uint i = 0; i < assets.length; i++) {
            uint256 required = amounts[i].add(premiums[i]);
            uint256 available = IERC20Extended(assets[i]).balanceOf(address(this));

            if (available > required) {
                uint256 profit = available.sub(required);
                uint256 priceInUSD = aaveOracle.getAssetPrice(assets[i]);
                uint256 profitUSD = profit.mul(priceInUSD).div(10 ** 18);
                estimatedProfit = estimatedProfit.add(profitUSD);
            }
        }
    }
}
