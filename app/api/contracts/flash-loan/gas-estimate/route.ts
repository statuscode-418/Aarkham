import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, encodeFunctionData, parseEther } from 'viem'
import { polygon } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: polygon, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// POST endpoint to estimate gas for various contract operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      operation, 
      userAddress, 
      params 
    } = body

    if (!operation || !userAddress || !params) {
      return NextResponse.json(
        { error: 'Operation, user address, and parameters are required' },
        { status: 400 }
      )
    }

    let gasEstimate: bigint
    let data: `0x${string}`

    switch (operation) {
      case 'createStrategy':
        const { name, actionTypes, targets, datas, minProfitBPS } = params
        
        data = encodeFunctionData({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'createStrategy',
          args: [name, actionTypes, targets, datas, BigInt(minProfitBPS)]
        })

        gasEstimate = await publicClient.estimateGas({
          account: userAddress as `0x${string}`,
          to: FLASH_LOAN_EXECUTOR_ADDRESS,
          data
        })
        break

      case 'executeStrategy':
        const { strategyId, assets, amounts } = params
        
        data = encodeFunctionData({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'executeStrategy',
          args: [BigInt(strategyId), assets, amounts.map((amount: string) => BigInt(amount))]
        })

        gasEstimate = await publicClient.estimateGas({
          account: userAddress as `0x${string}`,
          to: FLASH_LOAN_EXECUTOR_ADDRESS,
          data
        })
        break

      case 'setDEXRouter':
        const { dexName, routerAddress } = params
        
        data = encodeFunctionData({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'setDEXRouter',
          args: [dexName, routerAddress]
        })

        gasEstimate = await publicClient.estimateGas({
          account: userAddress as `0x${string}`,
          to: FLASH_LOAN_EXECUTOR_ADDRESS,
          data
        })
        break

      case 'setAuthorizedExecutor':
        const { executorAddress, isAuthorized } = params
        
        data = encodeFunctionData({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'setAuthorizedExecutor',
          args: [executorAddress, isAuthorized]
        })

        gasEstimate = await publicClient.estimateGas({
          account: userAddress as `0x${string}`,
          to: FLASH_LOAN_EXECUTOR_ADDRESS,
          data
        })
        break

      case 'updateSafetyParams':
        const { maxSlippageBPS, minProfitBPS: minProfit, maxGasPrice } = params
        
        data = encodeFunctionData({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'updateSafetyParams',
          args: [BigInt(maxSlippageBPS), BigInt(minProfit), BigInt(maxGasPrice)]
        })

        gasEstimate = await publicClient.estimateGas({
          account: userAddress as `0x${string}`,
          to: FLASH_LOAN_EXECUTOR_ADDRESS,
          data
        })
        break

      case 'toggleEmergencyStop':
        data = encodeFunctionData({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'toggleEmergencyStop',
          args: []
        })

        gasEstimate = await publicClient.estimateGas({
          account: userAddress as `0x${string}`,
          to: FLASH_LOAN_EXECUTOR_ADDRESS,
          data
        })
        break

      case 'emergencyWithdraw':
        const { tokenAddress, to } = params
        
        data = encodeFunctionData({
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'emergencyWithdraw',
          args: [tokenAddress, to]
        })

        gasEstimate = await publicClient.estimateGas({
          account: userAddress as `0x${string}`,
          to: FLASH_LOAN_EXECUTOR_ADDRESS,
          data
        })
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported operation type' },
          { status: 400 }
        )
    }

    // Get current gas price for cost estimation
    const gasPrice = await publicClient.getGasPrice()
    const estimatedCost = gasEstimate * gasPrice

    return NextResponse.json({
      success: true,
      operation,
      gasEstimate: gasEstimate.toString(),
      gasPrice: gasPrice.toString(),
      estimatedCost: estimatedCost.toString(),
      estimatedCostETH: (Number(estimatedCost) / 1e18).toFixed(6),
      data,
      recommendation: {
        gasLimit: (gasEstimate * 120n / 100n).toString(), // Add 20% buffer
        maxFeePerGas: (gasPrice * 150n / 100n).toString(), // Add 50% buffer for EIP-1559
        maxPriorityFeePerGas: parseEther('0.000000002').toString() // 2 gwei
      }
    })

  } catch (error) {
    console.error('Error estimating gas:', error)
    
    // Handle specific gas estimation errors
    if (error instanceof Error) {
      if (error.message.includes('execution reverted')) {
        return NextResponse.json(
          { error: 'Transaction would revert - check parameters and permissions' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('insufficient funds')) {
        return NextResponse.json(
          { error: 'Insufficient funds for gas estimation' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to estimate gas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for gas estimation information
export async function GET() {
  try {
    // Get current network gas information
    const gasPrice = await publicClient.getGasPrice()
    const blockNumber = await publicClient.getBlockNumber()
    const block = await publicClient.getBlock({ blockNumber })

    return NextResponse.json({
      endpoint: '/api/contracts/flash-loan/gas-estimate',
      method: 'POST',
      description: 'Estimate gas for flash loan contract operations',
      currentGasPrice: gasPrice.toString(),
      currentBlock: blockNumber.toString(),
      baseFeePerGas: block.baseFeePerGas?.toString() || null,
      supportedOperations: [
        'createStrategy',
        'executeStrategy',
        'setDEXRouter',
        'setAuthorizedExecutor',
        'updateSafetyParams',
        'toggleEmergencyStop',
        'emergencyWithdraw'
      ],
      example: {
        operation: 'createStrategy',
        userAddress: '0x...',
        params: {
          name: 'My Strategy',
          actionTypes: [0, 0],
          targets: ['0x...', '0x...'],
          datas: ['0x...', '0x...'],
          minProfitBPS: 100
        }
      }
    })

  } catch (error) {
    console.error('Error getting gas info:', error)
    return NextResponse.json(
      { error: 'Failed to get gas information' },
      { status: 500 }
    )
  }
}
