import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { sepolia } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: sepolia, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// GET contract information and safety parameters
export async function GET() {
  try {
    // Get contract basic info
    const [
      owner,
      nextStrategyId,
      emergencyStop,
      maxSlippageBPS,
      minProfitBPS,
      maxGasPrice,
      aavePool,
      addressProvider,
      weth
    ] = await Promise.all([
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'owner'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'nextStrategyId'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'emergencyStop'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'maxSlippageBPS'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'minProfitBPS'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'maxGasPrice'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'aavePool'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'addressProvider'
      }),
      publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'weth'
      })
    ])

    return NextResponse.json({
      success: true,
      contract: {
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        owner,
        nextStrategyId: nextStrategyId?.toString(),
        emergencyStop,
        aavePool,
        addressProvider,
        weth
      },
      safetyParams: {
        maxSlippageBPS: maxSlippageBPS?.toString(),
        minProfitBPS: minProfitBPS?.toString(),
        maxGasPrice: maxGasPrice?.toString()
      },
      status: emergencyStop ? 'Emergency Stop Active' : 'Operational'
    })

  } catch (error) {
    console.error('Error fetching contract info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract information', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST endpoint to check user authorization and get user-specific data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userAddress, tokenAddress } = body

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Valid user address is required' },
        { status: 400 }
      )
    }

    // Check if user is authorized executor
    const isAuthorized = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'authorizedExecutors',
      args: [userAddress as `0x${string}`]
    })

    // Get user's profit if token address provided
    let userProfit = null
    if (tokenAddress && isAddress(tokenAddress)) {
      userProfit = await publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'getUserProfit',
        args: [userAddress as `0x${string}`, tokenAddress as `0x${string}`]
      })
    }

    // Check if user is contract owner
    const owner = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'owner'
    })

    const isOwner = owner.toLowerCase() === userAddress.toLowerCase()

    return NextResponse.json({
      success: true,
      userAddress,
      isAuthorized,
      isOwner,
      userProfit: userProfit?.toString() || null,
      tokenAddress: tokenAddress || null,
      permissions: {
        canCreateStrategies: isAuthorized || isOwner,
        canExecuteStrategies: isAuthorized || isOwner,
        canPerformAdminActions: isOwner
      }
    })

  } catch (error) {
    console.error('Error checking user authorization:', error)
    return NextResponse.json(
      { error: 'Failed to check user authorization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
