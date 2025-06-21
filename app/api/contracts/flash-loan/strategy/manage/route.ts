import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress, parseEventLogs } from 'viem'
import { sepolia } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: sepolia, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// POST endpoint for strategy management operations (pause, resume, update)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      signedTransaction,
      userAddress,
      strategyId,
      action, // 'pause', 'resume', 'update'
      updateData // For update action: { name, description }
    } = body

    // Validate required fields
    if (!signedTransaction) {
      return NextResponse.json(
        { error: 'Signed transaction is required' },
        { status: 400 }
      )
    }

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Valid user address is required' },
        { status: 400 }
      )
    }

    if (!strategyId || isNaN(Number(strategyId))) {
      return NextResponse.json(
        { error: 'Valid strategy ID is required' },
        { status: 400 }
      )
    }

    if (!action || !['pause', 'resume', 'update'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be pause, resume, or update' },
        { status: 400 }
      )
    }

    // Verify strategy exists and user has permission
    try {
      const strategy = await publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'getStrategy',
        args: [BigInt(strategyId)]
      })

      const owner = await publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'owner'
      })

      // Check if user is strategy creator or contract owner
      if (strategy[1].toLowerCase() !== userAddress.toLowerCase() && 
          owner.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Only strategy creator or contract owner can manage strategy' },
          { status: 403 }
        )
      }

      // For update action, validate update data
      if (action === 'update') {
        if (!updateData || !updateData.name || !updateData.description) {
          return NextResponse.json(
            { error: 'Update action requires name and description' },
            { status: 400 }
          )
        }
      }

    } catch (error) {
      return NextResponse.json(
        { error: 'Strategy not found or invalid' },
        { status: 404 }
      )
    }

    // Send the transaction
    const txHash = await publicClient.sendRawTransaction({
      serializedTransaction: signedTransaction as `0x${string}`
    })

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60000 // 60 seconds timeout
    })

    if (receipt.status === 'reverted') {
      return NextResponse.json(
        { error: 'Transaction was reverted', txHash },
        { status: 400 }
      )
    }

    // Parse logs to get the specific event
    let eventResult = null
    try {
      const logs = parseEventLogs({
        abi: FLASH_LOAN_EXECUTOR_ABI,
        logs: receipt.logs.filter(log => 
          log.address.toLowerCase() === FLASH_LOAN_EXECUTOR_ADDRESS.toLowerCase()
        )
      })

      switch (action) {
        case 'pause':
          const pauseEvent = logs.find(log => log.eventName === 'StrategyPaused')
          if (pauseEvent) {
            eventResult = {
              event: 'StrategyPaused',
              strategyId: pauseEvent.args.strategyId?.toString(),
              pausedBy: pauseEvent.args.pausedBy
            }
          }
          break
          
        case 'resume':
          const resumeEvent = logs.find(log => log.eventName === 'StrategyResumed')
          if (resumeEvent) {
            eventResult = {
              event: 'StrategyResumed',
              strategyId: resumeEvent.args.strategyId?.toString(),
              resumedBy: resumeEvent.args.resumedBy
            }
          }
          break
          
        case 'update':
          const updateEvent = logs.find(log => log.eventName === 'StrategyUpdated')
          if (updateEvent) {
            eventResult = {
              event: 'StrategyUpdated',
              strategyId: updateEvent.args.strategyId?.toString(),
              newName: updateEvent.args.newName,
              newDescription: updateEvent.args.newDescription
            }
          }
          break
      }
    } catch (parseError) {
      console.warn('Could not parse event logs:', parseError)
    }

    return NextResponse.json({
      success: true,
      action,
      strategyId,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      eventResult,
      status: receipt.status
    })

  } catch (error) {
    console.error('Strategy management error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process strategy management', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint for strategy management information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId')

    if (!strategyId || isNaN(Number(strategyId))) {
      return NextResponse.json({
        endpoint: '/api/contracts/flash-loan/strategy/manage',
        description: 'Strategy management operations (pause, resume, update)',
        methods: {
          POST: {
            description: 'Execute strategy management operation',
            requiredFields: ['signedTransaction', 'userAddress', 'strategyId', 'action'],
            actions: ['pause', 'resume', 'update'],
            permissions: 'Strategy creator or contract owner only'
          },
          GET: {
            description: 'Get strategy management info',
            queryParams: ['strategyId']
          }
        },
        example: {
          action: 'pause',
          userAddress: '0x...',
          strategyId: '1',
          signedTransaction: '0x...'
        }
      })
    }

    // Get strategy details for management info
    const [strategy, actions, owner] = await Promise.all([
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'getStrategy',
        args: [BigInt(strategyId)]
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'getStrategyActions',
        args: [BigInt(strategyId)]
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'owner'
      })
    ])

    return NextResponse.json({
      success: true,
      strategyId,
      strategy: {
        id: strategy[0]?.toString(),
        creator: strategy[1],
        active: strategy[2],
        minProfitBPS: strategy[3]?.toString(),
        executionCount: strategy[4]?.toString(),
        totalProfit: strategy[5]?.toString()
      },
      actionCount: actions?.length || 0,
      contractOwner: owner,
      managementOptions: {
        canPause: strategy[2], // Can only pause if active
        canResume: !strategy[2], // Can only resume if paused
        canUpdate: true, // Can always update metadata
        permissions: 'Strategy creator or contract owner only'
      }
    })

  } catch (error) {
    console.error('Error fetching strategy management info:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch strategy management info', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
