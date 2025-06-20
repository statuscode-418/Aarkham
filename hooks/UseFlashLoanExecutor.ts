// Custom hooks for flash loan strategy management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Address, Hash, formatUnits } from 'viem'
import { useAccount, usePublicClient, useBlockNumber } from 'wagmi'
import { 
  useGetStrategy,
  useGetUserProfit,
  useGetSafetyParams,
  useIsAuthorizedExecutor,
  useCreateStrategy,
  useExecuteStrategy,
  useTransactionStatus,
  CreateStrategyParams,
  ExecuteStrategyParams,
  StrategyData
} from '../lib/functions'
import {
  validateStrategyExecution,
  calculateStrategyMetrics,
  estimateStrategyGas,
  calculateMaxGasPrice
} from '../lib/advanced-strategies'

// ============ STRATEGY MANAGEMENT HOOKS ============

/**
 * Comprehensive hook for managing a single strategy
 */
export function useFlashLoanStrategy(strategyId: bigint) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  
  // Get strategy data
  const { 
    data: strategyData, 
    isLoading: isLoadingStrategy,
    error: strategyError,
    refetch: refetchStrategy
  } = useGetStrategy(strategyId)

  // Get user profits
  const { 
    data: userProfit,
    isLoading: isLoadingProfit,
    refetch: refetchProfit
  } = useGetUserProfit(address!, '0x...' as Address) // Replace with token address

  // Get safety parameters
  const { 
    data: safetyParams,
    isLoading: isLoadingSafety
  } = useGetSafetyParams()

  // Check authorization
  const { 
    data: isAuthorized,
    isLoading: isLoadingAuth
  } = useIsAuthorizedExecutor(address!)

  const isLoading = isLoadingStrategy || isLoadingProfit || isLoadingSafety || isLoadingAuth

  return {
    strategyData,
    userProfit,
    safetyParams,
    isAuthorized,
    isLoading,
    error: strategyError,
    refetch: () => {
      refetchStrategy()
      refetchProfit()
    }
  }
}

/**
 * Hook for creating strategies with validation
 */
export function useCreateFlashLoanStrategy() {
  const [isValidating, setIsValidating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  const { createStrategy, hash, error, isPending } = useCreateStrategy()
  const { isSuccess, isError } = useTransactionStatus(hash)

  const createStrategyWithValidation = useCallback(async (params: CreateStrategyParams) => {
    setIsValidating(true)
    setValidationErrors([])

    try {
      // Validate parameters
      const validation = validateStrategyParams(params)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        setIsValidating(false)
        return false
      }

      // Create strategy
      await createStrategy(params)
      setIsValidating(false)
      return true
    } catch (err) {
      setValidationErrors([err instanceof Error ? err.message : 'Unknown error'])
      setIsValidating(false)
      return false
    }
  }, [createStrategy])

  return {
    createStrategy: createStrategyWithValidation,
    hash,
    error,
    isPending: isPending || isValidating,
    isSuccess,
    isError,
    validationErrors
  }
}

/**
 * Hook for executing strategies with safety checks
 */
export function useExecuteFlashLoanStrategy() {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    warnings: string[]
    errors: string[]
  } | null>(null)

  const publicClient = usePublicClient()
  const { executeStrategy, hash, error, isPending } = useExecuteStrategy()
  const { isSuccess, isError } = useTransactionStatus(hash)

  const executeStrategyWithChecks = useCallback(async (
    params: ExecuteStrategyParams,
    strategyData: StrategyData,
    safetyParams: any
  ) => {
    setIsValidating(true)
    setValidationResult(null)

    try {
      // Get current gas price
      const gasPrice = await publicClient?.getGasPrice() || 0n

      // Validate execution
      const validation = validateStrategyExecution(strategyData, gasPrice, safetyParams)
      setValidationResult(validation)

      if (!validation.valid) {
        setIsValidating(false)
        return false
      }

      // Execute strategy
      await executeStrategy(params)
      setIsValidating(false)
      return true
    } catch (err) {
      setValidationResult({
        valid: false,
        warnings: [],
        errors: [err instanceof Error ? err.message : 'Unknown error']
      })
      setIsValidating(false)
      return false
    }
  }, [executeStrategy, publicClient])

  return {
    executeStrategy: executeStrategyWithChecks,
    hash,
    error,
    isPending: isPending || isValidating,
    isSuccess,
    isError,
    validationResult
  }
}

// ============ PORTFOLIO MANAGEMENT HOOKS ============

/**
 * Hook for managing user's strategy portfolio
 */
export function useStrategyPortfolio(userAddress: Address) {
  const [strategies, setStrategies] = useState<StrategyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalProfit, setTotalProfit] = useState(0n)

  // This would typically fetch from a subgraph or events
  const fetchUserStrategies = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch user's strategies from events or subgraph
      // This is a simplified example
      const userStrategies: StrategyData[] = []
      setStrategies(userStrategies)
      
      // Calculate total profit
      const total = userStrategies.reduce((sum, strategy) => sum + strategy.totalProfit, 0n)
      setTotalProfit(total)
    } catch (error) {
      console.error('Error fetching user strategies:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userAddress])

  useEffect(() => {
    if (userAddress) {
      fetchUserStrategies()
    }
  }, [userAddress, fetchUserStrategies])

  const refetch = useCallback(() => {
    fetchUserStrategies()
  }, [fetchUserStrategies])

  return {
    strategies,
    totalProfit,
    isLoading,
    refetch
  }
}

// ============ REAL-TIME MONITORING HOOKS ============

/**
 * Hook for monitoring strategy execution opportunities
 */
export function useStrategyMonitoring(strategyId: bigint, enabled: boolean = true) {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  
  const { data: blockNumber } = useBlockNumber({ watch: enabled })
  const { strategyData, safetyParams } = useFlashLoanStrategy(strategyId)

  // Monitor for execution opportunities
  useEffect(() => {
    if (!enabled || !strategyData || !safetyParams) return

    const checkOpportunity = async () => {
      setIsMonitoring(true)
      try {
        // Check if conditions are met for strategy execution
        // This would involve checking DEX prices, gas prices, etc.
        
        // Example opportunity detection logic
        const currentGasPrice = 0n // Get from provider
        const isProfitable = true // Calculate based on current market conditions
        
        if (isProfitable && currentGasPrice <= safetyParams.maxGasPrice) {
          const opportunity = {
            timestamp: Date.now(),
            strategyId,
            estimatedProfit: 0n, // Calculate expected profit
            gasPrice: currentGasPrice,
            confidence: 0.8 // Confidence score
          }
          
          setOpportunities(prev => [opportunity, ...prev.slice(0, 9)]) // Keep last 10
        }
      } catch (error) {
        console.error('Error checking opportunities:', error)
      } finally {
        setIsMonitoring(false)
      }
    }

    checkOpportunity()
  }, [blockNumber, strategyData, safetyParams, enabled, strategyId])

  return {
    opportunities,
    isMonitoring,
    latestOpportunity: opportunities[0] || null
  }
}

/**
 * Hook for tracking gas prices and optimization
 */
export function useGasOptimization() {
  const [gasData, setGasData] = useState({
    current: 0n,
    average: 0n,
    trend: 'stable' as 'rising' | 'falling' | 'stable',
    recommendation: 'wait' as 'execute' | 'wait' | 'urgent'
  })

  const publicClient = usePublicClient()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  useEffect(() => {
    const updateGasData = async () => {
      if (!publicClient) return

      try {
        const currentGasPrice = await publicClient.getGasPrice()
        
        // Update gas data (this would typically use historical data)
        setGasData(prev => ({
          current: currentGasPrice,
          average: prev.average === 0n ? currentGasPrice : (prev.average + currentGasPrice) / 2n,
          trend: currentGasPrice > prev.current ? 'rising' : 
                 currentGasPrice < prev.current ? 'falling' : 'stable',
          recommendation: currentGasPrice < prev.average * 8n / 10n ? 'execute' :
                         currentGasPrice > prev.average * 12n / 10n ? 'wait' : 'urgent'
        }))
      } catch (error) {
        console.error('Error updating gas data:', error)
      }
    }

    updateGasData()
  }, [blockNumber, publicClient])

  return gasData
}

// ============ PERFORMANCE ANALYTICS HOOKS ============

/**
 * Hook for strategy performance analytics
 */
export function useStrategyAnalytics(strategyId: bigint) {
  const [analytics, setAnalytics] = useState({
    totalExecutions: 0,
    successRate: 0,
    averageProfit: 0,
    totalProfit: 0,
    profitability: 0,
    lastExecution: null as any,
    bestExecution: null as any
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch execution history from events or subgraph
      const executionHistory: any[] = [] // This would be populated from actual data
      
      if (executionHistory.length > 0) {
        const totalExecutions = executionHistory.length
        const successfulExecutions = executionHistory.filter(exec => exec.success).length
        const successRate = (successfulExecutions / totalExecutions) * 100
        
        const profits = executionHistory.map(exec => Number(formatUnits(BigInt(exec.profit || 0), 18)))
        const totalProfit = profits.reduce((sum, profit) => sum + profit, 0)
        const averageProfit = totalProfit / totalExecutions
        
        const lastExecution = executionHistory[executionHistory.length - 1]
        const bestExecution = executionHistory.reduce((best, current) => 
          (current.profit || 0) > (best.profit || 0) ? current : best
        )
        
        setAnalytics({
          totalExecutions,
          successRate,
          averageProfit,
          totalProfit,
          profitability: totalProfit > 0 ? (totalProfit / totalExecutions) * 100 : 0,
          lastExecution,
          bestExecution
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [strategyId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    isLoading,
    refetch: fetchAnalytics
  }
}

// ============ UTILITY HOOKS ============

/**
 * Hook for managing strategy favorites
 */
export function useFavoriteStrategies() {
  const [favorites, setFavorites] = useState<bigint[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('favoriteStrategies')
    if (stored) {
      setFavorites(JSON.parse(stored).map((id: string) => BigInt(id)))
    }
  }, [])

  const addFavorite = useCallback((strategyId: bigint) => {
    setFavorites(prev => {
      const updated = [...prev, strategyId]
      localStorage.setItem('favoriteStrategies', JSON.stringify(updated.map(id => id.toString())))
      return updated
    })
  }, [])

  const removeFavorite = useCallback((strategyId: bigint) => {
    setFavorites(prev => {
      const updated = prev.filter(id => id !== strategyId)
      localStorage.setItem('favoriteStrategies', JSON.stringify(updated.map(id => id.toString())))
      return updated
    })
  }, [])

  const isFavorite = useCallback((strategyId: bigint) => {
    return favorites.includes(strategyId)
  }, [favorites])

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite
  }
}

/**
 * Hook for strategy notifications
 */
export function useStrategyNotifications() {
  const [notifications, setNotifications] = useState<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: number
  }[]>([])

  const addNotification = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    const notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      timestamp: Date.now()
    }
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  }
}

// Validation function (referenced in useCreateFlashLoanStrategy)
function validateStrategyParams(params: CreateStrategyParams): { valid: boolean; errors: string[] } {
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