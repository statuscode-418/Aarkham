// Additional helper functions for advanced flash loan strategies
import { 
  Address, 
  Hash, 
  Hex, 
  encodeFunctionData,
  parseEther,
  formatUnits,
  parseUnits
} from 'viem'
import { ActionType } from '../types/interfaces'

// ============ STRATEGY TEMPLATES ============

/**
 * Creates an arbitrage strategy between two DEXes
 */
function createArbitrageStrategy(
  tokenA: Address,
  tokenB: Address,
  dexRouter1: Address,
  dexRouter2: Address,
  flashLoanAmount: bigint,
  minProfitBPS: bigint = 100n // 1%
) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800) // 30 minutes

  // Action 1: Swap tokenA to tokenB on DEX 1
  const swapData1 = encodeFunctionData({
    abi: [{
      name: 'swapExactTokensForTokens',
      type: 'function',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' }
      ]
    }],
    functionName: 'swapExactTokensForTokens',
    args: [flashLoanAmount, 0n, [tokenA, tokenB], dexRouter1, deadline]
  })

  // Action 2: Swap tokenB back to tokenA on DEX 2 (to be filled dynamically)
  const swapData2 = encodeFunctionData({
    abi: [{
      name: 'swapExactTokensForTokens',
      type: 'function',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' }
      ]
    }],
    functionName: 'swapExactTokensForTokens',
    args: [0n, 0n, [tokenB, tokenA], dexRouter2, deadline] // amounts will be filled dynamically
  })

  return {
    name: `Arbitrage ${tokenA.slice(0, 6)}.../${tokenB.slice(0, 6)}...`,
    actionTypes: [ActionType.SWAP, ActionType.SWAP],
    targets: [dexRouter1, dexRouter2],
    datas: [swapData1, swapData2],
    minProfitBPS
  }
}

/**
 * Creates a yield farming strategy
 */
function createYieldFarmingStrategy(
  depositToken: Address,
  farmingContract: Address,
  rewardToken: Address,
  swapRouter: Address,
  depositAmount: bigint,
  minProfitBPS: bigint = 50n // 0.5%
) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800)

  // Action 1: Deposit tokens to farm
  const depositData = encodeFunctionData({
    abi: [{
      name: 'deposit',
      type: 'function',
      inputs: [{ name: 'amount', type: 'uint256' }]
    }],
    functionName: 'deposit',
    args: [depositAmount]
  })

  // Action 2: Harvest rewards
  const harvestData = encodeFunctionData({
    abi: [{
      name: 'harvest',
      type: 'function',
      inputs: []
    }],
    functionName: 'harvest',
    args: []
  })

  // Action 3: Swap rewards for original token
  const swapRewardsData = encodeFunctionData({
    abi: [{
      name: 'swapExactTokensForTokens',
      type: 'function',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' }
      ]
    }],
    functionName: 'swapExactTokensForTokens',
    args: [0n, 0n, [rewardToken, depositToken], swapRouter, deadline]
  })

  // Action 4: Withdraw from farm
  const withdrawData = encodeFunctionData({
    abi: [{
      name: 'withdraw',
      type: 'function',
      inputs: [{ name: 'amount', type: 'uint256' }]
    }],
    functionName: 'withdraw',
    args: [depositAmount]
  })

  return {
    name: `Yield Farm ${depositToken.slice(0, 6)}...`,
    actionTypes: [ActionType.STAKE, ActionType.HARVEST, ActionType.SWAP, ActionType.HARVEST],
    targets: [farmingContract, farmingContract, swapRouter, farmingContract],
    datas: [depositData, harvestData, swapRewardsData, withdrawData],
    minProfitBPS
  }
}

/**
 * Creates a liquidation strategy
 */
function createLiquidationStrategy(
  collateralToken: Address,
  debtToken: Address,
  lendingProtocol: Address,
  swapRouter: Address,
  liquidationTarget: Address,
  liquidationAmount: bigint,
  minProfitBPS: bigint = 200n // 2%
) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800)

  // Action 1: Liquidate position
  const liquidateData = encodeFunctionData({
    abi: [{
      name: 'liquidate',
      type: 'function',
      inputs: [
        { name: 'user', type: 'address' },
        { name: 'debtToCover', type: 'uint256' },
        { name: 'collateralAsset', type: 'address' },
        { name: 'receiveAToken', type: 'bool' }
      ]
    }],
    functionName: 'liquidate',
    args: [liquidationTarget, liquidationAmount, collateralToken, false]
  })

  // Action 2: Swap collateral for debt token to repay flash loan
  const swapData = encodeFunctionData({
    abi: [{
      name: 'swapExactTokensForTokens',
      type: 'function',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' }
      ]
    }],
    functionName: 'swapExactTokensForTokens',
    args: [0n, 0n, [collateralToken, debtToken], swapRouter, deadline]
  })

  return {
    name: `Liquidation ${liquidationTarget.slice(0, 6)}...`,
    actionTypes: [ActionType.CUSTOM, ActionType.SWAP],
    targets: [lendingProtocol, swapRouter],
    datas: [liquidateData, swapData],
    minProfitBPS
  }
}

/**
 * Creates a flash loan refinancing strategy
 */
function createRefinancingStrategy(
  debtToken: Address,
  collateralToken: Address,
  oldLendingProtocol: Address,
  newLendingProtocol: Address,
  refinanceAmount: bigint,
  minProfitBPS: bigint = 25n // 0.25%
) {
  // Action 1: Repay debt on old protocol
  const repayData = encodeFunctionData({
    abi: [{
      name: 'repay',
      type: 'function',
      inputs: [
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'rateMode', type: 'uint256' },
        { name: 'onBehalfOf', type: 'address' }
      ]
    }],
    functionName: 'repay',
    args: [debtToken, refinanceAmount, 2n, oldLendingProtocol]
  })

  // Action 2: Withdraw collateral from old protocol
  const withdrawData = encodeFunctionData({
    abi: [{
      name: 'withdraw',
      type: 'function',
      inputs: [
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'to', type: 'address' }
      ]
    }],
    functionName: 'withdraw',
    args: [collateralToken, 0n, newLendingProtocol] // max amount
  })

  // Action 3: Supply collateral to new protocol
  const supplyData = encodeFunctionData({
    abi: [{
      name: 'supply',
      type: 'function',
      inputs: [
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'onBehalfOf', type: 'address' },
        { name: 'referralCode', type: 'uint16' }
      ]
    }],
    functionName: 'supply',
    args: [collateralToken, 0n, newLendingProtocol, 0]
  })

  // Action 4: Borrow from new protocol
  const borrowData = encodeFunctionData({
    abi: [{
      name: 'borrow',
      type: 'function',
      inputs: [
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'interestRateMode', type: 'uint256' },
        { name: 'referralCode', type: 'uint16' },
        { name: 'onBehalfOf', type: 'address' }
      ]
    }],
    functionName: 'borrow',
    args: [debtToken, refinanceAmount, 2n, 0, newLendingProtocol]
  })

  return {
    name: `Refinance ${debtToken.slice(0, 6)}...`,
    actionTypes: [ActionType.CUSTOM, ActionType.CUSTOM, ActionType.LEND, ActionType.BORROW],
    targets: [oldLendingProtocol, oldLendingProtocol, newLendingProtocol, newLendingProtocol],
    datas: [repayData, withdrawData, supplyData, borrowData],
    minProfitBPS
  }
}

// ============ PRICE CALCULATION UTILITIES ============

/**
 * Calculate expected output for Uniswap V2 style swap
 */
function calculateUniswapV2Output(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBPS: bigint = 30n // 0.3% fee
): bigint {
  const amountInWithFee = amountIn * (10000n - feeBPS)
  const numerator = amountInWithFee * reserveOut
  const denominator = (reserveIn * 10000n) + amountInWithFee
  return numerator / denominator
}

/**
 * Calculate price impact for a swap
 */
function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  const spotPrice = Number(reserveOut) / Number(reserveIn)
  const executionPrice = Number(amountOut) / Number(amountIn)
  return ((spotPrice - executionPrice) / spotPrice) * 100
}

/**
 * Calculate slippage protection amount
 */
function calculateMinAmountOut(
  expectedAmount: bigint,
  slippageBPS: bigint
): bigint {
  return expectedAmount * (10000n - slippageBPS) / 10000n
}

// ============ GAS ESTIMATION UTILITIES ============

/**
 * Estimate gas for strategy execution
 */
function estimateStrategyGas(actionCount: number): bigint {
  const baseGas = 200000n // Base gas for flash loan overhead
  const gasPerAction = 150000n // Average gas per action
  return baseGas + (BigInt(actionCount) * gasPerAction)
}

/**
 * Calculate maximum gas price for profitability
 */
function calculateMaxGasPrice(
  expectedProfitWei: bigint,
  estimatedGasUnits: bigint,
  profitMarginBPS: bigint = 1000n // 10% margin
): bigint {
  const maxGasCost = expectedProfitWei * (10000n - profitMarginBPS) / 10000n
  return maxGasCost / estimatedGasUnits
}

// ============ MONITORING AND ANALYTICS ============

/**
 * Calculate strategy performance metrics
 */
function calculateStrategyMetrics(
  totalExecutions: bigint,
  totalProfit: bigint,
  totalGasSpent: bigint,
  averageExecutionTime: number
) {
  const averageProfit = totalExecutions > 0n ? totalProfit / totalExecutions : 0n
  const netProfit = totalProfit - totalGasSpent
  const profitability = totalGasSpent > 0n ? Number(netProfit * 10000n / totalGasSpent) / 100 : 0

  return {
    averageProfit: Number(formatUnits(averageProfit, 18)),
    netProfit: Number(formatUnits(netProfit, 18)),
    profitabilityPercentage: profitability,
    averageExecutionTime,
    successRate: 100, // This would need to be calculated from success/failure data
    roi: totalGasSpent > 0n ? Number(netProfit * 10000n / totalGasSpent) / 100 : 0
  }
}

/**
 * Generate strategy performance report
 */
function generatePerformanceReport(
  strategyId: bigint,
  strategyData: any,
  executionHistory: any[]
) {
  const totalExecutions = BigInt(executionHistory.length)
  const totalProfit = executionHistory.reduce((sum, exec) => sum + BigInt(exec.profit || 0), 0n)
  const totalGasSpent = executionHistory.reduce((sum, exec) => sum + BigInt(exec.gasUsed || 0) * BigInt(exec.gasPrice || 0), 0n)
  const averageExecutionTime = executionHistory.reduce((sum, exec) => sum + (exec.executionTime || 0), 0) / executionHistory.length

  const metrics = calculateStrategyMetrics(totalExecutions, totalProfit, totalGasSpent, averageExecutionTime)

  return {
    strategyId,
    name: strategyData.name,
    creator: strategyData.creator,
    createdAt: strategyData.createdAt,
    totalExecutions: Number(totalExecutions),
    ...metrics,
    lastExecution: executionHistory[executionHistory.length - 1],
    topExecution: executionHistory.reduce((best, current) => 
      (current.profit || 0) > (best.profit || 0) ? current : best, executionHistory[0]
    )
  }
}

// ============ RISK MANAGEMENT UTILITIES ============

/**
 * Validate strategy before execution
 */
function validateStrategyExecution(
  strategyData: any,
  currentGasPrice: bigint,
  safetyParams: any
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = []
  const errors: string[] = []

  // Check if strategy is active
  if (!strategyData.active) {
    errors.push('Strategy is not active')
  }

  // Check gas price
  if (currentGasPrice > safetyParams.maxGasPrice) {
    errors.push(`Gas price ${formatUnits(currentGasPrice, 9)} gwei exceeds maximum ${formatUnits(safetyParams.maxGasPrice, 9)} gwei`)
  }

  // Check emergency stop
  if (safetyParams.emergencyStop) {
    errors.push('Emergency stop is active')
  }

  // Add warnings for high gas prices
  if (currentGasPrice > safetyParams.maxGasPrice * 8n / 10n) {
    warnings.push('Gas price is approaching maximum threshold')
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Calculate maximum safe flash loan amount
 */
function calculateMaxSafeFlashLoanAmount(
  availableLiquidity: bigint,
  utilizationThresholdBPS: bigint = 8000n // 80% max utilization
): bigint {
  return availableLiquidity * utilizationThresholdBPS / 10000n
}

// ============ DEX INTEGRATION HELPERS ============

/**
 * Generate multicall data for batch operations
 */
function generateMulticallData(calls: { target: Address; data: Hex }[]) {
  return calls.map(call => ({
    target: call.target,
    callData: call.data
  }))
}

/**
 * Create approval transaction data
 */
function createApprovalData(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: [{
      name: 'approve',
      type: 'function',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }],
    functionName: 'approve',
    args: [spender, amount]
  })
}

/**
 * Create transfer transaction data
 */
function createTransferData(to: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: [{
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }],
    functionName: 'transfer',
    args: [to, amount]
  })
}

export {
  createArbitrageStrategy,
  createYieldFarmingStrategy,
  createLiquidationStrategy,
  createRefinancingStrategy,
  calculateUniswapV2Output,
  calculatePriceImpact,
  calculateMinAmountOut,
  estimateStrategyGas,
  calculateMaxGasPrice,
  calculateStrategyMetrics,
  generatePerformanceReport,
  validateStrategyExecution,
  calculateMaxSafeFlashLoanAmount,
  generateMulticallData,
  createApprovalData,
  createTransferData
}
