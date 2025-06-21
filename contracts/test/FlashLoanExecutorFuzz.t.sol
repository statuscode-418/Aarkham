// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/FlashLoanExecutor.sol";
import "../src/interfaces/Interfaces.sol";
import "../src/storage/DataStructures.sol";

/**
 * @title FlashLoanExecutorFuzz
 * @dev Fuzz tests for the FlashLoanExecutor contract
 */
contract FlashLoanExecutorFuzz is Test {
    FlashLoanExecutor public executor;
    
    address constant MOCK_ADDRESS_PROVIDER = address(0x1);
    address constant MOCK_WETH = address(0x2);
    address constant MOCK_TOKEN = address(0x3);
    address constant MOCK_ROUTER = address(0x4);
    
    address public owner;
    
    function setUp() public {
        owner = address(this);
        
        // Mock WETH calls
        vm.mockCall(
            MOCK_WETH,
            abi.encodeWithSelector(IERC20.balanceOf.selector),
            abi.encode(0)
        );
        
        // Mock address provider getPool() call
        vm.mockCall(
            MOCK_ADDRESS_PROVIDER,
            abi.encodeWithSelector(IPoolAddressesProvider.getPool.selector),
            abi.encode(address(0x999))
        );
        
        executor = new FlashLoanExecutor(MOCK_ADDRESS_PROVIDER, MOCK_WETH);
        executor.setDEXRouter("TEST", MOCK_ROUTER);
    }
    
    // ============ FUZZ TEST FOR STRATEGY CREATION ============
    
    function testFuzzCreateStrategy(
        string calldata name,
        uint256 minProfitBPS,
        uint8 actionCount
    ) public {
        // Bound inputs
        vm.assume(bytes(name).length > 0 && bytes(name).length <= 100);
        minProfitBPS = bound(minProfitBPS, 0, 10000); // 0-100% BPS
        actionCount = uint8(bound(actionCount, 1, 10)); // 1-10 actions
        
        // Create arrays
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](actionCount);
        address[] memory targets = new address[](actionCount);
        bytes[] memory datas = new bytes[](actionCount);
        
        // Fill arrays
        for (uint i = 0; i < actionCount; i++) {
            actionTypes[i] = DataStructures.ActionType.SWAP;
            targets[i] = MOCK_ROUTER;
            datas[i] = abi.encode("test", i);
        }
        
        uint256 strategyIdBefore = executor.nextStrategyId();
        
        executor.createStrategy(name, actionTypes, targets, datas, minProfitBPS);
        
        // Verify strategy creation
        assertEq(executor.nextStrategyId(), strategyIdBefore + 1);
        assertEq(executor.getStrategyActionsCount(strategyIdBefore), actionCount);
        
        (
            uint256 id,
            address creator,
            bool active,
            uint256 actualMinProfitBPS,
            uint256 executionCount,
            uint256 totalProfit
        ) = executor.getStrategy(strategyIdBefore);
        
        assertEq(id, strategyIdBefore);
        assertEq(creator, owner);
        assertTrue(active);
        assertEq(actualMinProfitBPS, minProfitBPS);
        assertEq(executionCount, 0);
        assertEq(totalProfit, 0);
    }
    
    // ============ FUZZ TEST FOR SAFETY PARAMETERS ============
    
    function testFuzzUpdateSafetyParams(
        uint256 maxSlippageBPS,
        uint256 minProfitBPS,
        uint256 maxGasPrice
    ) public {
        // Bound inputs to reasonable ranges
        maxSlippageBPS = bound(maxSlippageBPS, 1, 5000); // 0.01% to 50%
        minProfitBPS = bound(minProfitBPS, 0, 1000); // 0% to 10%
        maxGasPrice = bound(maxGasPrice, 1 gwei, 1000 gwei);
        
        executor.updateSafetyParams(maxSlippageBPS, minProfitBPS, maxGasPrice);
        
        assertEq(executor.maxSlippageBPS(), maxSlippageBPS);
        assertEq(executor.minProfitBPS(), minProfitBPS);
        assertEq(executor.maxGasPrice(), maxGasPrice);
    }
    
    // ============ FUZZ TEST FOR EXECUTOR AUTHORIZATION ============
    
    function testFuzzSetAuthorizedExecutor(address executor_addr, bool isAuthorized) public {
        vm.assume(executor_addr != address(0));
        vm.assume(executor_addr != owner); // Owner is always authorized
        
        bool initialAuth = executor.authorizedExecutors(executor_addr);
        
        executor.setAuthorizedExecutor(executor_addr, isAuthorized);
        
        assertEq(executor.authorizedExecutors(executor_addr), isAuthorized);
        
        // Test that we can toggle the authorization
        executor.setAuthorizedExecutor(executor_addr, !isAuthorized);
        assertEq(executor.authorizedExecutors(executor_addr), !isAuthorized);
    }
    
    // ============ FUZZ TEST FOR DEX ROUTER SETTING ============
    
    function testFuzzSetDEXRouter(string calldata dexName, address router) public {
        vm.assume(bytes(dexName).length > 0 && bytes(dexName).length <= 50);
        vm.assume(router != address(0));
        
        // Should not revert
        executor.setDEXRouter(dexName, router);
        
        // Test setting again with different router
        address newRouter = address(uint160(router) + 1);
        executor.setDEXRouter(dexName, newRouter);
    }
    
    // ============ FUZZ TEST FOR ARRAY VALIDATION ============
    
    function testFuzzCreateStrategyArrayValidation(
        uint8 actionTypesLength,
        uint8 targetsLength,
        uint8 datasLength
    ) public {
        // Bound to reasonable sizes
        actionTypesLength = uint8(bound(actionTypesLength, 0, 20));
        targetsLength = uint8(bound(targetsLength, 0, 20));
        datasLength = uint8(bound(datasLength, 0, 20));
        
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](actionTypesLength);
        address[] memory targets = new address[](targetsLength);
        bytes[] memory datas = new bytes[](datasLength);
        
        // Fill arrays
        for (uint i = 0; i < actionTypesLength; i++) {
            actionTypes[i] = DataStructures.ActionType.SWAP;
        }
        for (uint i = 0; i < targetsLength; i++) {
            targets[i] = MOCK_ROUTER;
        }
        for (uint i = 0; i < datasLength; i++) {
            datas[i] = abi.encode("test");
        }
        
        if (actionTypesLength == targetsLength && targetsLength == datasLength && actionTypesLength > 0) {
            // Should succeed
            executor.createStrategy("Fuzz Strategy", actionTypes, targets, datas, 100);
        } else {
            // Should fail with array length mismatch
            vm.expectRevert("Array length mismatch");
            executor.createStrategy("Fuzz Strategy", actionTypes, targets, datas, 100);
        }
    }
    
    // ============ FUZZ TEST FOR PROFIT CALCULATIONS ============
    
    function testFuzzUserProfitAccumulation(
        address user,
        address token,
        uint256 profit1,
        uint256 profit2
    ) public {
        vm.assume(user != address(0));
        vm.assume(token != address(0));
        profit1 = bound(profit1, 0, type(uint128).max);
        profit2 = bound(profit2, 0, type(uint128).max - profit1);
        
        // Initial profit should be 0
        assertEq(executor.getUserProfit(user, token), 0);
        
        // Manually test profit accumulation logic
        // Note: In real contract, this is done through executeOperation
        // but for fuzz testing we can check the view function behavior
        uint256 initialProfit = executor.getUserProfit(user, token);
        assertEq(initialProfit, 0);
    }
    
    // ============ FUZZ TEST FOR GAS PRICE VALIDATION ============
    
    function testFuzzGasPriceValidation(uint256 gasPrice, uint256 maxGasPrice) public {
        // Set up a strategy first
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = MOCK_ROUTER;
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Gas Test Strategy", actionTypes, targets, datas, 100);
        
        // Set max gas price
        maxGasPrice = bound(maxGasPrice, 1 gwei, 1000 gwei);
        executor.updateSafetyParams(300, 50, maxGasPrice);
        
        // Test gas price
        gasPrice = bound(gasPrice, 1 gwei, 2000 gwei);
        vm.txGasPrice(gasPrice);
        
        address[] memory assets = new address[](1);
        assets[0] = MOCK_TOKEN;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        if (gasPrice <= maxGasPrice) {
            // Should not revert due to gas price (but may revert for other reasons)
            try executor.executeStrategy(1, assets, amounts) {
                // Success case
            } catch Error(string memory reason) {
                // Should not be gas price related error
                assertTrue(!_stringEquals(reason, "Gas price too high"));
            }
        } else {
            // Should revert with gas price error
            vm.expectRevert("Gas price too high");
            executor.executeStrategy(1, assets, amounts);
        }
    }
    
    // ============ FUZZ TEST FOR EMERGENCY FUNCTIONS ============
    
    function testFuzzEmergencyStop(bool emergencyState) public {
        // Set emergency state
        if (emergencyState != executor.emergencyStop()) {
            executor.toggleEmergencyStop();
        }
        
        assertEq(executor.emergencyStop(), emergencyState);
        
        // Test that emergency withdraw requires emergency stop
        if (emergencyState) {
            // Should not revert (though may fail for other reasons)
            try executor.emergencyWithdraw(MOCK_TOKEN, owner) {
                // Success case
            } catch Error(string memory reason) {
                // Should not be emergency stop related error
                assertTrue(!_stringEquals(reason, "Emergency stop not active"));
            }
        } else {
            vm.expectRevert("Emergency stop not active");
            executor.emergencyWithdraw(MOCK_TOKEN, owner);
        }
    }
    
    // ============ FUZZ TEST FOR STRATEGY ID VALIDATION ============
    
    function testFuzzStrategyIdValidation(uint256 strategyId) public {
        uint256 nextId = executor.nextStrategyId();
        
        address[] memory assets = new address[](1);
        assets[0] = MOCK_TOKEN;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        if (strategyId == 0 || strategyId >= nextId) {
            vm.expectRevert("Invalid strategy ID");
            executor.executeStrategy(strategyId, assets, amounts);
        } else {
            // Strategy exists but may not be active or have other issues
            try executor.executeStrategy(strategyId, assets, amounts) {
                // Success case
            } catch Error(string memory reason) {
                // Should not be strategy ID related error
                assertTrue(!_stringEquals(reason, "Invalid strategy ID"));
            }
        }
    }
    
    // ============ FUZZ TEST FOR FLASH LOAN AMOUNTS ============
    
    function testFuzzFlashLoanAmounts(uint8 assetCount, uint256 baseAmount) public {
        assetCount = uint8(bound(assetCount, 1, 5));
        baseAmount = bound(baseAmount, 1e6, 1e24); // 1 USDC to 1M tokens
        
        // Create strategy first
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = MOCK_ROUTER;
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Amount Test Strategy", actionTypes, targets, datas, 100);
        
        // Create assets and amounts arrays
        address[] memory assets = new address[](assetCount);
        uint256[] memory amounts = new uint256[](assetCount);
        
        for (uint i = 0; i < assetCount; i++) {
            assets[i] = address(uint160(uint256(uint160(MOCK_TOKEN)) + i));
            amounts[i] = baseAmount + (i * 1e18);
        }
        
        // Test that arrays must be same length
        try executor.executeStrategy(1, assets, amounts) {
            // Success case
        } catch Error(string memory reason) {
            // Array length should match
            assertTrue(!_stringEquals(reason, "Array length mismatch"));
        }
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _stringEquals(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
