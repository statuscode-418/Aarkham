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
  parseEther,
  formatUnits,
  parseUnits
} from 'viem'
import { FLASH_LOAN_EXECUTOR_ABI, FLASH_LOAN_EXECUTOR_ADDRESS } from './abi'
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
  strategyType: StrategyType
  creator: Address
  active: boolean
  minProfitBPS: bigint
  maxGasPrice: bigint
  deadline: bigint
  name: string
  description: string
  executionCount: bigint
  totalProfit: bigint
  createdAt: bigint
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
  if (Date.now() / 1000 > Number(strategyData.deadline)) return 'Expired'
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
  // Replace with actual token addresses for your network
  WETH: '0x...' as Address,
  USDC: '0x...' as Address,
  USDT: '0x...' as Address,
  DAI: '0x...' as Address,
} as const

export const DEX_ROUTERS = {
  UNISWAP_V2: '0x...' as Address,
  UNISWAP_V3: '0x...' as Address,
  SUSHISWAP: '0x...' as Address,
} as const

// ============ DEFAULT EXPORT ============
export default {
  // Read hooks
  useGetStrategy,
  useGetFullStrategy,
  useGetStrategyAction,
  useGetStrategyActionsCount,
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