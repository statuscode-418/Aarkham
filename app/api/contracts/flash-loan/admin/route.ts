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
      adminAction
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

    if (!adminAction || !adminAction.type) {
      return NextResponse.json(
        { error: 'Admin action type is required' },
        { status: 400 }
      )
    }

    // Verify user is contract owner (additional security check)
    try {
      const owner = await publicClient.readContract({
        address: FLASH_LOAN_EXECUTOR_ADDRESS,
        abi: FLASH_LOAN_EXECUTOR_ABI,
        functionName: 'owner'
      })

      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Only contract owner can perform admin actions' },
          { status: 403 }
        )
      }
    } catch (ownerError) {
      console.warn('Could not verify contract owner:', ownerError)
    }

    const { type, params } = adminAction

    // Validate specific admin action parameters
    switch (type) {
      case 'setDEXRouter':
        if (!params.dexName || !params.routerAddress) {
          return NextResponse.json(
            { error: 'DEX name and router address are required' },
            { status: 400 }
          )
        }
        break

      case 'setAuthorizedExecutor':
        if (!params.executorAddress || typeof params.isAuthorized !== 'boolean') {
          return NextResponse.json(
            { error: 'Executor address and authorization status are required' },
            { status: 400 }
          )
        }
        break

      case 'updateSafetyParams':
        if (typeof params.maxSlippageBPS === 'undefined' || 
            typeof params.minProfitBPS === 'undefined' || 
            typeof params.maxGasPrice === 'undefined') {
          return NextResponse.json(
            { error: 'All safety parameters are required' },
            { status: 400 }
          )
        }
        break

      case 'emergencyWithdraw':
        if (!params.tokenAddress || !params.to) {
          return NextResponse.json(
            { error: 'Token address and recipient are required' },
            { status: 400 }
          )
        }
        break

      case 'transferOwnership':
        if (!params.newOwner) {
          return NextResponse.json(
            { error: 'New owner address is required' },
            { status: 400 }
          )
        }
        break

      case 'toggleEmergencyStop':
      case 'renounceOwnership':
        // No additional params needed
        break

      default:
        return NextResponse.json(
          { error: 'Invalid admin action type' },
          { status: 400 }
        )
    }

    console.log('Admin action requested by:', userAddress)
    console.log('Action type:', type)
    console.log('Parameters:', params)

    // Broadcast the signed transaction to the blockchain
    const hash = await publicClient.sendRawTransaction({
      serializedTransaction: signedTransaction as `0x${string}`
    })

    console.log('Admin transaction broadcasted:', hash)

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1
    })

    // Parse specific events based on action type
    let actionResult = null
    try {
      const decodedLogs = parseEventLogs({
        abi: FLASH_LOAN_EXECUTOR_ABI,
        logs: receipt.logs
      })

      // Look for relevant events
      if (type === 'transferOwnership') {
        const ownershipEvent = decodedLogs.find(log => 
          log.eventName === 'OwnershipTransferred'
        )
        if (ownershipEvent) {
          actionResult = {
            previousOwner: ownershipEvent.args.previousOwner,
            newOwner: ownershipEvent.args.newOwner
          }
        }
      }
    } catch (parseError) {
      console.warn('Could not parse admin action events:', parseError)
    }

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status,
      actionResult,
      message: `Admin action '${type}' completed successfully`,
      adminAction: {
        type,
        executor: userAddress,
        params
      }
    })

  } catch (error) {
    console.error('Error broadcasting admin transaction:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Ownable')) {
        return NextResponse.json(
          { error: 'Only contract owner can perform this action' },
          { status: 403 }
        )
      }
      
      if (error.message.includes('execution reverted')) {
        return NextResponse.json(
          { error: 'Admin action failed - transaction reverted' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to execute admin action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for admin actions information
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/contracts/flash-loan/admin',
    method: 'POST',
    description: 'Broadcast signed admin transactions (owner only)',
    contractAddress: FLASH_LOAN_EXECUTOR_ADDRESS,
    requiredFields: {
      signedTransaction: 'string - The signed transaction data',
      userAddress: 'string - Address of the contract owner',
      adminAction: {
        type: 'string - Type of admin action',
        params: 'object - Parameters specific to the action type'
      }
    },
    supportedActions: {
      setDEXRouter: {
        params: {
          dexName: 'string - Name of the DEX',
          routerAddress: 'string - Router contract address'
        }
      },
      setAuthorizedExecutor: {
        params: {
          executorAddress: 'string - Executor address',
          isAuthorized: 'boolean - Authorization status'
        }
      },
      updateSafetyParams: {
        params: {
          maxSlippageBPS: 'number - Maximum slippage in basis points',
          minProfitBPS: 'number - Minimum profit in basis points',
          maxGasPrice: 'string - Maximum gas price in wei'
        }
      },
      emergencyWithdraw: {
        params: {
          tokenAddress: 'string - Token to withdraw (0x0 for ETH)',
          to: 'string - Recipient address'
        }
      },
      transferOwnership: {
        params: {
          newOwner: 'string - New owner address'
        }
      },
      toggleEmergencyStop: {
        params: {} // No parameters needed
      },
      renounceOwnership: {
        params: {} // No parameters needed
      }
    },
    example: {
      signedTransaction: '0x...',
      userAddress: '0x...',
      adminAction: {
        type: 'setDEXRouter',
        params: {
          dexName: 'UniswapV2',
          routerAddress: '0x...'
        }
      }
    }
  })
}
