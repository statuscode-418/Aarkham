// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/FlashLoanExecutor.sol";
import "../src/interfaces/Interfaces.sol";
import "../src/storage/DataStructures.sol";

/**
 * @title FlashLoanExecutorMock
 * @dev Mock tests for flash loan execution and strategy execution
 */
contract FlashLoanExecutorMock is Test {
    FlashLoanExecutor public executor;
    MockAavePool public mockPool;
    MockERC20 public mockTokenA;
    MockERC20 public mockTokenB;
    MockDEXRouter public mockRouter;
    
    address public owner;
    address public user = address(0x1234);
    
    // Events for testing
    event FlashLoanInitiated(address indexed initiator, uint256 indexed strategyId);
    event StrategyExecuted(uint256 indexed strategyId, address indexed executor, uint256 profit);
    
    function setUp() public {
        owner = address(this);
        
        // Deploy mocks
        mockPool = new MockAavePool();
        mockTokenA = new MockERC20("Token A", "TKNA", 18);
        mockTokenB = new MockERC20("Token B", "TKNB", 18);
        mockRouter = new MockDEXRouter();
        
        // Deploy executor with mock pool as address provider
        executor = new FlashLoanExecutor(address(mockPool), address(mockTokenA));
        
        // Set up DEX router
        executor.setDEXRouter("UNISWAP_V2", address(mockRouter));
        
        // Authorize user
        executor.setAuthorizedExecutor(user, true);
        
        // Mint tokens for testing
        mockTokenA.mint(address(executor), 10000e18);
        mockTokenB.mint(address(executor), 10000e18);
        mockTokenA.mint(address(mockRouter), 10000e18);
        mockTokenB.mint(address(mockRouter), 10000e18);
    }
    
    // ============ FLASH LOAN EXECUTION TESTS ============
    
    function testExecuteOperationValidatesAavePool() public {
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        // Should revert if not called by Aave pool
        vm.expectRevert("Caller is not Aave V3 Pool");
        executor.executeOperation(assets, amounts, premiums, address(executor), params);
    }
    
    function testExecuteOperationValidatesInitiator() public {
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        // Mock the call from Aave pool but with wrong initiator
        vm.prank(address(mockPool));
        vm.expectRevert("Initiator is not this contract");
        executor.executeOperation(assets, amounts, premiums, user, params);
    }
    
    function testSuccessfulFlashLoanExecution() public {
        // Create a simple strategy
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockRouter);
        
        bytes[] memory datas = new bytes[](1);
        // Create swap data that will increase token balance
        datas[0] = abi.encodeWithSelector(
            MockDEXRouter.mockSwap.selector,
            address(mockTokenA),
            address(mockTokenB),
            1000e18
        );
        
        executor.createStrategy("Profit Strategy", actionTypes, targets, datas, 50);
        
        // Set up mock pool to call executeOperation
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        // Mock successful execution
        vm.prank(address(mockPool));
        bool result = executor.executeOperation(assets, amounts, premiums, address(executor), params);
        assertTrue(result);
    }
    
    // ============ STRATEGY EXECUTION INTERNAL TESTS ============
    
    function testStrategyExecutionWithSwapAction() public {
        // Create strategy with swap action
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockRouter);
        
        // Create swap params
        DataStructures.SwapParams memory swapParams = DataStructures.SwapParams({
            dexType: DataStructures.DEXType.UNISWAP_V2,
            tokenIn: address(mockTokenA),
            tokenOut: address(mockTokenB),
            amountIn: 1000e18,
            minAmountOut: 950e18,
            path: new address[](2),
            fee: 0,
            recipient: address(executor),
            deadline: block.timestamp + 3600,
            extraData: ""
        });
        swapParams.path[0] = address(mockTokenA);
        swapParams.path[1] = address(mockTokenB);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(swapParams);
        
        executor.createStrategy("Swap Strategy", actionTypes, targets, datas, 50);
        
        // Execute strategy through flash loan
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        vm.prank(address(mockPool));
        bool result = executor.executeOperation(assets, amounts, premiums, address(executor), params);
        assertTrue(result);
    }
    
    function testStrategyExecutionWithGenericAction() public {
        // Create strategy with generic action
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockRouter);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(MockDEXRouter.mockGenericAction.selector);
        
        executor.createStrategy("Generic Strategy", actionTypes, targets, datas, 50);
        
        // Execute strategy
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        vm.prank(address(mockPool));
        bool result = executor.executeOperation(assets, amounts, premiums, address(executor), params);
        assertTrue(result);
    }
    
    function testStrategyExecutionWithFailingAction() public {
        // Create strategy with failing action (critical = true)
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.CUSTOM;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockRouter);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(MockDEXRouter.mockFailingAction.selector);
        
        executor.createStrategy("Failing Strategy", actionTypes, targets, datas, 50);
        
        // Execute strategy - should revert due to failing action
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        vm.prank(address(mockPool));
        vm.expectRevert("Action failed");
        executor.executeOperation(assets, amounts, premiums, address(executor), params);
    }
    
    // ============ PROFIT CALCULATION TESTS ============
    
    function testProfitCalculationAndDistribution() public {
        // Create profitable strategy
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockRouter);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(
            MockDEXRouter.mockProfitableSwap.selector,
            address(mockTokenA),
            1000e18,
            100e18 // 100 token profit
        );
        
        executor.createStrategy("Profitable Strategy", actionTypes, targets, datas, 50);
        
        uint256 userProfitBefore = executor.getUserProfit(user, address(mockTokenA));
        
        // Execute strategy
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        vm.prank(address(mockPool));
        executor.executeOperation(assets, amounts, premiums, address(executor), params);
        
        uint256 userProfitAfter = executor.getUserProfit(user, address(mockTokenA));
        assertTrue(userProfitAfter > userProfitBefore);
    }
    
    // ============ INTEGRATION WITH STRATEGY COUNTER ============
    
    function testStrategyExecutionCounterAndTotalProfit() public {
        // Create strategy
        DataStructures.ActionType[] memory actionTypes = new DataStructures.ActionType[](1);
        actionTypes[0] = DataStructures.ActionType.SWAP;
        
        address[] memory targets = new address[](1);
        targets[0] = address(mockRouter);
        
        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(
            MockDEXRouter.mockProfitableSwap.selector,
            address(mockTokenA),
            1000e18,
            50e18
        );
        
        executor.createStrategy("Counter Strategy", actionTypes, targets, datas, 25);
        
        // Check initial counters
        (,,,, uint256 executionCountBefore, uint256 totalProfitBefore) = executor.getStrategy(1);
        assertEq(executionCountBefore, 0);
        assertEq(totalProfitBefore, 0);
        
        // Execute strategy
        address[] memory assets = new address[](1);
        assets[0] = address(mockTokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000e18;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = 10e18;
        
        bytes memory params = abi.encode(uint256(1), user);
        
        vm.prank(address(mockPool));
        executor.executeOperation(assets, amounts, premiums, address(executor), params);
        
        // Check updated counters
        (,,,, uint256 executionCountAfter, uint256 totalProfitAfter) = executor.getStrategy(1);
        assertEq(executionCountAfter, 1);
        assertTrue(totalProfitAfter > 0);
    }
}

// ============ MOCK CONTRACTS ============

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
        uint256[] memory premiums = new uint256[](amounts.length);
        for (uint i = 0; i < amounts.length; i++) {
            premiums[i] = amounts[i] / 100; // 1% premium
        }
        
        IFlashLoanReceiver(receiverAddress).executeOperation(
            assets,
            amounts,
            premiums,
            onBehalfOf,
            params
        );
    }
    
    function getPool() external view returns (address) {
        return address(this);
    }
}

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
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
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

contract MockDEXRouter {
    function mockSwap(address tokenIn, address tokenOut, uint256 amountIn) external {
        // Simple mock swap - just transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountIn);
    }
    
    function mockProfitableSwap(address token, uint256 amountIn, uint256 profit) external {
        // Mock profitable swap - returns more tokens than input
        IERC20(token).transfer(msg.sender, amountIn + profit);
    }
    
    function mockGenericAction() external pure {
        // Mock generic action that succeeds
    }
    
    function mockFailingAction() external pure {
        revert("Mock action failed");
    }
    
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(deadline >= block.timestamp, "Deadline expired");
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        amounts[amounts.length - 1] = amountIn; // 1:1 swap for simplicity
        
        // Simple mock swap
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[path.length - 1]).transfer(to, amountIn);
    }
}
