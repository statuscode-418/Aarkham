import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { polygon } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: polygon, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// GET DEX router by name
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params
    const dexName = resolvedParams.name

    if (!dexName) {
      return NextResponse.json(
        { error: 'DEX name is required' },
        { status: 400 }
      )
    }

    const routerAddress = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'dexRouters',
      args: [dexName]
    })

    if (!routerAddress || routerAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'DEX router not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      dexName,
      routerAddress
    })

  } catch (error) {
    console.error('Error fetching DEX router:', error)
    return NextResponse.json(
      { error: 'Failed to fetch DEX router', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST to get multiple DEX routers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dexNames } = body

    if (!dexNames || !Array.isArray(dexNames)) {
      return NextResponse.json(
        { error: 'Array of DEX names is required' },
        { status: 400 }
      )
    }

    const routers: Record<string, any> = {}
    
    for (const dexName of dexNames) {
      try {
        const routerAddress = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'dexRouters',
          args: [dexName]
        })

        if (routerAddress && routerAddress !== '0x0000000000000000000000000000000000000000') {
          routers[dexName] = routerAddress
        } else {
          routers[dexName] = null
        }
      } catch (error) {
        console.warn(`Could not fetch router for ${dexName}:`, error)
        routers[dexName] = null
      }
    }

    return NextResponse.json({
      success: true,
      routers
    })

  } catch (error) {
    console.error('Error fetching DEX routers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch DEX routers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
