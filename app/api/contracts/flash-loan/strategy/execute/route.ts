import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseEventLogs } from 'viem'
import { sepolia } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: sepolia, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      signedTransaction,
      userAddress,
      executeParams
    } = body

    // Validate required fields
    if (!signedTransaction) {
      return NextResponse.json(
        { error: 'Signed transaction is required' },
        { status: 400 }
      )
    }

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      )
    }

    // Validate execute parameters
    if (!executeParams || typeof executeParams.strategyId === 'undefined' || 
        !executeParams.assets || !executeParams.amounts) {
      return NextResponse.json(
        { error: 'Invalid execute parameters' },
        { status: 400 }
      )
    }

    const { strategyId, assets, amounts } = executeParams

    // Validate arrays match
    if (assets.length !== amounts.length) {
      return NextResponse.json(
        { error: 'Assets and amounts arrays must have the same length' },
        { status: 400 }
      )
    }

    // Validate strategy exists and is active (optional pre-check)
    try {
      const strategy = await publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'getStrategy',
        args: [BigInt(strategyId)]
      })

      if (!strategy || !strategy[2]) { // strategy[2] is the 'active' field
        return NextResponse.json(
          { error: 'Strategy not found or inactive' },
          { status: 400 }
        )
      }
    } catch (strategyError) {
      console.warn('Could not verify strategy before execution:', strategyError)
    }

    // Check if emergency stop is active
    try {
      const emergencyStop = await publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'emergencyStop'
      })

      if (emergencyStop) {
        return NextResponse.json(
          { error: 'Emergency stop is active, strategy execution is disabled' },
          { status: 403 }
        )
      }
    } catch (emergencyError) {
      console.warn('Could not check emergency stop status:', emergencyError)
    }

    console.log('Strategy execution requested by:', userAddress)
    console.log('Strategy ID:', strategyId)
    console.log('Assets:', assets)
    console.log('Amounts:', amounts)

    // Broadcast the signed transaction to the blockchain
    const hash = await publicClient.sendRawTransaction({
      serializedTransaction: signedTransaction as `0x${string}`
    })

    console.log('Strategy execution transaction broadcasted:', hash)

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1
    })

    // Parse logs to get execution results
    let executionResult = null
    let profit = null
    
    try {
      const strategyExecutedEvents = receipt.logs.filter(log => 
        log.address.toLowerCase() === FLASH_LOAN_EXECUTOR_ADDRESS.toLowerCase()
      )
      
      if (strategyExecutedEvents.length > 0) {
        const decodedLogs = parseEventLogs({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          logs: strategyExecutedEvents
        })
        
        const strategyExecutedEvent = decodedLogs.find(log => 
          log.eventName === 'StrategyExecuted'
        )
        
        if (strategyExecutedEvent) {
          profit = strategyExecutedEvent.args.profit?.toString()
          executionResult = {
            strategyId: strategyExecutedEvent.args.strategyId?.toString(),
            executor: strategyExecutedEvent.args.executor,
            profit: profit
          }
        }
      }
    } catch (parseError) {
      console.warn('Could not parse strategy execution events:', parseError)
    }

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status,
      executionResult,
      message: 'Strategy executed successfully',
      execution: {
        strategyId,
        executor: userAddress,
        assetsUsed: assets.length,
        profit: profit || '0'
      }
    })

  } catch (error) {
    console.error('Error broadcasting strategy execution transaction:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        return NextResponse.json(
          { error: 'Insufficient funds for flash loan execution' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('execution reverted')) {
        return NextResponse.json(
          { error: 'Strategy execution failed - transaction reverted' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('gas')) {
        return NextResponse.json(
          { error: 'Gas estimation failed or gas limit too low' },
          { status: 400 }
        )
      }

      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'User not authorized to execute strategies' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to execute strategy', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for execution information
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/contracts/flash-loan/strategy/execute',
    method: 'POST',
    description: 'Broadcast a signed strategy execution transaction',
    contractAddress: FLASH_LOAN_EXECUTOR_ADDRESS,
    requiredFields: {
      signedTransaction: 'string - The signed transaction data',
      userAddress: 'string - Address of the user executing the strategy',
      executeParams: {
        strategyId: 'number - ID of the strategy to execute',
        assets: 'string[] - Array of asset addresses for flash loan',
        amounts: 'string[] - Array of amounts for flash loan (in wei)'
      }
    },
    example: {
      signedTransaction: '0x...',
      userAddress: '0x...',
      executeParams: {
        strategyId: 1,
        assets: ['0x...USDC'],
        amounts: ['1000000000'] // 1000 USDC in wei
      }
    }
  })
}
