import { NextRequest, NextResponse } from 'next/server'
import { isAddress } from 'viem'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId')
    const walletAddress = searchParams.get('walletAddress')

    if (strategyId && isNaN(Number(strategyId))) {
      return NextResponse.json(
        { error: 'Invalid strategy ID' },
        { status: 400 }
      )
    }

    if (walletAddress && !isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }

    // Return instructions for querying strategy data
    const queryInstructions = {
      strategyQuery: strategyId ? {
        method: 'useGetStrategy',
        params: { strategyId: BigInt(strategyId) },
        note: 'Use this hook to get strategy details'
      } : null,
      
      userProfitQuery: walletAddress ? {
        method: 'useGetUserProfit',
        params: { userAddress: walletAddress, tokenAddress: '0x...' },
        note: 'Use this hook to get user profits for a specific token'
      } : null,
      
      availableQueries: [
        'useGetStrategy(strategyId)',
        'useGetUserProfit(userAddress, tokenAddress)',
        'useGetStrategyActionsCount(strategyId)',
        'useGetSafetyParams()',
        'useIsAuthorizedExecutor(executorAddress)',
        'useGetNextStrategyId()',
        'useIsEmergencyStop()'
      ]
    }

    return NextResponse.json({
      success: true,
      message: 'Strategy query parameters',
      queryInstructions,
      instructions: {
        note: 'Use the wagmi hooks directly in your frontend components for real-time data'
      }
    })

  } catch (error) {
    console.error('Strategy query error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json({
    endpoint: '/api/strategies/query',
    method: 'GET',
    description: 'Get instructions for querying strategy data',
    parameters: {
      strategyId: 'number - Strategy ID to query (optional)',
      walletAddress: 'string - Wallet address to query profits (optional)'
    },
    example: '/api/strategies/query?strategyId=1&walletAddress=0x...',
    note: 'This endpoint returns instructions for using wagmi hooks, not actual data'
  })
}
