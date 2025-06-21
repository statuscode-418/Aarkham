import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseEventLogs } from 'viem'
import { polygon } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: polygon, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// GET transaction status and details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const resolvedParams = await params
    const txHash = resolvedParams.hash

    if (!txHash || !txHash.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Valid transaction hash is required' },
        { status: 400 }
      )
    }

    // Get transaction details
    const transaction = await publicClient.getTransaction({
      hash: txHash as `0x${string}`
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Get transaction receipt
    let receipt = null
    let status = 'pending'
    let events: any[] = []

    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`
      })

      status = receipt.status === 'success' ? 'success' : 'failed'

      // Parse events if transaction is successful and related to our contract
      if (receipt.status === 'success' && 
          receipt.to?.toLowerCase() === FLASH_LOAN_EXECUTOR_ADDRESS.toLowerCase()) {
        
        try {
          const decodedLogs = parseEventLogs({
            abi: FLASH_LOAN_EXECUTOR_ABI,
            logs: receipt.logs,
            eventName: undefined // Parse all events
          })

          events = decodedLogs.map(log => ({
            eventName: log.eventName,
            args: log.args,
            address: log.address,
            blockNumber: log.blockNumber?.toString(),
            transactionIndex: log.transactionIndex,
            logIndex: log.logIndex
          }))
        } catch (parseError) {
          console.warn('Could not parse event logs:', parseError)
        }
      }
    } catch (receiptError) {
      // Transaction is still pending
      console.log('Transaction still pending:', receiptError)
    }

    // Calculate confirmation count
    let confirmations = 0
    if (receipt) {
      const currentBlock = await publicClient.getBlockNumber()
      confirmations = Number(currentBlock - receipt.blockNumber)
    }

    return NextResponse.json({
      success: true,
      transaction: {
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        value: transaction.value?.toString(),
        gas: transaction.gas?.toString(),
        gasPrice: transaction.gasPrice?.toString(),
        nonce: transaction.nonce,
        blockNumber: transaction.blockNumber?.toString(),
        blockHash: transaction.blockHash,
        transactionIndex: transaction.transactionIndex,
        input: transaction.input
      },
      receipt: receipt ? {
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        blockNumber: receipt.blockNumber?.toString(),
        blockHash: receipt.blockHash,
        transactionIndex: receipt.transactionIndex,
        cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
        logsBloom: receipt.logsBloom
      } : null,
      status,
      confirmations,
      events,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching transaction status:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch transaction status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST endpoint to wait for transaction confirmation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const body = await request.json()
    const resolvedParams = await params
    const txHash = resolvedParams.hash
    const { confirmations = 1, timeout = 60000 } = body // Default: 1 confirmation, 60s timeout

    if (!txHash || !txHash.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Valid transaction hash is required' },
        { status: 400 }
      )
    }

    console.log(`Waiting for ${confirmations} confirmations for tx: ${txHash}`)

    // Wait for transaction receipt with timeout
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      confirmations,
      timeout
    })

    // Parse events
    let events: any[] = []
    let strategyId: string | null = null
    let executionResult: any = null

    if (receipt.status === 'success' && 
        receipt.to?.toLowerCase() === FLASH_LOAN_EXECUTOR_ADDRESS.toLowerCase()) {
      
      try {
        const decodedLogs = parseEventLogs({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          logs: receipt.logs
        })

        events = decodedLogs.map(log => ({
          eventName: log.eventName,
          args: log.args,
          address: log.address,
          blockNumber: log.blockNumber?.toString()
        }))

        // Extract specific event data
        const strategyCreatedEvent = decodedLogs.find(log => log.eventName === 'StrategyCreated')
        if (strategyCreatedEvent) {
          strategyId = strategyCreatedEvent.args.strategyId?.toString()
        }

        const strategyExecutedEvent = decodedLogs.find(log => log.eventName === 'StrategyExecuted')
        if (strategyExecutedEvent) {
          executionResult = {
            strategyId: strategyExecutedEvent.args.strategyId?.toString(),
            executor: strategyExecutedEvent.args.executor,
            profit: strategyExecutedEvent.args.profit?.toString()
          }
        }
      } catch (parseError) {
        console.warn('Could not parse event logs:', parseError)
      }
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
      receipt: {
        hash: receipt.transactionHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber?.toString(),
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      },
      events,
      strategyId,
      executionResult,
      confirmations,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error waiting for transaction confirmation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Transaction confirmation timeout' },
          { status: 408 }
        )
      }
      
      if (error.message.includes('reverted')) {
        return NextResponse.json(
          { error: 'Transaction was reverted' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to confirm transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
