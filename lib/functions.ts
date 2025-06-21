// Smart contract read and write functions for FlashLoanExecutor
import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi'
import { 
  Address, 
  Hash, 
  Hex, 
  encodeFunctionData,
  formatUnits,
  parseUnits,
  formatEther,
  parseEther
} from 'viem'
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from './abi'
import { ActionType, StrategyType, ExecutionStatus } from '../types/interfaces'

// ============ TYPES ============
export { ActionType, StrategyType, ExecutionStatus } from '../types/interfaces'

export enum DEXType {
  UNISWAP_V2 = 0,
  UNISWAP_V3 = 1,
  SUSHISWAP = 2,
  QUICKSWAP = 3,
  BALANCER = 4,
  CURVE = 5,
  PANCAKESWAP = 6,
  CUSTOM = 7
}

export interface StrategyData {
  id: bigint
  creator: Address
  active: boolean
  minProfitBPS: bigint
  executionCount: bigint
  totalProfit: bigint
}

export interface ActionData {
  target: Address
  data: Hex
  value: bigint
  actionType: ActionType
  expectedGasUsage: bigint
  critical: boolean
  description: string
}

export interface CreateStrategyParams {
  name: string
  actionTypes: ActionType[]
  targets: Address[]
  datas: Hex[]
  minProfitBPS: bigint
}

export interface ExecuteStrategyParams {
  strategyId: bigint
  assets: Address[]
  amounts: bigint[]
}

// ============ READ FUNCTIONS ============

/**
 * Get strategy details by ID
 */
export function useGetStrategy(strategyId: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'getStrategy',
    args: [strategyId],
    query: {
      enabled: strategyId > 0n
    }
  })
}

/**
 * Get full strategy details including actions
 */
export function useGetFullStrategy(strategyId: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'strategies',
    args: [strategyId],
    query: {
      enabled: strategyId > 0n
    }
  })
}

/**
 * Get strategy actions by strategy ID and action index
 */
export function useGetStrategyAction(strategyId: bigint, actionIndex: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'strategyActions',
    args: [strategyId, actionIndex],
    query: {
      enabled: strategyId > 0n && actionIndex >= 0n
    }
  })
}

/**
 * Get number of actions in a strategy
 */
export function useGetStrategyActionsCount(strategyId: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'getStrategyActionsCount',
    args: [strategyId],
    query: {
      enabled: strategyId > 0n
    }
  })
}

/**
 * Get user profit for a specific token
 */
export function useGetUserProfit(userAddress: Address, tokenAddress: Address) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'getUserProfit',
    args: [userAddress, tokenAddress],
    query: {
      enabled: !!userAddress && !!tokenAddress
    }
  })
}

/**
 * Get user profits mapping
 */
export function useGetUserProfits(userAddress: Address, tokenAddress: Address) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'userProfits',
    args: [userAddress, tokenAddress],
    query: {
      enabled: !!userAddress && !!tokenAddress
    }
  })
}

/**
 * Check if an address is an authorized executor
 */
export function useIsAuthorizedExecutor(executorAddress: Address) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'authorizedExecutors',
    args: [executorAddress],
    query: {
      enabled: !!executorAddress
    }
  })
}

/**
 * Get DEX router address by name
 */
export function useGetDEXRouter(dexName: string) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'dexRouters',
    args: [dexName],
    query: {
      enabled: !!dexName
    }
  })
}

/**
 * Get next strategy ID
 */
export function useGetNextStrategyId() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'nextStrategyId'
  })
}

/**
 * Check if emergency stop is active
 */
export function useIsEmergencyStop() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'emergencyStop'
  })
}

/**
 * Get max slippage BPS
 */
export function useGetMaxSlippageBPS() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'maxSlippageBPS'
  })
}

/**
 * Get min profit BPS
 */
export function useGetMinProfitBPS() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'minProfitBPS'
  })
}

/**
 * Get max gas price
 */
export function useGetMaxGasPrice() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'maxGasPrice'
  })
}

/**
 * Get Aave pool address
 */
export function useGetAavePool() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'aavePool'
  })
}

/**
 * Get address provider
 */
export function useGetAddressProvider() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'addressProvider'
  })
}

/**
 * Get WETH address
 */
export function useGetWETH() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'weth'
  })
}

/**
 * Get contract owner
 */
export function useGetOwner() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'owner'
  })
}

/**
 * Get all safety parameters combined
 */
export function useGetSafetyParams() {
  const maxSlippageBPS = useGetMaxSlippageBPS()
  const minProfitBPS = useGetMinProfitBPS()
  const maxGasPrice = useGetMaxGasPrice()
  const emergencyStop = useIsEmergencyStop()

  return {
    data: {
      maxSlippageBPS: maxSlippageBPS.data,
      minProfitBPS: minProfitBPS.data,
      maxGasPrice: maxGasPrice.data,
      emergencyStop: emergencyStop.data
    },
    isLoading: maxSlippageBPS.isLoading || minProfitBPS.isLoading || maxGasPrice.isLoading || emergencyStop.isLoading,
    error: maxSlippageBPS.error || minProfitBPS.error || maxGasPrice.error || emergencyStop.error
  }
}

// ============ WRITE FUNCTIONS ============

/**
 * Create a new strategy
 */
export function useCreateStrategy() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const createStrategy = async (params: CreateStrategyParams) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'createStrategy',
      args: [
        params.name,
        params.actionTypes.map(type => Number(type)),
        params.targets,
        params.datas,
        params.minProfitBPS
      ]
    })
  }

  return {
    createStrategy,
    hash,
    error,
    isPending
  }
}

/**
 * Execute a strategy with flash loan
 */
export function useExecuteStrategy() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const executeStrategy = async (params: ExecuteStrategyParams) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'executeStrategy',
      args: [params.strategyId, params.assets, params.amounts]
    })
  }

  return {
    executeStrategy,
    hash,
    error,
    isPending
  }
}

/**
 * Set DEX router address (Owner only)
 */
export function useSetDEXRouter() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const setDEXRouter = async (dexName: string, routerAddress: Address) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'setDEXRouter',
      args: [dexName, routerAddress]
    })
  }

  return {
    setDEXRouter,
    hash,
    error,
    isPending
  }
}

/**
 * Set authorized executor (Owner only)
 */
export function useSetAuthorizedExecutor() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const setAuthorizedExecutor = async (executorAddress: Address, isAuthorized: boolean) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'setAuthorizedExecutor',
      args: [executorAddress, isAuthorized]
    })
  }

  return {
    setAuthorizedExecutor,
    hash,
    error,
    isPending
  }
}

/**
 * Toggle emergency stop (Owner only)
 */
export function useToggleEmergencyStop() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const toggleEmergencyStop = async () => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'toggleEmergencyStop'
    })
  }

  return {
    toggleEmergencyStop,
    hash,
    error,
    isPending
  }
}

/**
 * Update safety parameters (Owner only)
 */
export function useUpdateSafetyParams() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const updateSafetyParams = async (
    maxSlippageBPS: bigint,
    minProfitBPS: bigint,
    maxGasPrice: bigint
  ) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'updateSafetyParams',
      args: [maxSlippageBPS, minProfitBPS, maxGasPrice]
    })
  }

  return {
    updateSafetyParams,
    hash,
    error,
    isPending
  }
}

/**
 * Emergency withdraw tokens (Owner only)
 * Note: Contract function signature is emergencyWithdraw(address token, address to)
 */
export function useEmergencyWithdraw() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const emergencyWithdraw = async (tokenAddress: Address, to: Address) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'emergencyWithdraw',
      args: [tokenAddress, to]
    })
  }

  return {
    emergencyWithdraw,
    hash,
    error,
    isPending
  }
}

/**
 * Transfer ownership (Owner only)
 */
export function useTransferOwnership() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const transferOwnership = async (newOwner: Address) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'transferOwnership',
      args: [newOwner]
    })
  }

  return {
    transferOwnership,
    hash,
    error,
    isPending
  }
}

/**
 * Renounce ownership (Owner only)
 */
export function useRenounceOwnership() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const renounceOwnership = async () => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'renounceOwnership'
    })
  }

  return {
    renounceOwnership,
    hash,
    error,
    isPending
  }
}

// ============ STRATEGY MANAGEMENT FUNCTIONS ============

/**
 * Pause a strategy (Creator or Owner only)
 */
export function usePauseStrategy() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const pauseStrategy = async (strategyId: bigint) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'pauseStrategy',
      args: [strategyId]
    })
  }

  return {
    pauseStrategy,
    hash,
    error,
    isPending
  }
}

/**
 * Resume a paused strategy (Creator or Owner only)
 */
export function useResumeStrategy() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const resumeStrategy = async (strategyId: bigint) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'resumeStrategy',
      args: [strategyId]
    })
  }

  return {
    resumeStrategy,
    hash,
    error,
    isPending
  }
}

/**
 * Update strategy metadata (Creator only)
 */
export function useUpdateStrategy() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const updateStrategy = async (strategyId: bigint, newName: string, newDescription: string) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'updateStrategy',
      args: [strategyId, newName, newDescription]
    })
  }

  return {
    updateStrategy,
    hash,
    error,
    isPending
  }
}

/**
 * Get all actions for a strategy
 */
export function useGetStrategyActions(strategyId: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'getStrategyActions',
    args: [strategyId]
  }) as any // Returns Action[] but typed as any to avoid complex type definitions
}

// ============ PROTOCOL INTEGRATION FUNCTIONS ============

/**
 * Check if Aave flash loan is available for given asset and amount
 */
export function useCheckAaveFlashLoanAvailability(asset: Address, amount: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'checkAaveFlashLoanAvailability',
    args: [asset, amount]
  }) as { data: { available: boolean; fee: bigint } | undefined }
}

/**
 * Calculate Aave flash loan premium for given amount
 */
export function useCalculateAaveFlashLoanPremium(amount: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'calculateAaveFlashLoanPremium',
    args: [amount]
  }) as { data: bigint | undefined }
}

/**
 * Get Uniswap V2 price quote from FlashLoanExecutor contract
 */
export function useGetV2QuoteFromContract(tokenIn: Address, tokenOut: Address, amountIn: bigint) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'getV2Quote',
    args: [tokenIn, tokenOut, amountIn],
    query: {
      enabled: !!tokenIn && !!tokenOut && amountIn > 0n
    }
  }) as { data: bigint | undefined }
}

/**
 * Get Uniswap V3 price quote with fee tier from FlashLoanExecutor contract
 */
export function useGetV3QuoteFromContract(tokenIn: Address, tokenOut: Address, amountIn: bigint, fee: number) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'getV3Quote',
    args: [tokenIn, tokenOut, amountIn, fee],
    query: {
      enabled: !!tokenIn && !!tokenOut && amountIn > 0n
    }
  }) as { data: bigint | undefined }
}

/**
 * Check if strategy is profitable after gas costs
 */
export function useIsProfitableAfterGas(
  expectedProfit: bigint,
  gasEstimate: bigint,
  gasPrice: bigint,
  minProfitRequiredBPS: bigint,
  principalAmount: bigint
) {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'isProfitableAfterGas',
    args: [expectedProfit, gasEstimate, gasPrice, minProfitRequiredBPS, principalAmount]
  }) as { data: boolean | undefined }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals)
}

/**
 * Parse token amount to bigint
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals)
}

/**
 * Format ETH amount
 */
export function formatEthAmount(amount: bigint): string {
  return formatUnits(amount, 18)
}

/**
 * Parse ETH amount to wei
 */
export function parseEthAmount(amount: string): bigint {
  return parseEther(amount)
}

/**
 * Convert basis points to percentage
 */
export function bpsToPercentage(bps: bigint): number {
  return Number(bps) / 100
}

/**
 * Convert percentage to basis points
 */
export function percentageToBps(percentage: number): bigint {
  return BigInt(Math.round(percentage * 100))
}

/**
 * Check if strategy is profitable
 */
export function isStrategyProfitable(strategyData: StrategyData, currentProfit: bigint): boolean {
  return currentProfit >= strategyData.minProfitBPS
}

/**
 * Calculate estimated gas cost
 */
export function calculateEstimatedGasCost(gasLimit: bigint, gasPrice: bigint): bigint {
  return gasLimit * gasPrice
}

/**
 * Generate action data for common DEX operations
 */
export function generateSwapActionData(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  amountOutMin: bigint,
  deadline: bigint
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: 'swapExactTokensForTokens',
        type: 'function',
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'path', type: 'address[]' },
          { name: 'to', type: 'address' },
          { name: 'deadline', type: 'uint256' }
        ]
      }
    ],
    functionName: 'swapExactTokensForTokens',
    args: [amountIn, amountOutMin, [tokenIn, tokenOut], FLASH_LOAN_EXECUTOR_ADDRESS, deadline]
  })
}

/**
 * Validate strategy parameters
 */
export function validateStrategyParams(params: CreateStrategyParams): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!params.name || params.name.trim().length === 0) {
    errors.push('Strategy name is required')
  }

  if (params.actionTypes.length === 0) {
    errors.push('At least one action is required')
  }

  if (params.actionTypes.length !== params.targets.length) {
    errors.push('Action types and targets arrays must have the same length')
  }

  if (params.actionTypes.length !== params.datas.length) {
    errors.push('Action types and data arrays must have the same length')
  }

  if (params.minProfitBPS < 0n) {
    errors.push('Minimum profit BPS must be non-negative')
  }

  if (params.minProfitBPS > 10000n) {
    errors.push('Minimum profit BPS cannot exceed 100% (10000 BPS)')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get strategy status text
 */
export function getStrategyStatusText(strategyData: StrategyData): string {
  if (!strategyData.active) return 'Inactive'
  return 'Active'
}

/**
 * Custom hook to wait for transaction and handle success/error
 */
export function useTransactionStatus(hash: Hash | undefined) {
  const { data, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash
    }
  })

  return {
    receipt: data,
    isSuccess,
    isError,
    error
  }
}

// ============ CONSTANTS ============
export const COMMON_TOKENS = {
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
  USDT: '0x7169D38820DFd117C3fA1f22a697dBA58d90Ba06' as Address,
  WETH: '0x7b79995e5F793A07Bc00C21412E50EcaE098E7F9' as Address,
  DAI: '0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357' as Address,
} as const

export const DEX_ROUTERS = {
  UNISWAP_V2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as Address,
  UNISWAP_V3: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address,
  SUSHISWAP: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as Address,
} as const

// ============ UNISWAP V3 UTILITIES ============

/**
 * Uniswap V3 fee tiers
 */
export const UNISWAP_V3_FEES = {
  LOW: 500,      // 0.05% - for stablecoin pairs
  MEDIUM: 3000,  // 0.3% - most common
  HIGH: 10000,   // 1% - for exotic pairs
  ULTRA_LOW: 100 // 0.01% - for very stable pairs
} as const;

/**
 * Generate V3 swap action data with specific fee tier
 */
export function generateV3SwapActionData(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  amountOutMin: bigint,
  deadline: bigint,
  fee: number = UNISWAP_V3_FEES.MEDIUM
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: 'exactInputSingle',
        type: 'function',
        inputs: [
          {
            name: 'params',
            type: 'tuple',
            components: [
              { name: 'tokenIn', type: 'address' },
              { name: 'tokenOut', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'recipient', type: 'address' },
              { name: 'deadline', type: 'uint256' },
              { name: 'amountIn', type: 'uint256' },
              { name: 'amountOutMinimum', type: 'uint256' },
              { name: 'sqrtPriceLimitX96', type: 'uint160' }
            ]
          }
        ]
      }
    ],
    functionName: 'exactInputSingle',
    args: [{
      tokenIn,
      tokenOut,
      fee,
      recipient: FLASH_LOAN_EXECUTOR_ADDRESS,
      deadline,
      amountIn,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0n
    }]
  })
}

/**
 * Get optimal fee tier for a token pair
 */
export function getOptimalV3Fee(tokenA: Address, tokenB: Address): number {
  // Check if it's a stablecoin pair
  const stablecoins = [
    COMMON_TOKENS.USDC.toLowerCase(),
    COMMON_TOKENS.USDT.toLowerCase(),
    COMMON_TOKENS.DAI.toLowerCase()
  ];
  
  const isStablePair = stablecoins.includes(tokenA.toLowerCase()) && 
                      stablecoins.includes(tokenB.toLowerCase());
  
  if (isStablePair) {
    return UNISWAP_V3_FEES.LOW; // 0.05% for stablecoin pairs
  }
  
  // Check if one token is WETH (common pairs)
  const isCommonPair = tokenA.toLowerCase() === COMMON_TOKENS.WETH.toLowerCase() ||
                       tokenB.toLowerCase() === COMMON_TOKENS.WETH.toLowerCase();
  
  if (isCommonPair) {
    return UNISWAP_V3_FEES.MEDIUM; // 0.3% for ETH pairs
  }
  
  // Default to high fee for exotic pairs
  return UNISWAP_V3_FEES.HIGH; // 1% for exotic pairs
}

/**
 * Create strategy parameters for V2/V3 arbitrage
 */
export function createArbitrageStrategyParams(
  tokenA: Address,
  tokenB: Address,
  amountIn: bigint,
  minProfitBPS: bigint = 50n // 0.5% minimum profit
): CreateStrategyParams {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
  const optimalFee = getOptimalV3Fee(tokenA, tokenB);
  
  // Action 1: Buy tokenB with tokenA on V2
  const buyActionData = generateSwapActionData(
    tokenA,
    tokenB,
    amountIn,
    0n, // Will be calculated dynamically
    deadline
  );
  
  // Action 2: Sell tokenB back to tokenA on V3
  const sellActionData = generateV3SwapActionData(
    tokenB,
    tokenA,
    0n, // Will use output from previous action
    0n, // Will be calculated dynamically
    deadline,
    optimalFee
  );
  
  return {
    name: `V2/V3 Arbitrage: ${getTokenSymbol(tokenA)}/${getTokenSymbol(tokenB)}`,
    actionTypes: [ActionType.SWAP, ActionType.SWAP],
    targets: [DEX_ROUTERS.UNISWAP_V2, DEX_ROUTERS.UNISWAP_V3],
    datas: [buyActionData, sellActionData],
    minProfitBPS
  };
}

/**
 * Get token symbol from address (simplified)
 */
function getTokenSymbol(address: Address): string {
  const symbols: Record<string, string> = {
    [COMMON_TOKENS.USDC]: 'USDC',
    [COMMON_TOKENS.USDT]: 'USDT',
    [COMMON_TOKENS.WETH]: 'WETH',
    [COMMON_TOKENS.DAI]: 'DAI'
  };
  
  return symbols[address] || 'UNKNOWN';
}

/**
 * Calculate expected arbitrage profit
 */
export function calculateArbitrageProfit(
  amountIn: bigint,
  v2Quote: bigint,
  v3Quote: bigint,
  gasCost: bigint = parseEther('0.01') // Estimated gas cost
): {
  profit: bigint;
  profitBPS: bigint;
  profitable: boolean;
} {
  if (v3Quote <= amountIn + gasCost) {
    return {
      profit: 0n,
      profitBPS: 0n,
      profitable: false
    };
  }
  
  const profit = v3Quote - amountIn - gasCost;
  const profitBPS = (profit * 10000n) / amountIn;
  
  return {
    profit,
    profitBPS,
    profitable: profit > 0n && profitBPS >= 50n // At least 0.5% profit
  };
}

/**
 * Hook to get V3 quote with optimal fee (external Uniswap V3 Quoter)
 */
export function useGetV3QuoteExternal(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  fee?: number
) {
  const optimalFee = fee || getOptimalV3Fee(tokenIn, tokenOut);
  
  return useReadContract({
    address: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', // Sepolia V3 Quoter
    abi: [
      {
        name: 'quoteExactInputSingle',
        type: 'function',
        inputs: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        outputs: [
          { name: 'amountOut', type: 'uint256' }
        ]
      }
    ],
    functionName: 'quoteExactInputSingle',
    args: [tokenIn, tokenOut, optimalFee, amountIn, 0n],
    query: {
      enabled: !!tokenIn && !!tokenOut && amountIn > 0n
    }
  });
}

// ============ PROTOCOL-SPECIFIC COMPATIBILITY FUNCTIONS ============

/**
 * Check Aave V3 flash loan availability for an asset (external Aave call)
 */
export function useCheckAaveFlashLoanAvailabilityExternal(asset: Address, amount: bigint) {
  const aavePool = useGetAavePool();
  
  return useReadContract({
    address: aavePool.data as Address,
    abi: [
      {
        name: 'getReserveData',
        type: 'function',
        inputs: [{ name: 'asset', type: 'address' }],
        outputs: [
          { name: 'configuration', type: 'uint256' },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'currentLiquidityRate', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'currentVariableBorrowRate', type: 'uint128' },
          { name: 'currentStableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'id', type: 'uint16' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'stableDebtTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'accruedToTreasury', type: 'uint128' },
          { name: 'unbacked', type: 'uint128' },
          { name: 'isolationModeTotalDebt', type: 'uint128' }
        ]
      }
    ],
    functionName: 'getReserveData',
    args: [asset],
    query: {
      enabled: !!aavePool.data && !!asset
    }
  });
}

/**
 * Get V2 router quote for amount out (external Uniswap V2 Router)
 */
export function useGetV2QuoteExternal(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  routerAddress?: Address
) {
  const router = routerAddress || DEX_ROUTERS.UNISWAP_V2;
  
  return useReadContract({
    address: router,
    abi: [
      {
        name: 'getAmountsOut',
        type: 'function',
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'path', type: 'address[]' }
        ],
        outputs: [
          { name: 'amounts', type: 'uint256[]' }
        ]
      }
    ],
    functionName: 'getAmountsOut',
    args: [amountIn, [tokenIn, tokenOut]],
    query: {
      enabled: !!tokenIn && !!tokenOut && amountIn > 0n
    }
  });
}

/**
 * Estimate flash loan premium for Aave V3
 */
export function calculateAaveFlashLoanPremium(amount: bigint): bigint {
  // Aave V3 flash loan premium is 0.09% (9 basis points)
  return (amount * 9n) / 10000n;
}

/**
 * Check if strategy execution is profitable considering gas costs
 */
export function isProfitableAfterGas(
  expectedProfit: bigint,
  gasEstimate: bigint,
  gasPrice: bigint,
  minProfitBPS: bigint,
  principalAmount: bigint
): boolean {
  const gasCost = gasEstimate * gasPrice;
  const netProfit = expectedProfit - gasCost;
  const minRequiredProfit = (principalAmount * minProfitBPS) / 10000n;
  
  return netProfit >= minRequiredProfit;
}

/**
 * Create cross-protocol arbitrage strategy (V2 → V3 or V3 → V2)
 */
export function createCrossProtocolArbitrageParams(
  tokenA: Address,
  tokenB: Address,
  amountIn: bigint,
  buyProtocol: 'V2' | 'V3',
  sellProtocol: 'V2' | 'V3',
  minProfitBPS: bigint = 50n
): CreateStrategyParams {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
  
  // Determine action data based on protocols
  const buyActionData = buyProtocol === 'V2' 
    ? generateSwapActionData(tokenA, tokenB, amountIn, 0n, deadline)
    : generateV3SwapActionData(tokenA, tokenB, amountIn, 0n, deadline, getOptimalV3Fee(tokenA, tokenB));
  
  const sellActionData = sellProtocol === 'V2'
    ? generateSwapActionData(tokenB, tokenA, 0n, 0n, deadline)
    : generateV3SwapActionData(tokenB, tokenA, 0n, 0n, deadline, getOptimalV3Fee(tokenB, tokenA));
  
  const buyTarget = buyProtocol === 'V2' ? DEX_ROUTERS.UNISWAP_V2 : DEX_ROUTERS.UNISWAP_V3;
  const sellTarget = sellProtocol === 'V2' ? DEX_ROUTERS.UNISWAP_V2 : DEX_ROUTERS.UNISWAP_V3;
  
  return {
    name: `${buyProtocol}→${sellProtocol} Arbitrage: ${getTokenSymbol(tokenA)}/${getTokenSymbol(tokenB)}`,
    actionTypes: [ActionType.SWAP, ActionType.SWAP],
    targets: [buyTarget, sellTarget],
    datas: [buyActionData, sellActionData],
    minProfitBPS
  };
}

/**
 * Validate flash loan parameters for Aave V3 compatibility
 */
export function validateFlashLoanParams(
  assets: Address[],
  amounts: bigint[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (assets.length === 0) {
    errors.push('At least one asset is required');
  }
  
  if (assets.length !== amounts.length) {
    errors.push('Assets and amounts arrays must have the same length');
  }
  
  if (amounts.some(amount => amount <= 0n)) {
    errors.push('All amounts must be greater than zero');
  }
  
  // Check for duplicate assets
  const uniqueAssets = new Set(assets.map(addr => addr.toLowerCase()));
  if (uniqueAssets.size !== assets.length) {
    errors.push('Duplicate assets are not allowed');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format strategy execution result
 */
export function formatStrategyResult(
  strategyId: bigint,
  profit: bigint,
  gasUsed: bigint,
  txHash: string
): {
  strategyId: string;
  profit: string;
  profitETH: string;
  gasUsed: string;
  txHash: string;
  success: boolean;
} {
  return {
    strategyId: strategyId.toString(),
    profit: profit.toString(),
    profitETH: formatEther(profit),
    gasUsed: gasUsed.toString(),
    txHash,
    success: profit > 0n
  };
}

// ============ DEFAULT EXPORT ============
export default {
  // Read hooks
  useGetStrategy,
  useGetFullStrategy,
  useGetStrategyAction,
  useGetStrategyActionsCount,
  useGetStrategyActions,
  useGetUserProfit,
  useGetUserProfits,
  useIsAuthorizedExecutor,
  useGetDEXRouter,
  useGetNextStrategyId,
  useIsEmergencyStop,
  useGetMaxSlippageBPS,
  useGetMinProfitBPS,
  useGetMaxGasPrice,
  useGetAavePool,
  useGetAddressProvider,
  useGetWETH,
  useGetOwner,
  useGetSafetyParams,
  
  // Strategy Management hooks
  usePauseStrategy,
  useResumeStrategy,
  useUpdateStrategy,
  
  // Protocol Integration hooks
  useCheckAaveFlashLoanAvailability,
  useCalculateAaveFlashLoanPremium,
  useGetV2QuoteFromContract,
  useGetV3QuoteFromContract,
  useIsProfitableAfterGas,
  
  // External Protocol hooks
  useCheckAaveFlashLoanAvailabilityExternal,
  useGetV2QuoteExternal,
  useGetV3QuoteExternal,
  
  // Write hooks
  useCreateStrategy,
  useExecuteStrategy,
  useSetDEXRouter,
  useSetAuthorizedExecutor,
  useToggleEmergencyStop,
  useUpdateSafetyParams,
  useEmergencyWithdraw,
  useTransferOwnership,
  useRenounceOwnership,
  
  // Utility functions
  formatTokenAmount,
  parseTokenAmount,
  formatEthAmount,
  parseEthAmount,
  bpsToPercentage,
  percentageToBps,
  isStrategyProfitable,
  calculateEstimatedGasCost,
  generateSwapActionData,
  validateStrategyParams,
  getStrategyStatusText,
  useTransactionStatus,
  
  // Constants
  FLASH_LOAN_EXECUTOR_ADDRESS,
  FLASH_LOAN_EXECUTOR_ABI,
  COMMON_TOKENS,
  DEX_ROUTERS,
  
  // Enums
  ActionType,
  StrategyType,
  DEXType
}