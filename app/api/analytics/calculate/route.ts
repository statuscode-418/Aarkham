import { NextRequest, NextResponse } from 'next/server'
import { 
  calculateUniswapV2Output,
  calculatePriceImpact,
  calculateMinAmountOut,
  estimateStrategyGas,
  calculateMaxGasPrice,
  validateStrategyExecution
} from '../../../../lib/advanced-strategies'
import { parseEther, formatUnits } from 'viem'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      calculationType,
      parameters
    } = body

    if (!calculationType || !parameters) {
      return NextResponse.json(
        { error: 'Calculation type and parameters are required' },
        { status: 400 }
      )
    }

    let result

    switch (calculationType.toLowerCase()) {
      case 'uniswap-output':
        const { amountIn, reserveIn, reserveOut, feeBPS } = parameters
        result = {
          expectedOutput: calculateUniswapV2Output(
            BigInt(amountIn),
            BigInt(reserveIn),
            BigInt(reserveOut),
            BigInt(feeBPS || 30)
          ).toString(),
          formatted: formatUnits(
            calculateUniswapV2Output(
              BigInt(amountIn),
              BigInt(reserveIn),
              BigInt(reserveOut),
              BigInt(feeBPS || 30)
            ),
            18
          )
        }
        break

      case 'price-impact':
        result = {
          priceImpact: calculatePriceImpact(
            BigInt(parameters.amountIn),
            BigInt(parameters.amountOut),
            BigInt(parameters.reserveIn),
            BigInt(parameters.reserveOut)
          ),
          unit: 'percentage'
        }
        break

      case 'min-amount-out':
        result = {
          minAmountOut: calculateMinAmountOut(
            BigInt(parameters.expectedAmount),
            BigInt(parameters.slippageBPS || 500) // 5% default
          ).toString(),
          formatted: formatUnits(
            calculateMinAmountOut(
              BigInt(parameters.expectedAmount),
              BigInt(parameters.slippageBPS || 500)
            ),
            18
          )
        }
        break

      case 'gas-estimate':
        result = {
          estimatedGas: estimateStrategyGas(parameters.actionCount).toString(),
          actionCount: parameters.actionCount,
          baseGas: '200000',
          gasPerAction: '150000'
        }
        break

      case 'max-gas-price':
        result = {
          maxGasPrice: calculateMaxGasPrice(
            BigInt(parameters.expectedProfitWei),
            BigInt(parameters.estimatedGasUnits),
            BigInt(parameters.profitMarginBPS || 1000)
          ).toString(),
          formatted: formatUnits(
            calculateMaxGasPrice(
              BigInt(parameters.expectedProfitWei),
              BigInt(parameters.estimatedGasUnits),
              BigInt(parameters.profitMarginBPS || 1000)
            ),
            9
          ) + ' gwei'
        }
        break

      case 'strategy-validation':
        result = validateStrategyExecution(
          parameters.strategyData,
          BigInt(parameters.currentGasPrice),
          parameters.safetyParams
        )
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported calculation type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      calculationType,
      result,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Analytics calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/analytics/calculate',
    method: 'POST',
    description: 'Perform various DeFi calculations and analytics',
    supportedCalculations: [
      'uniswap-output',
      'price-impact',
      'min-amount-out',
      'gas-estimate',
      'max-gas-price',
      'strategy-validation'
    ],
    examples: {
      uniswapOutput: {
        calculationType: 'uniswap-output',
        parameters: {
          amountIn: '1000000000000000000', // 1 ETH
          reserveIn: '100000000000000000000', // 100 ETH
          reserveOut: '200000000000', // 200,000 USDC
          feeBPS: 30 // 0.3%
        }
      },
      priceImpact: {
        calculationType: 'price-impact',
        parameters: {
          amountIn: '1000000000000000000',
          amountOut: '1980000000',
          reserveIn: '100000000000000000000',
          reserveOut: '200000000000'
        }
      },
      gasEstimate: {
        calculationType: 'gas-estimate',
        parameters: {
          actionCount: 3
        }
      }
    }
  })
}
