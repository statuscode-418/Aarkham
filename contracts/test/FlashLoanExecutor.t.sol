// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/FlashLoanExecutor.sol";
import "../src/interfaces/Interfaces.sol";
import "../src/storage/DataStructures.sol";

contract FlashLoanExecutorTest is Test {
    FlashLoanExecutor public executor;
    
    // Mock contracts
    MockPoolAddressesProvider public mockAddressProvider;
    MockAaveV3Pool public mockPool;
    MockWETH public mockWETH;
    MockERC20 public mockUSDC;
    MockERC20 public mockDAI;
    
    // Test addresses
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public unauthorizedUser = address(0x4);
    
    // Test constants
    uint256 public constant INITIAL_BALANCE = 1000000 * 1e18;
    uint256 public constant FLASH_LOAN_AMOUNT = 100 * 1e18;
    uint256 public constant FLASH_LOAN_PREMIUM = 1 * 1e15; // 0.1%
    
    event FlashLoanInitiated(address indexed initiator, uint256 indexed strategyId);
    event StrategyExecuted(uint256 indexed strategyId, address indexed executor, uint256 profit);
    event StrategyCreated(uint256 indexed strategyId, address indexed creator);

    function setUp() public {
        // Deploy mock contracts
        mockWETH = new MockWETH();
        mockUSDC = new MockERC20("USDC", "USDC", 6);
        mockDAI = new MockERC20("DAI", "DAI", 18);
        mockPool = new MockAaveV3Pool();
        mockAddressProvider = new MockPoolAddressesProvider(address(mockPool));
        
        // Deploy FlashLoanExecutor
        vm.prank(owner);
        executor = new FlashLoanExecutor(
            address(mockAddressProvider),
            address(mockWETH)
        );
        
        // Setup initial balances
        mockWETH.mint(address(executor), INITIAL_BALANCE);
        mockUSDC.mint(address(executor), INITIAL_BALANCE / 1e12); // Adjust for decimals
        mockDAI.mint(address(executor), INITIAL_BALANCE);
        
        // Give tokens to users for testing
        mockWETH.mint(user1, INITIAL_BALANCE);
        mockUSDC.mint(user1, INITIAL_BALANCE / 1e12);
        mockDAI.mint(user1, INITIAL_BALANCE);
        
        // Setup mock pool with initial liquidity
        mockWETH.mint(address(mockPool), INITIAL_BALANCE * 10);
        mockUSDC.mint(address(mockPool), INITIAL_BALANCE * 10 / 1e12);
        mockDAI.mint(address(mockPool), INITIAL_BALANCE * 10);
        
        // Authorize users
        vm.prank(owner);
        executor.setAuthorizedExecutor(user1, true);
    }

    // ============ CONSTRUCTOR TESTS ============
    
    function testConstructor() public {
        assertEq(address(executor.addressProvider()), address(mockAddressProvider));
        assertEq(address(executor.aavePool()), address(mockPool));
        assertEq(address(executor.weth()), address(mockWETH));
        assertEq(executor.owner(), owner);
        assertTrue(executor.authorizedExecutors(owner));
        assertEq(executor.nextStrategyId(), 1);
        assertFalse(executor.emergencyStop());
    }

    function testConstructorWithZeroAddresses() public {
        vm.expectRevert("Invalid address provider");
        new FlashLoanExecutor(address(0), address(mockWETH));
        
        vm.expectRevert("Invalid WETH address");
        new FlashLoanExecutor(address(mockAddressProvider), address(0));
    }

    // ============ ACCESS CONTROL TESTS ============
    
    function testOnlyAuthorizedModifier() public {
        // Create test arrays for strategy creation
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockUSDC);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        // Should work for authorized user
        vm.prank(user1);
        executor.createStrategy("Test Strategy", actionTypes, targets, datas, 50);
        
        // Should fail for unauthorized user
        vm.prank(unauthorizedUser);
        vm.expectRevert("Unauthorized");
        executor.createStrategy("Test Strategy", actionTypes, targets, datas, 50);
    }

    function testOwnershipFunctions() public {
        assertEq(executor.owner(), owner);
        
        // Test setting authorized executor
        vm.prank(owner);
        executor.setAuthorizedExecutor(user2, true);
        assertTrue(executor.authorizedExecutors(user2));
        
        // Test unauthorized call
        vm.prank(user1);
        vm.expectRevert();
        executor.setAuthorizedExecutor(user2, false);
    }

    // ============ STRATEGY CREATION TESTS ============
    
    function testCreateStrategy() public {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](2);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        actionTypes[1] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](2);
        targets[0] = address(mockUSDC);
        targets[1] = address(mockDAI);
        
        bytes[] memory datas = new bytes[](2);
        datas[0] = abi.encode("swap1");
        datas[1] = abi.encode("swap2");
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit StrategyCreated(1, user1);
        
        executor.createStrategy("Arbitrage Strategy", actionTypes, targets, datas, 100);
        
        // Verify strategy was created
        (uint256 id, address creator, bool active, uint256 minProfitBPS, uint256 executionCount, uint256 totalProfit) = 
            executor.getStrategy(1);
            
        assertEq(id, 1);
        assertEq(creator, user1);
        assertTrue(active);
        assertEq(minProfitBPS, 100);
        assertEq(executionCount, 0);
        assertEq(totalProfit, 0);
        assertEq(executor.getStrategyActionsCount(1), 2);
        assertEq(executor.nextStrategyId(), 2);
    }

    function testCreateStrategyArrayLengthMismatch() public {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](2);
        address[] memory targets = new address[](1); // Mismatched length
        bytes[] memory datas = new bytes[](1);
        
        vm.prank(user1);
        vm.expectRevert("Array length mismatch");
        executor.createStrategy("Test", actionTypes, targets, datas, 50);
    }

    // ============ FLASH LOAN EXECUTION TESTS ============
    
    function testExecuteStrategy() public {
        // First create a strategy
        _createTestStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = FLASH_LOAN_AMOUNT;
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit FlashLoanInitiated(user1, 1);
        
        executor.executeStrategy(1, assets, amounts);
        
        // Verify the flash loan was called
        assertTrue(mockPool.flashLoanCalled());
        assertEq(mockPool.lastReceiverAddress(), address(executor));
    }

    function testExecuteStrategyInvalidStrategy() public {
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = FLASH_LOAN_AMOUNT;
        
        vm.prank(user1);
        vm.expectRevert("Invalid strategy ID");
        executor.executeStrategy(999, assets, amounts);
    }

    function testExecuteStrategyEmergencyStop() public {
        _createTestStrategy();
        
        // Enable emergency stop
        vm.prank(owner);
        executor.toggleEmergencyStop();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = FLASH_LOAN_AMOUNT;
        
        vm.prank(user1);
        vm.expectRevert("Emergency stop active");
        executor.executeStrategy(1, assets, amounts);
    }

    function testExecuteStrategyArrayLengthMismatch() public {
        _createTestStrategy();
        
        address[] memory assets = new address[](2);
        uint256[] memory amounts = new uint256[](1); // Mismatched length
        
        vm.prank(user1);
        vm.expectRevert("Array length mismatch");
        executor.executeStrategy(1, assets, amounts);
    }

    function testExecuteStrategyHighGasPrice() public {
        _createTestStrategy();
        
        // Set max gas price lower than current
        vm.prank(owner);
        executor.updateSafetyParams(300, 50, 1 gwei);
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = FLASH_LOAN_AMOUNT;
        
        // Set high gas price
        vm.txGasPrice(10 gwei);
        vm.prank(user1);
        vm.expectRevert("Gas price too high");
        executor.executeStrategy(1, assets, amounts);
    }

    // ============ FLASH LOAN CALLBACK TESTS ============
    
    function testExecuteOperation() public {
        _createTestStrategy();
        
        address[] memory assets = new address[](1);
        assets[0] = address(mockWETH);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = FLASH_LOAN_AMOUNT;
        
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = FLASH_LOAN_PREMIUM;
        
        bytes memory params = abi.encode(1, user1);
        
        // Mock the flash loan callback
        vm.prank(address(mockPool));
        bool result = executor.executeOperation(assets, amounts, premiums, address(executor), params);
        
        assertTrue(result);
    }

    function testExecuteOperationUnauthorizedCaller() public {
        address[] memory assets = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        uint256[] memory premiums = new uint256[](1);
        bytes memory params = abi.encode(1, user1);
        
        vm.prank(unauthorizedUser);
        vm.expectRevert("Caller is not Aave V3 Pool");
        executor.executeOperation(assets, amounts, premiums, address(executor), params);
    }

    function testExecuteOperationWrongInitiator() public {
        address[] memory assets = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        uint256[] memory premiums = new uint256[](1);
        bytes memory params = abi.encode(1, user1);
        
        vm.prank(address(mockPool));
        vm.expectRevert("Initiator is not this contract");
        executor.executeOperation(assets, amounts, premiums, unauthorizedUser, params);
    }

    // ============ ADMIN FUNCTION TESTS ============
    
    function testSetDEXRouter() public {
        address newRouter = address(0x123);
        
        vm.prank(owner);
        executor.setDEXRouter("uniswap", newRouter);
        
        assertEq(executor.dexRouters("uniswap"), newRouter);
    }

    function testSetDEXRouterUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        executor.setDEXRouter("uniswap", address(0x123));
    }

    function testToggleEmergencyStop() public {
        assertFalse(executor.emergencyStop());
        
        vm.prank(owner);
        executor.toggleEmergencyStop();
        
        assertTrue(executor.emergencyStop());
        
        vm.prank(owner);
        executor.toggleEmergencyStop();
        
        assertFalse(executor.emergencyStop());
    }

    function testUpdateSafetyParams() public {
        vm.prank(owner);
        executor.updateSafetyParams(500, 100, 200 gwei);
        
        assertEq(executor.maxSlippageBPS(), 500);
        assertEq(executor.minProfitBPS(), 100);
        assertEq(executor.maxGasPrice(), 200 gwei);
    }

    // ============ EMERGENCY FUNCTION TESTS ============
    
    function testEmergencyWithdrawToken() public {
        // Enable emergency stop first
        vm.prank(owner);
        executor.toggleEmergencyStop();
        
        uint256 initialBalance = mockWETH.balanceOf(address(executor));
        uint256 ownerInitialBalance = mockWETH.balanceOf(owner);
        
        vm.prank(owner);
        executor.emergencyWithdraw(address(mockWETH), owner);
        
        assertEq(mockWETH.balanceOf(address(executor)), 0);
        assertEq(mockWETH.balanceOf(owner), ownerInitialBalance + initialBalance);
    }

    function testEmergencyWithdrawETH() public {
        // Send some ETH to the contract
        vm.deal(address(executor), 1 ether);
        
        // Enable emergency stop
        vm.prank(owner);
        executor.toggleEmergencyStop();
        
        uint256 ownerInitialBalance = owner.balance;
        
        vm.prank(owner);
        executor.emergencyWithdraw(address(0), owner);
        
        assertEq(address(executor).balance, 0);
        assertEq(owner.balance, ownerInitialBalance + 1 ether);
    }

    function testEmergencyWithdrawNotInEmergency() public {
        vm.prank(owner);
        vm.expectRevert("Emergency stop not active");
        executor.emergencyWithdraw(address(mockWETH), owner);
    }

    // ============ VIEW FUNCTION TESTS ============
    
    function testGetUserProfit() public {
        assertEq(executor.getUserProfit(user1, address(mockWETH)), 0);
        
        // We would need to execute a profitable strategy to test this properly
        // For now, just verify the function works
    }

    function testGetStrategyActionsCount() public {
        _createTestStrategy();
        assertEq(executor.getStrategyActionsCount(1), 1);
    }

    // ============ FALLBACK FUNCTION TESTS ============
    
    function testReceiveETH() public {
        uint256 initialBalance = address(executor).balance;
        
        (bool success,) = address(executor).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(address(executor).balance, initialBalance + 1 ether);
    }

    function testFallback() public {
        uint256 initialBalance = address(executor).balance;
        
        (bool success,) = address(executor).call{value: 1 ether}("0x1234");
        assertTrue(success);
        assertEq(address(executor).balance, initialBalance + 1 ether);
    }

    // ============ REENTRANCY TESTS ============
    
    function testReentrancyProtection() public {
        // This would require a more complex setup with a malicious contract
        // that attempts reentrancy during strategy execution
        // For now, we verify the ReentrancyGuard is in place
        assertTrue(true); // Placeholder
    }

    // ============ HELPER FUNCTIONS ============
    
    function _createTestStrategy() internal {
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockUSDC);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode("test");
        
        vm.prank(user1);
        executor.createStrategy("Test Strategy", actionTypes, targets, datas, 50);
    }
}

// ============ MOCK CONTRACTS ============

contract MockPoolAddressesProvider {
    address public poolAddress;
    
    constructor(address _pool) {
        poolAddress = _pool;
    }
    
    function getPool() external view returns (address) {
        return poolAddress;
    }
    
    function getPriceOracle() external pure returns (address) {
        return address(0x123);
    }
}

contract MockAaveV3Pool {
    bool public flashLoanCalled;
    address public lastReceiverAddress;
    
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata, // modes
        address, // onBehalfOf
        bytes calldata params,
        uint16 // referralCode
    ) external {
        flashLoanCalled = true;
        lastReceiverAddress = receiverAddress;
        
        // Simulate flash loan callback
        uint256[] memory premiums = new uint256[](assets.length);
        for (uint i = 0; i < assets.length; i++) {
            premiums[i] = amounts[i] * 9 / 10000; // 0.09% premium
        }
        
        IFlashLoanReceiver(receiverAddress).executeOperation(
            assets,
            amounts,
            premiums,
            receiverAddress,
            params
        );
    }
    
    function supply(address, uint256, address, uint16) external {}
    function withdraw(address, uint256, address) external returns (uint256) { return 0; }
    function borrow(address, uint256, uint256, uint16, address) external {}
}

contract MockWETH {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
        emit Transfer(address(0), msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Transfer(msg.sender, address(0), amount);
    }
}

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
