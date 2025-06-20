import { NextRequest, NextResponse } from 'next/server'
import { Address, parseEther, isAddress } from 'viem'
import { ActionType } from '../../../../types/interfaces'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      actionTypes,
      targets,
      datas,
      minProfitBPS,
      walletAddress,
      privateKey
    } = body

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Strategy name is required and must be a string' },
        { status: 400 }
      )
    }

    if (!Array.isArray(actionTypes) || actionTypes.length === 0) {
      return NextResponse.json(
        { error: 'Action types array is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (!Array.isArray(targets) || targets.length !== actionTypes.length) {
      return NextResponse.json(
        { error: 'Targets array must match action types length' },
        { status: 400 }
      )
    }

    if (!Array.isArray(datas) || datas.length !== actionTypes.length) {
      return NextResponse.json(
        { error: 'Data array must match action types length' },
        { status: 400 }
      )
    }

    // Validate addresses
    for (const target of targets) {
      if (!isAddress(target)) {
        return NextResponse.json(
          { error: `Invalid target address: ${target}` },
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
    const strategyParams = {
      name,
      actionTypes: actionTypes.map((type: string | number) => 
        typeof type === 'string' ? ActionType[type as keyof typeof ActionType] : type
      ),
      targets: targets as Address[],
      datas: datas as `0x${string}`[],
      minProfitBPS: BigInt(minProfitBPS || 100) // Default 1%
    }

    // Return the strategy parameters for frontend to execute
    return NextResponse.json({
      success: true,
      message: 'Strategy parameters validated',
      strategyParams,
      instructions: {
        method: 'createStrategy',
        params: strategyParams,
        note: 'Use these parameters with the useCreateStrategy hook in your frontend'
      }
    })

  } catch (error) {
    console.error('Strategy creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/strategies/create',
    method: 'POST',
    description: 'Create a new flash loan strategy',
    parameters: {
      name: 'string - Strategy name',
      actionTypes: 'number[] - Array of action type enums',
      targets: 'string[] - Array of target contract addresses',
      datas: 'string[] - Array of encoded function call data',
      minProfitBPS: 'number - Minimum profit in basis points (optional, default: 100)',
      walletAddress: 'string - Wallet address (optional)',
      privateKey: 'string - Private key for signing (optional, use with caution)'
    },
    example: {
      name: 'Arbitrage USDC/WETH',
      actionTypes: [0, 0], // SWAP, SWAP
      targets: ['0x...', '0x...'],
      datas: ['0x...', '0x...'],
      minProfitBPS: 100
    }
  })
}
