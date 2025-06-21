import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { sepolia } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: sepolia, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// GET endpoint for advanced protocol integration features
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feature = searchParams.get('feature')
    const asset = searchParams.get('asset')
    const amount = searchParams.get('amount')
    const tokenIn = searchParams.get('tokenIn')
    const tokenOut = searchParams.get('tokenOut')
    const amountIn = searchParams.get('amountIn')
    const fee = searchParams.get('fee')

    if (!feature) {
      return NextResponse.json({
        endpoint: '/api/contracts/flash-loan/protocol',
        description: 'Advanced protocol integration features',
        features: {
          'flash-loan-check': {
            description: 'Check Aave flash loan availability',
            params: ['asset', 'amount'],
            example: '?feature=flash-loan-check&asset=0x...&amount=1000000000000000000'
          },
          'v2-quote': {
            description: 'Get Uniswap V2 quote',
            params: ['tokenIn', 'tokenOut', 'amountIn'],
            example: '?feature=v2-quote&tokenIn=0x...&tokenOut=0x...&amountIn=1000000000000000000'
          },
          'v3-quote': {
            description: 'Get Uniswap V3 quote',
            params: ['tokenIn', 'tokenOut', 'amountIn', 'fee'],
            example: '?feature=v3-quote&tokenIn=0x...&tokenOut=0x...&amountIn=1000000000000000000&fee=3000'
          },
          'profitability-check': {
            description: 'Check strategy profitability after gas costs',
            params: ['expectedProfit', 'gasEstimate', 'gasPrice', 'minProfitBPS', 'principalAmount']
          }
        }
      })
    }

    switch (feature) {
      case 'flash-loan-check':
        if (!asset || !isAddress(asset) || !amount || isNaN(Number(amount))) {
          return NextResponse.json(
            { error: 'Valid asset address and amount are required' },
            { status: 400 }
          )
        }

        try {
          const result = await publicClient.readContract({
            address: FLASH_LOAN_EXECUTOR_ADDRESS,
            abi: FLASH_LOAN_EXECUTOR_ABI,
            functionName: 'checkAaveFlashLoanAvailability',
            args: [asset as `0x${string}`, BigInt(amount)]
          })

          return NextResponse.json({
            success: true,
            feature: 'flash-loan-check',
            asset,
            amount,
            available: result[0],
            fee: result[1]?.toString(),
            feePercentage: result[1] ? (Number(result[1]) / Number(amount) * 100).toFixed(4) + '%' : '0%'
          })
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to check flash loan availability', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }

      case 'v2-quote':
        if (!tokenIn || !isAddress(tokenIn) || !tokenOut || !isAddress(tokenOut) || 
            !amountIn || isNaN(Number(amountIn))) {
          return NextResponse.json(
            { error: 'Valid tokenIn, tokenOut, and amountIn are required' },
            { status: 400 }
          )
        }

        try {
          const quote = await publicClient.readContract({
            address: FLASH_LOAN_EXECUTOR_ADDRESS,
            abi: FLASH_LOAN_EXECUTOR_ABI,
            functionName: 'getV2Quote',
            args: [tokenIn as `0x${string}`, tokenOut as `0x${string}`, BigInt(amountIn)]
          })

          const priceImpact = quote ? (BigInt(amountIn) - quote) * 10000n / BigInt(amountIn) : 0n

          return NextResponse.json({
            success: true,
            feature: 'v2-quote',
            tokenIn,
            tokenOut,
            amountIn,
            amountOut: quote?.toString() || '0',
            priceImpactBPS: priceImpact.toString(),
            priceImpactPercent: (Number(priceImpact) / 100).toFixed(2) + '%'
          })
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to get V2 quote', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }

      case 'v3-quote':
        if (!tokenIn || !isAddress(tokenIn) || !tokenOut || !isAddress(tokenOut) || 
            !amountIn || isNaN(Number(amountIn)) || !fee || isNaN(Number(fee))) {
          return NextResponse.json(
            { error: 'Valid tokenIn, tokenOut, amountIn, and fee are required' },
            { status: 400 }
          )
        }

        try {
          const quote = await publicClient.readContract({
            address: FLASH_LOAN_EXECUTOR_ADDRESS,
            abi: FLASH_LOAN_EXECUTOR_ABI,
            functionName: 'getV3Quote',
            args: [tokenIn as `0x${string}`, tokenOut as `0x${string}`, BigInt(amountIn), Number(fee)]
          })

          const priceImpact = quote ? (BigInt(amountIn) - quote) * 10000n / BigInt(amountIn) : 0n

          return NextResponse.json({
            success: true,
            feature: 'v3-quote',
            tokenIn,
            tokenOut,
            amountIn,
            fee: Number(fee),
            amountOut: quote?.toString() || '0',
            priceImpactBPS: priceImpact.toString(),
            priceImpactPercent: (Number(priceImpact) / 100).toFixed(2) + '%'
          })
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to get V3 quote', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }

      case 'profitability-check':
        const expectedProfit = searchParams.get('expectedProfit')
        const gasEstimate = searchParams.get('gasEstimate')
        const gasPrice = searchParams.get('gasPrice')
        const minProfitBPS = searchParams.get('minProfitBPS')
        const principalAmount = searchParams.get('principalAmount')

        if (!expectedProfit || !gasEstimate || !gasPrice || !minProfitBPS || !principalAmount ||
            [expectedProfit, gasEstimate, gasPrice, minProfitBPS, principalAmount].some(v => isNaN(Number(v)))) {
          return NextResponse.json(
            { error: 'All numeric parameters are required for profitability check' },
            { status: 400 }
          )
        }

        try {
          const isProfitable = await publicClient.readContract({
            address: FLASH_LOAN_EXECUTOR_ADDRESS,
            abi: FLASH_LOAN_EXECUTOR_ABI,
            functionName: 'isProfitableAfterGas',
            args: [
              BigInt(expectedProfit),
              BigInt(gasEstimate),
              BigInt(gasPrice),
              BigInt(minProfitBPS),
              BigInt(principalAmount)
            ]
          })

          const gasCost = BigInt(gasEstimate) * BigInt(gasPrice)
          const netProfit = BigInt(expectedProfit) - gasCost
          const profitBPS = netProfit * 10000n / BigInt(principalAmount)

          return NextResponse.json({
            success: true,
            feature: 'profitability-check',
            isProfitable,
            expectedProfit,
            gasEstimate,
            gasPrice,
            gasCost: gasCost.toString(),
            netProfit: netProfit.toString(),
            profitBPS: profitBPS.toString(),
            profitPercent: (Number(profitBPS) / 100).toFixed(2) + '%',
            minRequiredBPS: minProfitBPS
          })
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to check profitability', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Unknown feature requested' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Protocol integration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process protocol integration request', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// POST endpoint for batch protocol operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operations } = body

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'Operations array is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const operation of operations) {
      try {
        const { feature, params } = operation

        let result
        switch (feature) {
          case 'flash-loan-check':
            result = await publicClient.readContract({
              address: FLASH_LOAN_EXECUTOR_ADDRESS,
              abi: FLASH_LOAN_EXECUTOR_ABI,
              functionName: 'checkAaveFlashLoanAvailability',
              args: [params.asset, BigInt(params.amount)]
            })
            results.push({
              feature,
              success: true,
              data: {
                available: result[0],
                fee: result[1]?.toString()
              }
            })
            break

          case 'v2-quote':
            result = await publicClient.readContract({
              address: FLASH_LOAN_EXECUTOR_ADDRESS,
              abi: FLASH_LOAN_EXECUTOR_ABI,
              functionName: 'getV2Quote',
              args: [params.tokenIn, params.tokenOut, BigInt(params.amountIn)]
            })
            results.push({
              feature,
              success: true,
              data: {
                amountOut: result?.toString() || '0'
              }
            })
            break

          case 'v3-quote':
            result = await publicClient.readContract({
              address: FLASH_LOAN_EXECUTOR_ADDRESS,
              abi: FLASH_LOAN_EXECUTOR_ABI,
              functionName: 'getV3Quote',
              args: [params.tokenIn, params.tokenOut, BigInt(params.amountIn), params.fee]
            })
            results.push({
              feature,
              success: true,
              data: {
                amountOut: result?.toString() || '0'
              }
            })
            break

          default:
            results.push({
              feature,
              success: false,
              error: 'Unknown feature'
            })
        }
      } catch (error) {
        results.push({
          feature: operation.feature,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalOperations: operations.length,
      successfulOperations: results.filter(r => r.success).length
    })

  } catch (error) {
    console.error('Batch protocol operations error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process batch operations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
