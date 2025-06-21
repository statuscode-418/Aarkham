// Flash Loan Executor Types
import { Address } from 'viem'

export enum ActionType { SWAP = 0, STAKE = 1, HARVEST = 2, LEND = 3, BORROW = 4, CUSTOM = 5 }
export enum StrategyType { ARBITRAGE = 0, YIELD_FARMING = 1, LIQUIDATION = 2, REFINANCING = 3, CUSTOM = 4, FLASH_LOAN = 5 }
export enum ExecutionStatus { PENDING = 0, EXECUTING = 1, COMPLETED = 2, FAILED = 3, CANCELLED = 4, EXPIRED = 5 }

export interface Strategy {
  id: string
  creator: Address
  active: boolean
  minProfitBPS: string
  executionCount: string
  totalProfit: string
  name: string
  description?: string
  strategyType: StrategyType
  maxGasPrice: string
  deadline: string
  createdAt: string
  actions: StrategyAction[]
  actionCount: number
}

export interface StrategyAction {
  actionType: ActionType
  target: Address
  data: `0x${string}`
}

export interface SafetyParams {
  maxSlippageBPS: string
  minProfitBPS: string
  maxGasPrice: string
}

export interface ContractInfo {
  address: Address
  owner: Address
  nextStrategyId: string
  emergencyStop: boolean
  aavePool: Address
  weth: Address
  safetyParams: SafetyParams
}

export interface UserData {
  userAddress: Address
  isAuthorized: boolean
  isOwner: boolean
  userProfit?: string
  permissions: {
    canCreateStrategies: boolean
    canExecuteStrategies: boolean
    canPerformAdminActions: boolean
  }
}

export interface TransactionResult {
  transactionHash: `0x${string}`
  confirmed: boolean
  blockNumber?: string
  gasUsed?: string
  strategyId?: string
  executionResult?: {
    strategyId: string
    executor: Address
    profit: string
  }
  events?: Array<{
    eventName: string
    args: any
    address: Address
    blockNumber?: string
  }>
}

export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  details?: string
  data?: T
}
