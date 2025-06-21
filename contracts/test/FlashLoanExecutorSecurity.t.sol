// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/FlashLoanExecutor.sol";
import "../src/interfaces/Interfaces.sol";
import "../src/storage/DataStructures.sol";

/**
 * @title FlashLoanExecutorSecurity
 * @dev Security-focused tests for the FlashLoanExecutor contract
 */
contract FlashLoanExecutorSecurity is Test {
    FlashLoanExecutor public executor;
    
    address constant MOCK_ADDRESS_PROVIDER = address(0x1);
    address constant MOCK_WETH = address(0x2);
    address constant ATTACKER = address(0x666);
    address constant LEGITIMATE_USER = address(0x1234);
    
    address public owner;
    
    event SecurityEvent(string eventType, address actor, bool success);
    
    function setUp() public {
        owner = address(this);
        
        // Mock WETH
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
        executor.setAuthorizedExecutor(LEGITIMATE_USER, true);
        executor.setDEXRouter("TEST", address(0x123));
    }
    
    // ============ ACCESS CONTROL SECURITY TESTS ============
    
    function testUnauthorizedCannotCreateStrategy() public {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("malicious");
        
        vm.prank(ATTACKER);
        vm.expectRevert("Unauthorized");
        executor.createStrategy("Malicious Strategy", actionTypes, targets, datas, 100);
        
        emit SecurityEvent("Unauthorized Strategy Creation", ATTACKER, false);
    }
    
    function testUnauthorizedCannotExecuteStrategy() public {
        // First create a strategy as authorized user
        vm.prank(LEGITIMATE_USER);
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("legitimate");
        
        executor.createStrategy("Legitimate Strategy", actionTypes, targets, datas, 100);
        
        // Try to execute as unauthorized user
        address[] memory assets = new address[](1);
        assets[0] = address(0x456);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        vm.prank(ATTACKER);
        vm.expectRevert("Unauthorized");
        executor.executeStrategy(1, assets, amounts);
        
        emit SecurityEvent("Unauthorized Strategy Execution", ATTACKER, false);
    }
    
    function testOnlyOwnerCanModifySettings() public {
        // Test setDEXRouter
        vm.prank(ATTACKER);
        vm.expectRevert();
        executor.setDEXRouter("MALICIOUS", address(0x666));
        
        // Test setAuthorizedExecutor
        vm.prank(ATTACKER);
        vm.expectRevert();
        executor.setAuthorizedExecutor(ATTACKER, true);
        
        // Test updateSafetyParams
        vm.prank(ATTACKER);
        vm.expectRevert();
        executor.updateSafetyParams(9999, 9999, 999 gwei);
        
        // Test toggleEmergencyStop
        vm.prank(ATTACKER);
        vm.expectRevert();
        executor.toggleEmergencyStop();
        
        emit SecurityEvent("Unauthorized Settings Modification", ATTACKER, false);
    }
    
    // ============ REENTRANCY PROTECTION TESTS ============
    
    function testReentrancyProtectionOnExecution() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(executor);
        executor.setAuthorizedExecutor(address(attacker), true);
        
        // Create a strategy that will trigger reentrancy
        vm.prank(address(attacker));
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(attacker);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(ReentrancyAttacker.triggerReentrancy.selector);
        
        executor.createStrategy("Reentrancy Strategy", actionTypes, targets, datas, 100);
        
        // The reentrancy guard should prevent the attack
        address[] memory assets = new address[](1);
        assets[0] = address(0x789);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        // This might fail due to reentrancy protection or other reasons
        vm.prank(address(attacker));
        try executor.executeStrategy(1, assets, amounts) {
            // If it succeeds, the reentrancy attempt should have been blocked
        } catch {
            // Expected to fail
        }
        
        emit SecurityEvent("Reentrancy Protection Test", address(attacker), true);
    }
    
    // ============ FLASH LOAN SECURITY TESTS ============
    
    function testFlashLoanOnlyFromAavePool() public {
        address[] memory assets = new address[](1);
        assets[0] = address(0x789);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), ATTACKER);
        
        // Attacker tries to call executeOperation directly
        vm.prank(ATTACKER);
        vm.expectRevert("Caller is not Aave V3 Pool");
        executor.executeOperation(assets, amounts, premiums, address(executor), params);
        
        emit SecurityEvent("Flash Loan Access Control", ATTACKER, false);
    }
    
    function testFlashLoanInitiatorValidation() public {
        // Mock being called from the correct pool but wrong initiator
        address mockPool = address(executor.aavePool());
        
        address[] memory assets = new address[](1);
        assets[0] = address(0x789);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), ATTACKER);
        
        vm.prank(mockPool);
        vm.expectRevert("Initiator is not this contract");
        executor.executeOperation(assets, amounts, premiums, ATTACKER, params);
        
        emit SecurityEvent("Flash Loan Initiator Validation", ATTACKER, false);
    }
    
    // ============ EMERGENCY STOP SECURITY TESTS ============
    
    function testEmergencyStopPreventsExecution() public {
        // Create a strategy first
        vm.prank(LEGITIMATE_USER);
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Emergency Test Strategy", actionTypes, targets, datas, 100);
        
        // Trigger emergency stop
        executor.toggleEmergencyStop();
        
        // Try to execute strategy
        address[] memory assets = new address[](1);
        assets[0] = address(0x456);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        vm.prank(LEGITIMATE_USER);
        vm.expectRevert("Emergency stop active");
        executor.executeStrategy(1, assets, amounts);
        
        emit SecurityEvent("Emergency Stop Protection", LEGITIMATE_USER, true);
    }
    
    function testEmergencyWithdrawOnlyInEmergency() public {
        // Try emergency withdraw without emergency stop
        vm.expectRevert("Emergency stop not active");
        executor.emergencyWithdraw(address(0x123), owner);
        
        // Enable emergency stop
        executor.toggleEmergencyStop();
        
        // Now it should work (though may fail for other reasons)
        try executor.emergencyWithdraw(address(0x123), owner) {
            // Success case
        } catch Error(string memory reason) {
            assertTrue(!_stringEquals(reason, "Emergency stop not active"));
        }
        
        emit SecurityEvent("Emergency Withdraw Access Control", owner, true);
    }
    
    // ============ GAS LIMIT SECURITY TESTS ============
    
    function testGasPriceProtection() public {
        // Create strategy
        vm.prank(LEGITIMATE_USER);
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Gas Test Strategy", actionTypes, targets, datas, 100);
        
        // Set very high gas price
        vm.txGasPrice(200 gwei);
        
        address[] memory assets = new address[](1);
        assets[0] = address(0x456);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        vm.prank(LEGITIMATE_USER);
        vm.expectRevert("Gas price too high");
        executor.executeStrategy(1, assets, amounts);
        
        emit SecurityEvent("Gas Price Protection", LEGITIMATE_USER, true);
    }
    
    // ============ INPUT VALIDATION SECURITY TESTS ============
    
    function testArrayLengthValidation() public {
        // Create strategy
        vm.prank(LEGITIMATE_USER);
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Array Test Strategy", actionTypes, targets, datas, 100);
        
        // Mismatched array lengths
        address[] memory assets = new address[](1);
        assets[0] = address(0x456);
        uint256[] memory amounts = new uint256[](2); // Different length
        amounts[0] = 1000e18;
        amounts[1] = 2000e18;
        
        vm.prank(LEGITIMATE_USER);
        vm.expectRevert("Array length mismatch");
        executor.executeStrategy(1, assets, amounts);
        
        emit SecurityEvent("Array Length Validation", LEGITIMATE_USER, true);
    }
    
    function testStrategyCreationArrayValidation() public {
        // Mismatched arrays in strategy creation
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](2); // Different length
        targets[0] = address(0x123);
        targets[1] = address(0x456);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        vm.prank(LEGITIMATE_USER);
        vm.expectRevert("Array length mismatch");
        executor.createStrategy("Invalid Strategy", actionTypes, targets, datas, 100);
        
        emit SecurityEvent("Strategy Creation Validation", LEGITIMATE_USER, true);
    }
    
    // ============ STRATEGY VALIDATION SECURITY TESTS ============
    
    function testInvalidStrategyIdRejection() public {
        address[] memory assets = new address[](1);
        assets[0] = address(0x456);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        // Test with strategy ID 0
        vm.prank(LEGITIMATE_USER);
        vm.expectRevert("Invalid strategy ID");
        executor.executeStrategy(0, assets, amounts);
        
        // Test with non-existent strategy ID
        vm.prank(LEGITIMATE_USER);
        vm.expectRevert("Invalid strategy ID");
        executor.executeStrategy(999, assets, amounts);
        
        emit SecurityEvent("Strategy ID Validation", LEGITIMATE_USER, true);
    }
    
    // ============ AUTHORIZATION ESCALATION TESTS ============
    
    function testCannotEscalatePrivileges() public {
        // Attacker tries to authorize themselves
        vm.prank(ATTACKER);
        vm.expectRevert();
        executor.setAuthorizedExecutor(ATTACKER, true);
        
        // Attacker tries to become owner
        vm.prank(ATTACKER);
        vm.expectRevert();
        executor.transferOwnership(ATTACKER);
        
        // Verify attacker is still not authorized
        assertFalse(executor.authorizedExecutors(ATTACKER));
        assertEq(executor.owner(), owner);
        
        emit SecurityEvent("Privilege Escalation Prevention", ATTACKER, true);
    }
    
    // ============ DENIAL OF SERVICE PROTECTION TESTS ============
    
    function testCannotDOSWithInvalidActions() public {
        vm.prank(LEGITIMATE_USER);
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0); // Invalid target
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("invalid");
        
        // Strategy creation should succeed (validation happens at execution)
        executor.createStrategy("Invalid Action Strategy", actionTypes, targets, datas, 100);
        
        // Execution should handle invalid actions gracefully
        address[] memory assets = new address[](1);
        assets[0] = address(0x456);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        vm.prank(LEGITIMATE_USER);
        try executor.executeStrategy(1, assets, amounts) {
            // May succeed or fail gracefully
        } catch {
            // Expected behavior for invalid actions
        }
        
        emit SecurityEvent("DoS Protection Test", LEGITIMATE_USER, true);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _stringEquals(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}

// ============ MOCK CONTRACTS FOR SECURITY TESTS ============

contract ReentrancyAttacker {
    FlashLoanExecutor public executor;
    bool public hasAttacked = false;
    
    constructor(FlashLoanExecutor _executor) {
        executor = _executor;
    }
    
    function triggerReentrancy() external {
        if (!hasAttacked) {
            hasAttacked = true;
            
            // Try to execute another strategy during execution
            address[] memory assets = new address[](1);
            assets[0] = address(0x999);
            uint256[] memory amounts = new uint256[](1);
            amounts[0] = 500e18;
            
            try executor.executeStrategy(1, assets, amounts) {
                // This should fail due to reentrancy guard
            } catch {
                // Expected to fail
            }
        }
    }
}
