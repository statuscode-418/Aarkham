// Helper functions for FlashLoanExecutor contract using viem and wagmi
import { 
  Address, 
  Hash, 
  Hex, 
  formatUnits, 
  parseUnits, 
  encodeFunctionData,
  decodeFunctionResult,
  parseEther,
  formatEther
} from 'viem'
import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt,
  usePublicClient,
  useWalletClient,
  useAccount
} from 'wagmi'
import { ActionType, StrategyType, ExecutionStatus } from '../types/interfaces'

// Contract address (update with your deployed contract address)
export const FLASH_LOAN_EXECUTOR_ADDRESS = '0x...' as Address // Replace with actual address

// Contract ABI for FlashLoanExecutor
export const FLASH_LOAN_EXECUTOR_ABI = [
  // View functions
  {
    name: 'getStrategy',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'active', type: 'bool' },
      { name: 'minProfitBPS', type: 'uint256' },
      { name: 'executionCount', type: 'uint256' },
      { name: 'totalProfit', type: 'uint256' }
    ]
  },
  {
    name: 'getUserProfit',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getStrategyActionsCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getSafetyParams',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'maxSlippageBPS', type: 'uint256' },
          { name: 'deadlineBuffer', type: 'uint256' },
          { name: 'minProfitBPS', type: 'uint256' },
          { name: 'maxGasPrice', type: 'uint256' },
          { name: 'maxExecutionTime', type: 'uint256' },
          { name: 'emergencyStop', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'authorizedExecutors',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'nextStrategyId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'emergencyStop',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  },
  // Write functions
  {
    name: 'createStrategy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'actionTypes', type: 'uint8[]' },
      { name: 'targets', type: 'address[]' },
      { name: 'datas', type: 'bytes[]' },
      { name: 'minProfitBPS_', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'executeStrategy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'strategyId', type: 'uint256' },
      { name: 'assets', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' }
    ],
    outputs: []
  },
  {
    name: 'setDEXRouter',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dexName', type: 'string' },
      { name: 'router', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'setAuthorizedExecutor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'executor', type: 'address' },
      { name: 'isAuthorized', type: 'bool' }
    ],
    outputs: []
  },
  {
    name: 'toggleEmergencyStop',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'updateSafetyParams',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_maxSlippageBPS', type: 'uint256' },
      { name: '_minProfitBPS', type: 'uint256' },
      { name: '_maxGasPrice', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'emergencyWithdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'to', type: 'address' }
    ],
    outputs: []
  },
  // Events
  {
    name: 'FlashLoanInitiated',
    type: 'event',
    inputs: [
      { name: 'initiator', type: 'address', indexed: true },
      { name: 'strategyId', type: 'uint256', indexed: true }
    ]
  },
  {
    name: 'StrategyExecuted',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'executor', type: 'address', indexed: true },
      { name: 'profit', type: 'uint256' }
    ]
  },
  {
    name: 'StrategyCreated',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true }
    ]
  }
] as const

// Types for strategy and action data
export interface StrategyData {
  id: bigint
  creator: Address
  active: boolean
  minProfitBPS: bigint
  executionCount: bigint
  totalProfit: bigint
}

export interface SafetyParams {
  maxSlippageBPS: bigint
  deadlineBuffer: bigint
  minProfitBPS: bigint
  maxGasPrice: bigint
  maxExecutionTime: bigint
  emergencyStop: boolean
}

export interface ActionData {
  actionType: ActionType
  target: Address
  data: Hex
  value: bigint
  critical: boolean
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

// ============ READ HOOKS ============

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
 * Get safety parameters
 */
export function useGetSafetyParams() {
  return useReadContract({
    address: FLASH_LOAN_EXECUTOR_ADDRESS,
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'getSafetyParams'
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

// ============ WRITE HOOKS ============

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
 * Set DEX router address
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
 * Set authorized executor
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
 * Toggle emergency stop
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
 * Update safety parameters
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
 * Emergency withdraw tokens
 */
export function useEmergencyWithdraw() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const emergencyWithdraw = async (tokenAddress: Address, toAddress: Address) => {
    return writeContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'emergencyWithdraw',
      args: [tokenAddress, toAddress]
    })
  }

  return {
    emergencyWithdraw,
    hash,
    error,
    isPending
  }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals)
}

/**
 * Parse token amount to wei
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals)
}

/**
 * Format ETH amount
 */
export function formatEthAmount(amount: bigint): string {
  return formatEther(amount)
}

/**
 * Parse ETH amount
 */
export function parseEthAmount(amount: string): bigint {
  return parseEther(amount)
}

/**
 * Calculate percentage from BPS (Basis Points)
 */
export function bpsToPercentage(bps: bigint): number {
  return Number(bps) / 100
}

/**
 * Convert percentage to BPS
 */
export function percentageToBps(percentage: number): bigint {
  return BigInt(Math.round(percentage * 100))
}

/**
 * Check if strategy is profitable
 */
export function isStrategyProfitable(
  strategyData: StrategyData,
  currentProfit: bigint
): boolean {
  const minProfitThreshold = strategyData.minProfitBPS
  return currentProfit >= minProfitThreshold
}

/**
 * Calculate estimated gas cost
 */
export function calculateEstimatedGasCost(
  gasPrice: bigint,
  gasLimit: bigint
): bigint {
  return gasPrice * gasLimit
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
  // This is a simplified example for Uniswap V2 style swap
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
  if (!strategyData.active) {
    return 'Inactive'
  }
  
  if (strategyData.executionCount === 0n) {
    return 'Ready'
  }
  
  return 'Active'
}

/**
 * Custom hook to wait for transaction and handle success/error
 */
export function useTransactionStatus(hash: Hash | undefined) {
  const result = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash
    }
  })

  return {
    ...result,
    isSuccess: result.status === 'success',
    isError: result.status === 'error'
  }
}

// ============ COMMON TOKEN ADDRESSES ============
export const COMMON_TOKENS = {
  // Polygon Amoy testnet tokens
  WETH: '0x...' as Address, // Replace with actual WETH address
  USDC: '0x...' as Address, // Replace with actual USDC address
  USDT: '0x...' as Address, // Replace with actual USDT address
  DAI: '0x...' as Address,  // Replace with actual DAI address
} as const

// ============ DEX ROUTER ADDRESSES ============
export const DEX_ROUTERS = {
  UNISWAP_V2: '0x...' as Address, // Replace with actual Uniswap V2 router
  UNISWAP_V3: '0x...' as Address, // Replace with actual Uniswap V3 router
  SUSHISWAP: '0x...' as Address,  // Replace with actual SushiSwap router
} as const

export default {
  // Read hooks
  useGetStrategy,
  useGetUserProfit,
  useGetStrategyActionsCount,
  useGetSafetyParams,
  useIsAuthorizedExecutor,
  useGetNextStrategyId,
  useIsEmergencyStop,
  
  // Write hooks
  useCreateStrategy,
  useExecuteStrategy,
  useSetDEXRouter,
  useSetAuthorizedExecutor,
  useToggleEmergencyStop,
  useUpdateSafetyParams,
  useEmergencyWithdraw,
  
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
  DEX_ROUTERS
}