import { NextRequest, NextResponse } from 'next/server'
import { 
  createArbitrageStrategy,
  createYieldFarmingStrategy,
  createLiquidationStrategy,
  createRefinancingStrategy
} from '../../../../lib/advanced-strategies'
import { Address, isAddress, parseEther } from 'viem'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      strategyType,
      parameters
    } = body

    if (!strategyType || !parameters) {
      return NextResponse.json(
        { error: 'Strategy type and parameters are required' },
        { status: 400 }
      )
    }

    let strategy

    switch (strategyType.toLowerCase()) {
      case 'arbitrage':
        const {
          tokenA,
          tokenB,
          dexRouter1,
          dexRouter2,
          flashLoanAmount,
          minProfitBPS
        } = parameters

        // Validate arbitrage parameters
        if (!isAddress(tokenA) || !isAddress(tokenB) || !isAddress(dexRouter1) || !isAddress(dexRouter2)) {
          return NextResponse.json(
            { error: 'Invalid addresses in arbitrage parameters' },
            { status: 400 }
          )
        }

        strategy = createArbitrageStrategy(
          tokenA as Address,
          tokenB as Address,
          dexRouter1 as Address,
          dexRouter2 as Address,
          BigInt(flashLoanAmount || parseEther('1')),
          BigInt(minProfitBPS || 100)
        )
        break

      case 'yield-farming':
      case 'yieldfarm':
        const {
          depositToken,
          farmingContract,
          rewardToken,
          swapRouter,
          depositAmount
        } = parameters

        if (!isAddress(depositToken) || !isAddress(farmingContract) || !isAddress(rewardToken) || !isAddress(swapRouter)) {
          return NextResponse.json(
            { error: 'Invalid addresses in yield farming parameters' },
            { status: 400 }
          )
        }

        strategy = createYieldFarmingStrategy(
          depositToken as Address,
          farmingContract as Address,
          rewardToken as Address,
          swapRouter as Address,
          BigInt(depositAmount || parseEther('1')),
          BigInt(parameters.minProfitBPS || 50)
        )
        break

      case 'liquidation':
        const {
          collateralToken,
          debtToken,
          lendingProtocol,
          liquidationTarget,
          liquidationAmount
        } = parameters

        if (!isAddress(collateralToken) || !isAddress(debtToken) || !isAddress(lendingProtocol) || !isAddress(liquidationTarget)) {
          return NextResponse.json(
            { error: 'Invalid addresses in liquidation parameters' },
            { status: 400 }
          )
        }

        strategy = createLiquidationStrategy(
          collateralToken as Address,
          debtToken as Address,
          lendingProtocol as Address,
          parameters.swapRouter as Address,
          liquidationTarget as Address,
          BigInt(liquidationAmount || parseEther('1')),
          BigInt(parameters.minProfitBPS || 200)
        )
        break

      case 'refinancing':
        const {
          debtToken: refDebtToken,
          collateralToken: refCollateralToken,
          oldLendingProtocol,
          newLendingProtocol,
          refinanceAmount
        } = parameters

        if (!isAddress(refDebtToken) || !isAddress(refCollateralToken) || !isAddress(oldLendingProtocol) || !isAddress(newLendingProtocol)) {
          return NextResponse.json(
            { error: 'Invalid addresses in refinancing parameters' },
            { status: 400 }
          )
        }

        strategy = createRefinancingStrategy(
          refDebtToken as Address,
          refCollateralToken as Address,
          oldLendingProtocol as Address,
          newLendingProtocol as Address,
          BigInt(refinanceAmount || parseEther('1')),
          BigInt(parameters.minProfitBPS || 25)
        )
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported strategy type. Supported types: arbitrage, yield-farming, liquidation, refinancing' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `${strategyType} strategy template created`,
      strategy,
      instructions: {
        method: 'createStrategy',
        params: strategy,
        note: 'Use the returned strategy object with the /api/strategies/create endpoint'
      }
    })

  } catch (error) {
    console.error('Template strategy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/strategies/templates',
    method: 'POST',
    description: 'Generate strategy templates using predefined patterns',
    supportedTypes: ['arbitrage', 'yield-farming', 'liquidation', 'refinancing'],
    parameters: {
      strategyType: 'string - Type of strategy template',
      parameters: 'object - Strategy-specific parameters'
    },
    examples: {
      arbitrage: {
        strategyType: 'arbitrage',
        parameters: {
          tokenA: '0x...USDC',
          tokenB: '0x...WETH',
          dexRouter1: '0x...UniswapV2',
          dexRouter2: '0x...SushiSwap',
          flashLoanAmount: '1000000000', // 1000 USDC
          minProfitBPS: 100 // 1%
        }
      },
      yieldFarming: {
        strategyType: 'yield-farming',
        parameters: {
          depositToken: '0x...USDC',
          farmingContract: '0x...Farm',
          rewardToken: '0x...REWARD',
          swapRouter: '0x...Router',
          depositAmount: '1000000000',
          minProfitBPS: 50 // 0.5%
        }
      },
      liquidation: {
        strategyType: 'liquidation',
        parameters: {
          collateralToken: '0x...WETH',
          debtToken: '0x...USDC',
          lendingProtocol: '0x...Aave',
          swapRouter: '0x...Router',
          liquidationTarget: '0x...User',
          liquidationAmount: '1000000000',
          minProfitBPS: 200 // 2%
        }
      },
      refinancing: {
        strategyType: 'refinancing',
        parameters: {
          debtToken: '0x...USDC',
          collateralToken: '0x...WETH',
          oldLendingProtocol: '0x...Compound',
          newLendingProtocol: '0x...Aave',
          refinanceAmount: '1000000000',
          minProfitBPS: 25 // 0.25%
        }
      }
    }
  })
}
