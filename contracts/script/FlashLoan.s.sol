// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import "forge-std/Script.sol";
import "../src/FlashLoanExecutor.sol";

contract DeployScript is Script {
    // Sepolia testnet addresses from official docs
    // Using Pool address directly since Pool Addresses Provider is reverting
    address constant AAVE_V3_POOL_ADDRESS =
        0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address constant WETH_ADDR = 0xdd13E55209Fd76AfE204dBda4007C227904f0a81;

    function run() external {
        vm.startBroadcast();
        FlashLoanExecutor exec = new FlashLoanExecutor(
            AAVE_V3_POOL_ADDRESS,
            WETH_ADDR
        );
        console.log("Deployed at", address(exec));
        vm.stopBroadcast();
    }
}
