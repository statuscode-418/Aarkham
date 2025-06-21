// Client-side utilities for signed transaction workflow with FlashLoanExecutor
import { 
  Address, 
  Hex, 
  encodeFunctionData,
  parseEther,
  formatEther,
  createWalletClient,
  custom
} from 'viem'
import { 
  useAccount, 
  useWalletClient, 
  usePublicClient
} from 'wagmi'
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from './abi'
import { 
  ActionType, 
  CreateStrategyParams, 
  ExecuteStrategyParams 
} from './functions'

// ============ TYPES ============
export interface SignedTransactionResult {
  signedTransaction: Hex
  transactionHash: Hex
  userAddress: Address
}

export interface TransactionRequest {
  to: Address
  data: Hex
  value?: bigint
  gasLimit?: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  details?: string
  data?: T
}

// ============ TRANSACTION BUILDERS ============

/**
 * Build transaction for creating a strategy
 */
export function buildCreateStrategyTransaction(params: CreateStrategyParams): TransactionRequest {
  const data = encodeFunctionData({
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

  return {
    to: FLASH_LOAN_EXECUTOR_ADDRESS,
    data,
    value: 0n
  }
}

/**
 * Build transaction for executing a strategy
 */
export function buildExecuteStrategyTransaction(params: ExecuteStrategyParams): TransactionRequest {
  const data = encodeFunctionData({
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'executeStrategy',
    args: [params.strategyId, params.assets, params.amounts]
  })

  return {
    to: FLASH_LOAN_EXECUTOR_ADDRESS,
    data,
    value: 0n
  }
}

/**
 * Build transaction for setting DEX router (Admin only)
 */
export function buildSetDEXRouterTransaction(dexName: string, routerAddress: Address): TransactionRequest {
  const data = encodeFunctionData({
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'setDEXRouter',
    args: [dexName, routerAddress]
  })

  return {
    to: FLASH_LOAN_EXECUTOR_ADDRESS,
    data,
    value: 0n
  }
}

/**
 * Build transaction for setting authorized executor (Admin only)
 */
export function buildSetAuthorizedExecutorTransaction(
  executorAddress: Address, 
  isAuthorized: boolean
): TransactionRequest {
  const data = encodeFunctionData({
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'setAuthorizedExecutor',
    args: [executorAddress, isAuthorized]
  })

  return {
    to: FLASH_LOAN_EXECUTOR_ADDRESS,
    data,
    value: 0n
  }
}

/**
 * Build transaction for updating safety parameters (Admin only)
 */
export function buildUpdateSafetyParamsTransaction(
  maxSlippageBPS: bigint,
  minProfitBPS: bigint,
  maxGasPrice: bigint
): TransactionRequest {
  const data = encodeFunctionData({
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'updateSafetyParams',
    args: [maxSlippageBPS, minProfitBPS, maxGasPrice]
  })

  return {
    to: FLASH_LOAN_EXECUTOR_ADDRESS,
    data,
    value: 0n
  }
}

/**
 * Build transaction for toggling emergency stop (Admin only)
 */
export function buildToggleEmergencyStopTransaction(): TransactionRequest {
  const data = encodeFunctionData({
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'toggleEmergencyStop',
    args: []
  })

  return {
    to: FLASH_LOAN_EXECUTOR_ADDRESS,
    data,
    value: 0n
  }
}

/**
 * Build transaction for emergency withdraw (Admin only)
 */
export function buildEmergencyWithdrawTransaction(tokenAddress: Address, to: Address): TransactionRequest {
  const data = encodeFunctionData({
    abi: FLASH_LOAN_EXECUTOR_ABI,
    functionName: 'emergencyWithdraw',
    args: [tokenAddress, to]
  })

  return {
    to: FLASH_LOAN_EXECUTOR_ADDRESS,
    data,
    value: 0n
  }
}

// ============ GAS ESTIMATION ============

/**
 * Estimate gas for a transaction via API
 */
export async function estimateGasViaAPI(
  operation: string,
  userAddress: Address,
  params: any
): Promise<{
  gasEstimate: bigint
  gasPrice: bigint
  estimatedCost: bigint
  recommendation: {
    gasLimit: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
  }
}> {
  const response = await fetch('/api/contracts/flash-loan/gas-estimate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operation,
      userAddress,
      params
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Gas estimation failed')
  }

  const result = await response.json()
  
  return {
    gasEstimate: BigInt(result.gasEstimate),
    gasPrice: BigInt(result.gasPrice),
    estimatedCost: BigInt(result.estimatedCost),
    recommendation: {
      gasLimit: BigInt(result.recommendation.gasLimit),
      maxFeePerGas: BigInt(result.recommendation.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(result.recommendation.maxPriorityFeePerGas)
    }
  }
}

// ============ TRANSACTION SIGNING HOOKS ============

/**
 * Hook for signing and broadcasting create strategy transaction
 */
export function useCreateStrategyTransaction() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  const signAndBroadcast = async (params: CreateStrategyParams) => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected')
    }

    // Build transaction
    const txRequest = buildCreateStrategyTransaction(params)

    // Estimate gas
    const gasEstimate = await estimateGasViaAPI('createStrategy', address, params)

    // Prepare transaction with gas estimates
    const { gasPrice, ...restTx } = txRequest
    const preparedTx = {
      ...restTx,
      account: address,
      gasLimit: gasEstimate.recommendation.gasLimit,
      maxFeePerGas: gasEstimate.recommendation.maxFeePerGas,
      maxPriorityFeePerGas: gasEstimate.recommendation.maxPriorityFeePerGas
    }

    // Sign transaction
    const signedTx = await walletClient.signTransaction(preparedTx)

    // Broadcast via API
    const response = await fetch('/api/contracts/flash-loan/strategy/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signedTransaction: signedTx,
        userAddress: address,
        strategyParams: params
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Transaction broadcast failed')
    }

    return response.json()
  }

  return { signAndBroadcast }
}

/**
 * Hook for signing and broadcasting execute strategy transaction
 */
export function useExecuteStrategyTransaction() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  const signAndBroadcast = async (params: ExecuteStrategyParams) => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected')
    }

    // Build transaction
    const txRequest = buildExecuteStrategyTransaction(params)

    // Estimate gas
    const gasEstimate = await estimateGasViaAPI('executeStrategy', address, params)

    // Prepare transaction with gas estimates
    const { gasPrice, ...restTx } = txRequest
    const preparedTx = {
      ...restTx,
      account: address,
      gasLimit: gasEstimate.recommendation.gasLimit,
      maxFeePerGas: gasEstimate.recommendation.maxFeePerGas,
      maxPriorityFeePerGas: gasEstimate.recommendation.maxPriorityFeePerGas
    }

    // Sign transaction
    const signedTx = await walletClient.signTransaction(preparedTx)

    // Broadcast via API
    const response = await fetch('/api/contracts/flash-loan/strategy/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signedTransaction: signedTx,
        userAddress: address,
        executeParams: params
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Transaction broadcast failed')
    }

    return response.json()
  }

  return { signAndBroadcast }
}

/**
 * Hook for signing and broadcasting admin transactions
 */
export function useAdminTransaction() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  const signAndBroadcast = async (actionType: string, params: any) => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected')
    }

    // Build transaction based on action type
    let txRequest: TransactionRequest

    switch (actionType) {
      case 'setDEXRouter':
        txRequest = buildSetDEXRouterTransaction(params.dexName, params.routerAddress)
        break
      case 'setAuthorizedExecutor':
        txRequest = buildSetAuthorizedExecutorTransaction(params.executorAddress, params.isAuthorized)
        break
      case 'updateSafetyParams':
        txRequest = buildUpdateSafetyParamsTransaction(
          BigInt(params.maxSlippageBPS),
          BigInt(params.minProfitBPS),
          BigInt(params.maxGasPrice)
        )
        break
      case 'toggleEmergencyStop':
        txRequest = buildToggleEmergencyStopTransaction()
        break
      case 'emergencyWithdraw':
        txRequest = buildEmergencyWithdrawTransaction(params.tokenAddress, params.to)
        break
      default:
        throw new Error('Unsupported admin action type')
    }

    // Estimate gas
    const gasEstimate = await estimateGasViaAPI(actionType, address, params)

    // Prepare transaction with gas estimates
    const { gasPrice, ...restTx } = txRequest
    const preparedTx = {
      ...restTx,
      account: address,
      gasLimit: gasEstimate.recommendation.gasLimit,
      maxFeePerGas: gasEstimate.recommendation.maxFeePerGas,
      maxPriorityFeePerGas: gasEstimate.recommendation.maxPriorityFeePerGas
    }

    // Sign transaction
    const signedTx = await walletClient.signTransaction(preparedTx)

    // Broadcast via API
    const response = await fetch('/api/contracts/flash-loan/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signedTransaction: signedTx,
        userAddress: address,
        adminAction: {
          type: actionType,
          params
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Admin transaction broadcast failed')
    }

    return response.json()
  }

  return { signAndBroadcast }
}

// ============ TRANSACTION STATUS TRACKING ============

/**
 * Poll transaction status until confirmed
 */
export async function waitForTransactionConfirmation(
  txHash: Hex,
  confirmations: number = 1,
  timeout: number = 60000
): Promise<any> {
  const response = await fetch(`/api/contracts/flash-loan/transaction/${txHash}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      confirmations,
      timeout
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Transaction confirmation failed')
  }

  return response.json()
}

/**
 * Get current transaction status
 */
export async function getTransactionStatus(txHash: Hex): Promise<any> {
  const response = await fetch(`/api/contracts/flash-loan/transaction/${txHash}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get transaction status')
  }

  return response.json()
}

// ============ CONTRACT DATA FETCHING ============

/**
 * Get contract information and safety parameters
 */
export async function getContractInfo(): Promise<any> {
  const response = await fetch('/api/contracts/flash-loan/info')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get contract info')
  }

  return response.json()
}

/**
 * Get user authorization and profit data
 */
export async function getUserData(userAddress: Address, tokenAddress?: Address): Promise<any> {
  const response = await fetch('/api/contracts/flash-loan/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userAddress,
      tokenAddress
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get user data')
  }

  return response.json()
}

/**
 * Get strategy by ID
 */
export async function getStrategy(strategyId: string): Promise<any> {
  const response = await fetch(`/api/contracts/flash-loan/strategy/${strategyId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get strategy')
  }

  return response.json()
}

/**
 * Get list of strategies with pagination
 */
export async function getStrategies(
  page: number = 1,
  limit: number = 10,
  creator?: Address,
  activeOnly?: boolean
): Promise<any> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  })

  if (creator) params.append('creator', creator)
  if (activeOnly !== undefined) params.append('active', activeOnly.toString())

  const response = await fetch(`/api/contracts/flash-loan/strategies?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get strategies')
  }

  return response.json()
}

