import { NextRequest, NextResponse } from 'next/server'
import { Address, isAddress } from 'viem'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      strategyId,
      assets,
      amounts,
      gasPrice,
      gasLimit,
      walletAddress,
      privateKey
    } = body

    // Validation
    if (!strategyId || strategyId < 0) {
      return NextResponse.json(
        { error: 'Valid strategy ID is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'Assets array is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (!Array.isArray(amounts) || amounts.length !== assets.length) {
      return NextResponse.json(
        { error: 'Amounts array must match assets length' },
        { status: 400 }
      )
    }

    // Validate addresses
    for (const asset of assets) {
      if (!isAddress(asset)) {
        return NextResponse.json(
          { error: `Invalid asset address: ${asset}` },
          { status: 400 }
        )
      }
    }

    if (walletAddress && !isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }

    // Convert to proper types
    const executeParams = {
      strategyId: BigInt(strategyId),
      assets: assets as Address[],
      amounts: amounts.map((amount: string | number) => BigInt(amount))
    }

    // Additional execution metadata
    const executionMetadata = {
      gasPrice: gasPrice ? BigInt(gasPrice) : undefined,
      gasLimit: gasLimit ? BigInt(gasLimit) : undefined,
      timestamp: Date.now(),
      walletAddress
    }

    return NextResponse.json({
      success: true,
      message: 'Strategy execution parameters validated',
      executeParams,
      executionMetadata,
      instructions: {
        method: 'executeStrategy',
        params: executeParams,
        note: 'Use these parameters with the useExecuteStrategy hook in your frontend'
      }
    })

  } catch (error) {
    console.error('Strategy execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/strategies/execute',
    method: 'POST',
    description: 'Execute a flash loan strategy',
    parameters: {
      strategyId: 'number - ID of the strategy to execute',
      assets: 'string[] - Array of asset addresses for flash loan',
      amounts: 'string[] - Array of amounts to borrow (in wei)',
      gasPrice: 'string - Gas price in wei (optional)',
      gasLimit: 'string - Gas limit (optional)',
      walletAddress: 'string - Wallet address (optional)',
      privateKey: 'string - Private key for signing (optional)'
    },
    example: {
      strategyId: 1,
      assets: ['0x...USDC', '0x...WETH'],
      amounts: ['1000000000', '1000000000000000000'],
      gasPrice: '20000000000',
      gasLimit: '500000'
    }
  })
}
