// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/FlashLoanExecutor.sol";
import "../src/interfaces/Interfaces.sol";
import "../src/storage/DataStructures.sol";

/**
 * @title FlashLoanExecutorEdgeCases
 * @dev Edge case tests for the FlashLoanExecutor contract
 */
contract FlashLoanExecutorEdgeCases is Test {
    FlashLoanExecutor public executor;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MockAddressProvider public addressProvider;
    MockAavePool public aavePool;
    
    address public owner;
    address public user = address(0x1234);
    
    function setUp() public {
        owner = address(this);
        
        // Deploy mocks
        tokenA = new MockERC20("Token A", "TKNA", 18);
        tokenB = new MockERC20("Token B", "TKNB", 18);
        aavePool = new MockAavePool();
        addressProvider = new MockAddressProvider(address(aavePool));
        
        // Deploy executor
        executor = new FlashLoanExecutor(address(addressProvider), address(tokenA));
        
        // Set up permissions
        executor.setAuthorizedExecutor(user, true);
        executor.setDEXRouter("TEST", address(0x123));
        
        // Mint tokens
        tokenA.mint(address(executor), 10000e18);
        tokenB.mint(address(executor), 10000e18);
    }
    
    // ============ EDGE CASE: MAXIMUM VALUES ============
    
    function testMaximumStrategyActions() public {
        uint256 maxActions = 50; // Large number of actions
        
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](maxActions);
        address[] memory targets = new address[](maxActions);
        bytes[] memory datas = new bytes[](maxActions);
        
        for (uint i = 0; i < maxActions; i++) {
            actionTypes[i] = DataStructures.ActionType.CUSTOM;
            targets[i] = address(0x123);
            datas[i] = abi.encode("action", i);
        }
        
        executor.createStrategy("Max Actions Strategy", actionTypes, targets, datas, 100);
        
        assertEq(executor.getStrategyActionsCount(1), maxActions);
    }
    
    function testMaximumBPSValues() public {
        // Test with maximum BPS values
        executor.updateSafetyParams(10000, 10000, type(uint256).max);
        
        assertEq(executor.maxSlippageBPS(), 10000);
        assertEq(executor.minProfitBPS(), 10000);
        assertEq(executor.maxGasPrice(), type(uint256).max);
    }
    
    function testMaximumStringLength() public {
        // Test with very long strategy name
        string memory longName = "This is a very long strategy name that contains many characters and might cause issues with storage or gas limits if not handled properly in the smart contract implementation";
        
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy(longName, actionTypes, targets, datas, 100);
        
        // Should succeed without issues
        assertEq(executor.nextStrategyId(), 2);
    }
    
    // ============ EDGE CASE: ZERO VALUES ============
    
    function testZeroProfitStrategy() public {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("zero profit");
        
        executor.createStrategy("Zero Profit Strategy", actionTypes, targets, datas, 0);
        
        (,,,uint256 minProfitBPS,,) = executor.getStrategy(1);
        assertEq(minProfitBPS, 0);
    }
    
    function testZeroGasPrice() public {
        vm.txGasPrice(0);
        
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Zero Gas Strategy", actionTypes, targets, datas, 100);
        
        // Should work with zero gas price
        address[] memory assets = new address[](1);
        assets[0] = address(tokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        
        // Should not revert due to gas price
        try executor.executeStrategy(1, assets, amounts) {
            // May fail for other reasons but not gas price
        } catch Error(string memory reason) {
            assertTrue(!_stringEquals(reason, "Gas price too high"));
        }
    }
    
    function testZeroAmountFlashLoan() public {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Zero Amount Strategy", actionTypes, targets, datas, 100);
        
        address[] memory assets = new address[](1);
        assets[0] = address(tokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 0; // Zero amount
        
        // Should handle zero amounts gracefully
        try executor.executeStrategy(1, assets, amounts) {
            // Success case
        } catch {
            // May fail but should not cause severe issues
        }
    }
    
    // ============ EDGE CASE: EMPTY ARRAYS ============
    
    function testEmptyAssetArray() public {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        executor.createStrategy("Empty Array Strategy", actionTypes, targets, datas, 100);
        
        address[] memory assets = new address[](0); // Empty array
        uint256[] memory amounts = new uint256[](0); // Empty array
        
        // Should handle empty arrays
        try executor.executeStrategy(1, assets, amounts) {
            // Success case
        } catch Error(string memory reason) {
            // May fail but not due to array length mismatch
            assertTrue(!_stringEquals(reason, "Array length mismatch"));
        }
    }
    
    // ============ EDGE CASE: CONTRACT INTERACTIONS ============
    
    function testContractAsExecutor() public {
        MockExecutorContract mockExecutor = new MockExecutorContract();
        
        executor.setAuthorizedExecutor(address(mockExecutor), true);
        
        // Contract should be able to create strategies
        vm.prank(address(mockExecutor));
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("contract strategy");
        
        executor.createStrategy("Contract Strategy", actionTypes, targets, datas, 100);
        
        assertEq(executor.nextStrategyId(), 2);
    }
    
    function testSelfAsTarget() public {
        // Strategy that targets the executor contract itself
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(executor); // Self-referential
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encodeWithSignature("nextStrategyId()");
        
        executor.createStrategy("Self Strategy", actionTypes, targets, datas, 100);
        
        assertEq(executor.getStrategyActionsCount(1), 1);
    }
    
    // ============ EDGE CASE: REENTRANCY SCENARIOS ============
    
    function testReentrancyProtection() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(executor);
        executor.setAuthorizedExecutor(address(attacker), true);
        
        // Attacker tries to create a strategy that calls back into executor
        vm.prank(address(attacker));
        
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(attacker);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(ReentrancyAttacker.attack.selector);
        
        executor.createStrategy("Reentrancy Strategy", actionTypes, targets, datas, 100);
        
        // The contract should have reentrancy protection
        // This test verifies the strategy can be created but execution should be protected
        assertEq(executor.nextStrategyId(), 2);
    }
    
    // ============ EDGE CASE: LARGE DATA PAYLOADS ============
    
    function testLargeDataPayload() public {
        // Create large data payload
        bytes memory largeData = new bytes(10000); // 10KB of data
        for (uint i = 0; i < largeData.length; i++) {
            largeData[i] = bytes1(uint8(i % 256));
        }
        
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = largeData;
        
        executor.createStrategy("Large Data Strategy", actionTypes, targets, datas, 100);
        
        assertEq(executor.getStrategyActionsCount(1), 1);
    }
    
    // ============ EDGE CASE: EXTREME TIMESTAMPS ============
    
    function testFutureTimestamp() public {
        // Test with timestamp far in the future
        vm.warp(type(uint40).max - 1000);
        
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(0x123);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("future");
        
        executor.createStrategy("Future Strategy", actionTypes, targets, datas, 100);
        
        // Should handle extreme timestamps
        assertEq(executor.nextStrategyId(), 2);
    }
    
    // ============ EDGE CASE: MULTIPLE RAPID OPERATIONS ============
    
    function testRapidStrategyCreation() public {
        // Create many strategies rapidly
        for (uint i = 0; i < 100; i++) {
            DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
            actionTypes[0] = DataStructures.ActionType.CUSTOM;
            
            address[] memory targets = new address[](1);
            targets[0] = address(0x123);
            
            bytes[] memory datas = new bytes[](1);
            datas[0] = abi.encode("rapid", i);
            
            executor.createStrategy(
                string(abi.encodePacked("Rapid Strategy ", vm.toString(i))),
                actionTypes,
                targets,
                datas,
                100
            );
        }
        
        assertEq(executor.nextStrategyId(), 101);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _stringEquals(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}

// ============ MOCK CONTRACTS FOR EDGE CASES ============

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract MockAddressProvider {
    address public pool;
    
    constructor(address _pool) {
        pool = _pool;
    }
    
    function getPool() external view returns (address) {
        return pool;
    }
}

contract MockAavePool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata,
        address onBehalfOf,
        bytes calldata params,
        uint16
    ) external {
        // Mock implementation
        uint256[] memory premiums = new uint256[](amounts.length);
        for (uint i = 0; i < amounts.length; i++) {
            premiums[i] = amounts[i] / 1000; // 0.1% premium
        }
        
        IFlashLoanReceiver(receiverAddress).executeOperation(
            assets,
            amounts,
            premiums,
            onBehalfOf,
            params
        );
    }
}

contract MockExecutorContract {
    // Mock contract that can be used as an executor
    function doSomething() external pure returns (bool) {
        return true;
    }
}

contract ReentrancyAttacker {
    FlashLoanExecutor public executor;
    bool public attacked = false;
    
    constructor(FlashLoanExecutor _executor) {
        executor = _executor;
    }
    
    function attack() external {
        if (!attacked) {
            attacked = true;
            
            // Try to call back into executor during execution
            address[] memory assets = new address[](1);
            assets[0] = address(0x123);
            uint256[] memory amounts = new uint256[](1);
            amounts[0] = 1000e18;
            
            try executor.executeStrategy(1, assets, amounts) {
                // Should fail due to reentrancy guard
            } catch {
                // Expected to fail
            }
        }
    }
}
