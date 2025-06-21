import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseAbi, parseEventLogs } from 'viem'
import { sepolia } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem clients
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
      strategyParams
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

    // Validate strategy parameters structure
    if (!strategyParams || !strategyParams.name || !strategyParams.actionTypes || 
        !strategyParams.targets || !strategyParams.datas || 
        typeof strategyParams.minProfitBPS === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid strategy parameters' },
        { status: 400 }
      )
    }

    // Additional validation
    const { name, actionTypes, targets, datas, minProfitBPS } = strategyParams

    if (actionTypes.length !== targets.length || actionTypes.length !== datas.length) {
      return NextResponse.json(
        { error: 'Action types, targets, and data arrays must have the same length' },
        { status: 400 }
      )
    }

    if (minProfitBPS < 0 || minProfitBPS > 10000) {
      return NextResponse.json(
        { error: 'Minimum profit BPS must be between 0 and 10000' },
        { status: 400 }
      )
    }

    // Optional: Verify the signed transaction matches expected parameters
    // This adds an extra layer of security
    try {
      // You could decode and verify the transaction here if needed
      console.log('Strategy creation requested by:', userAddress)
      console.log('Strategy name:', name)
    } catch (decodeError) {
      console.warn('Could not decode transaction for verification:', decodeError)
    }

    // Broadcast the signed transaction to the blockchain
    const hash = await publicClient.sendRawTransaction({
      serializedTransaction: signedTransaction as `0x${string}`
    })

    console.log('Strategy creation transaction broadcasted:', hash)

    // Wait for transaction confirmation (optional)
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1
    })

    // Parse logs to get the strategy ID from StrategyCreated event
    let strategyId = null
    try {
      const strategyCreatedEvent = receipt.logs.find(log => 
        log.address.toLowerCase() === FLASH_LOAN_EXECUTOR_ADDRESS.toLowerCase()
      )
      
      if (strategyCreatedEvent) {
        // Decode the StrategyCreated event to get strategy ID
        const decodedLog = parseEventLogs({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          logs: [strategyCreatedEvent]
        })
        
        if (decodedLog[0] && decodedLog[0].eventName === 'StrategyCreated') {
          strategyId = decodedLog[0].args.strategyId
        }
      }
    } catch (parseError) {
      console.warn('Could not parse strategy creation event:', parseError)
    }

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status,
      strategyId: strategyId?.toString(),
      message: 'Strategy created successfully',
      strategy: {
        name,
        creator: userAddress,
        actionCount: actionTypes.length,
        minProfitBPS
      }
    })

  } catch (error) {
    console.error('Error broadcasting strategy creation transaction:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        return NextResponse.json(
          { error: 'Insufficient funds for transaction' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('nonce')) {
        return NextResponse.json(
          { error: 'Invalid transaction nonce' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('gas')) {
        return NextResponse.json(
          { error: 'Gas estimation failed or gas limit too low' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to broadcast transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to provide transaction building information
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/contracts/flash-loan/strategy/create',
    method: 'POST',
    description: 'Broadcast a signed strategy creation transaction',
    contractAddress: FLASH_LOAN_EXECUTOR_ADDRESS,
    requiredFields: {
      signedTransaction: 'string - The signed transaction data',
      userAddress: 'string - Address of the user creating the strategy',
      strategyParams: {
        name: 'string - Strategy name',
        actionTypes: 'number[] - Array of action type enums',
        targets: 'string[] - Array of target contract addresses',
        datas: 'string[] - Array of encoded function call data',
        minProfitBPS: 'number - Minimum profit in basis points'
      }
    },
    example: {
      signedTransaction: '0x...',
      userAddress: '0x...',
      strategyParams: {
        name: 'Arbitrage USDC/WETH',
        actionTypes: [0, 0],
        targets: ['0x...', '0x...'],
        datas: ['0x...', '0x...'],
        minProfitBPS: 100
      }
    }
  })
}
