import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { polygon } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: polygon, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// GET strategy by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const strategyId = resolvedParams.id

    if (!strategyId || isNaN(Number(strategyId))) {
      return NextResponse.json(
        { error: 'Valid strategy ID is required' },
        { status: 400 }
      )
    }

    // Get basic strategy info
    const strategy = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'getStrategy',
      args: [BigInt(strategyId)]
    })

    if (!strategy || !strategy[1] || strategy[1] === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Get full strategy details
    const fullStrategy = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'strategies',
      args: [BigInt(strategyId)]
    })

    // Get number of actions
    const actionCount = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'getStrategyActionsCount',
      args: [BigInt(strategyId)]
    })

    // Get all actions for this strategy
    const actions = []
    for (let i = 0; i < Number(actionCount); i++) {
      try {
        const action = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'strategyActions',
          args: [BigInt(strategyId), BigInt(i)]
        })
        actions.push({
          index: i,
          target: action[0],
          data: action[1],
          value: action[2]?.toString(),
          actionType: action[3],
          expectedGasUsage: action[4]?.toString(),
          critical: action[5],
          description: action[6]
        })
      } catch (actionError) {
        console.warn(`Could not fetch action ${i}:`, actionError)
      }
    }

    // Format the response
    const strategyData = {
      id: strategyId,
      creator: strategy[1],
      active: strategy[2],
      minProfitBPS: strategy[3]?.toString(),
      executionCount: strategy[4]?.toString(),
      totalProfit: strategy[5]?.toString(),
      // Full strategy details
      strategyType: fullStrategy[1],
      maxGasPrice: fullStrategy[5]?.toString(),
      deadline: fullStrategy[6]?.toString(),
      name: fullStrategy[7],
      description: fullStrategy[8],
      createdAt: fullStrategy[11]?.toString(),
      // Actions
      actions,
      actionCount: Number(actionCount)
    }

    return NextResponse.json({
      success: true,
      strategy: strategyData
    })

  } catch (error) {
    console.error('Error fetching strategy:', error)
    
    if (error instanceof Error && error.message.includes('contract function')) {
      return NextResponse.json(
        { error: 'Strategy not found or contract error' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch strategy', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST endpoint to get user's profit for this strategy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const resolvedParams = await params
    const strategyId = resolvedParams.id
    const { userAddress, tokenAddress } = body

    if (!strategyId || isNaN(Number(strategyId))) {
      return NextResponse.json(
        { error: 'Valid strategy ID is required' },
        { status: 400 }
      )
    }

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Valid user address is required' },
        { status: 400 }
      )
    }

    if (!tokenAddress || !isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Valid token address is required' },
        { status: 400 }
      )
    }

    // Get user's profit for the specified token
    const userProfit = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'getUserProfit',
      args: [userAddress as `0x${string}`, tokenAddress as `0x${string}`]
    })

    // Get strategy details for context
    const strategy = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'getStrategy',
      args: [BigInt(strategyId)]
    })

    return NextResponse.json({
      success: true,
      strategyId,
      userAddress,
      tokenAddress,
      profit: userProfit?.toString() || '0',
      strategy: {
        id: strategyId,
        creator: strategy[1],
        active: strategy[2],
        totalProfit: strategy[5]?.toString(),
        executionCount: strategy[4]?.toString()
      }
    })

  } catch (error) {
    console.error('Error fetching user profit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
