'use client'

// Example React component demonstrating the signed transaction workflow
import React, { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Address } from 'viem'
import { 
  useCreateStrategyTransaction,
  useExecuteStrategyTransaction,
  useAdminTransaction,
  getContractInfo,
  getUserData,
  getStrategies,
  waitForTransactionConfirmation
} from '@/lib/signed-transaction-utils'
import { ActionType } from '@/lib/functions'

interface ContractInfo {
  contract: {
    address: string
    owner: string
    nextStrategyId: string
    emergencyStop: boolean
    aavePool: string
    weth: string
  }
  safetyParams: {
    maxSlippageBPS: string
    minProfitBPS: string
    maxGasPrice: string
  }
  status: string
}

interface UserData {
  userAddress: string
  isAuthorized: boolean
  isOwner: boolean
  userProfit: string | null
  permissions: {
    canCreateStrategies: boolean
    canExecuteStrategies: boolean
    canPerformAdminActions: boolean
  }
}

export default function FlashLoanDashboard() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // State
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [strategies, setStrategies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)

  // Transaction hooks
  const { signAndBroadcast: createStrategy } = useCreateStrategyTransaction()
  const { signAndBroadcast: executeStrategy } = useExecuteStrategyTransaction()
  const { signAndBroadcast: adminAction } = useAdminTransaction()

  // Strategy form state
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    actionTypes: [ActionType.SWAP],
    targets: [''],
    datas: ['0x'],
    minProfitBPS: 100
  })

  // Execute form state
  const [executeForm, setExecuteForm] = useState({
    strategyId: '',
    assets: [''],
    amounts: ['']
  })

  // Load contract and user data
  useEffect(() => {
    loadContractInfo()
  }, [])

  useEffect(() => {
    if (address) {
      loadUserData()
      loadStrategies()
    }
  }, [address])

  const loadContractInfo = async () => {
    try {
      setLoading(true)
      const info = await getContractInfo()
      setContractInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract info')
    } finally {
      setLoading(false)
    }
  }

  const loadUserData = async () => {
    if (!address) return

    try {
      const data = await getUserData(address as Address)
      setUserData(data)
    } catch (err) {
      console.error('Failed to load user data:', err)
    }
  }

  const loadStrategies = async () => {
    try {
      const data = await getStrategies(1, 10)
      setStrategies(data.strategies || [])
    } catch (err) {
      console.error('Failed to load strategies:', err)
    }
  }

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return

    try {
      setLoading(true)
      setError(null)
      setTxStatus('Preparing transaction...')

      const result = await createStrategy({
        name: strategyForm.name,
        actionTypes: strategyForm.actionTypes,
        targets: strategyForm.targets as Address[],
        datas: strategyForm.datas as `0x${string}`[],
        minProfitBPS: BigInt(strategyForm.minProfitBPS)
      })

      setTxStatus(`Transaction sent: ${result.transactionHash}`)

      // Wait for confirmation
      const confirmation = await waitForTransactionConfirmation(result.transactionHash)
      
      if (confirmation.confirmed) {
        setTxStatus(`Strategy created! ID: ${confirmation.strategyId}`)
        // Reset form
        setStrategyForm({
          name: '',
          actionTypes: [ActionType.SWAP],
          targets: [''],
          datas: ['0x'],
          minProfitBPS: 100
        })
        // Reload strategies
        loadStrategies()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create strategy')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return

    try {
      setLoading(true)
      setError(null)
      setTxStatus('Preparing execution...')

      const result = await executeStrategy({
        strategyId: BigInt(executeForm.strategyId),
        assets: executeForm.assets as Address[],
        amounts: executeForm.amounts.map(amount => BigInt(amount))
      })

      setTxStatus(`Execution sent: ${result.transactionHash}`)

      // Wait for confirmation
      const confirmation = await waitForTransactionConfirmation(result.transactionHash)
      
      if (confirmation.confirmed) {
        setTxStatus(`Strategy executed! Profit: ${confirmation.executionResult?.profit || '0'}`)
        // Reload user data
        loadUserData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute strategy')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEmergencyStop = async () => {
    if (!userData?.isOwner) return

    try {
      setLoading(true)
      setError(null)
      setTxStatus('Toggling emergency stop...')

      const result = await adminAction('toggleEmergencyStop', {})
      setTxStatus(`Transaction sent: ${result.transactionHash}`)

      const confirmation = await waitForTransactionConfirmation(result.transactionHash)
      
      if (confirmation.confirmed) {
        setTxStatus('Emergency stop toggled!')
        loadContractInfo() // Reload contract info
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle emergency stop')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
        <div className="max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Flash Loan Executor</h1>
          <p className="text-white/80 mb-6">Connect your wallet to interact with flash loan strategies</p>
          
          <div className="space-y-4">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Flash Loan Executor Dashboard</h1>
              <p className="text-white/80">Connected: {address}</p>
            </div>
            <button
              onClick={() => disconnect()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Status */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {txStatus && (
          <div className="bg-blue-500/20 border border-blue-500 text-blue-100 p-4 rounded-lg mb-6">
            {txStatus}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contract Info */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contract Information</h2>
            {contractInfo ? (
              <div className="space-y-3 text-white/80">
                <div>
                  <span className="font-semibold">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    contractInfo.contract.emergencyStop 
                      ? 'bg-red-500/20 text-red-200' 
                      : 'bg-green-500/20 text-green-200'
                  }`}>
                    {contractInfo.status}
                  </span>
                </div>
                <div><span className="font-semibold">Owner:</span> {contractInfo.contract.owner}</div>
                <div><span className="font-semibold">Next Strategy ID:</span> {contractInfo.contract.nextStrategyId}</div>
                <div><span className="font-semibold">Min Profit BPS:</span> {contractInfo.safetyParams.minProfitBPS}</div>
                <div><span className="font-semibold">Max Slippage BPS:</span> {contractInfo.safetyParams.maxSlippageBPS}</div>
                
                {userData?.isOwner && (
                  <button
                    onClick={handleToggleEmergencyStop}
                    disabled={loading}
                    className="mt-4 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Toggle Emergency Stop
                  </button>
                )}
              </div>
            ) : (
              <div className="text-white/60">Loading contract info...</div>
            )}
          </div>

          {/* User Info */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Your Account</h2>
            {userData ? (
              <div className="space-y-3 text-white/80">
                <div>
                  <span className="font-semibold">Authorized:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    userData.isAuthorized 
                      ? 'bg-green-500/20 text-green-200' 
                      : 'bg-red-500/20 text-red-200'
                  }`}>
                    {userData.isAuthorized ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Owner:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    userData.isOwner 
                      ? 'bg-purple-500/20 text-purple-200' 
                      : 'bg-gray-500/20 text-gray-200'
                  }`}>
                    {userData.isOwner ? 'Yes' : 'No'}
                  </span>
                </div>
                <div><span className="font-semibold">Can Create Strategies:</span> {userData.permissions.canCreateStrategies ? 'Yes' : 'No'}</div>
                <div><span className="font-semibold">Can Execute Strategies:</span> {userData.permissions.canExecuteStrategies ? 'Yes' : 'No'}</div>
                {userData.userProfit && (
                  <div><span className="font-semibold">Total Profit:</span> {userData.userProfit}</div>
                )}
              </div>
            ) : (
              <div className="text-white/60">Loading user data...</div>
            )}
          </div>
        </div>

        {/* Strategy Creation Form */}
        {userData?.permissions.canCreateStrategies && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Create Strategy</h2>
            <form onSubmit={handleCreateStrategy} className="space-y-4">
              <div>
                <label className="block text-white/80 mb-2">Strategy Name</label>
                <input
                  type="text"
                  value={strategyForm.name}
                  onChange={(e) => setStrategyForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
                  placeholder="Enter strategy name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white/80 mb-2">Target Contract</label>
                <input
                  type="text"
                  value={strategyForm.targets[0]}
                  onChange={(e) => setStrategyForm(prev => ({ 
                    ...prev, 
                    targets: [e.target.value] 
                  }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
                  placeholder="0x..."
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Min Profit BPS</label>
                <input
                  type="number"
                  value={strategyForm.minProfitBPS}
                  onChange={(e) => setStrategyForm(prev => ({ 
                    ...prev, 
                    minProfitBPS: parseInt(e.target.value) 
                  }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
                  min="0"
                  max="10000"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Strategy'}
              </button>
            </form>
          </div>
        )}

        {/* Strategy Execution Form */}
        {userData?.permissions.canExecuteStrategies && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Execute Strategy</h2>
            <form onSubmit={handleExecuteStrategy} className="space-y-4">
              <div>
                <label className="block text-white/80 mb-2">Strategy ID</label>
                <input
                  type="number"
                  value={executeForm.strategyId}
                  onChange={(e) => setExecuteForm(prev => ({ ...prev, strategyId: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
                  placeholder="Enter strategy ID"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white/80 mb-2">Asset Address</label>
                <input
                  type="text"
                  value={executeForm.assets[0]}
                  onChange={(e) => setExecuteForm(prev => ({ 
                    ...prev, 
                    assets: [e.target.value] 
                  }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
                  placeholder="0x... (token address)"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Amount (in wei)</label>
                <input
                  type="text"
                  value={executeForm.amounts[0]}
                  onChange={(e) => setExecuteForm(prev => ({ 
                    ...prev, 
                    amounts: [e.target.value] 
                  }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
                  placeholder="Amount in wei"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Executing...' : 'Execute Strategy'}
              </button>
            </form>
          </div>
        )}

        {/* Strategies List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Strategies</h2>
          {strategies.length > 0 ? (
            <div className="space-y-4">
              {strategies.map((strategy) => (
                <div key={strategy.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-semibold">{strategy.name}</h3>
                      <p className="text-white/60 text-sm">ID: {strategy.id}</p>
                      <p className="text-white/60 text-sm">Creator: {strategy.creator}</p>
                      <p className="text-white/60 text-sm">Actions: {strategy.actionCount}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-sm ${
                        strategy.active 
                          ? 'bg-green-500/20 text-green-200' 
                          : 'bg-red-500/20 text-red-200'
                      }`}>
                        {strategy.status}
                      </span>
                      <p className="text-white/60 text-sm mt-1">
                        Executions: {strategy.executionCount}
                      </p>
                      <p className="text-white/60 text-sm">
                        Profit: {strategy.totalProfit}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white/60">No strategies found</div>
          )}
        </div>
      </div>
    </div>
  )
}
