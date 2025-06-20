import { NextRequest, NextResponse } from 'next/server'
import { Address, isAddress } from 'viem'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      action,
      parameters
    } = body

    if (!action || !parameters) {
      return NextResponse.json(
        { error: 'Action and parameters are required' },
        { status: 400 }
      )
    }

    let result

    switch (action.toLowerCase()) {
      case 'set-dex-router':
        const { dexName, routerAddress } = parameters
        
        if (!dexName || !isAddress(routerAddress)) {
          return NextResponse.json(
            { error: 'Valid DEX name and router address are required' },
            { status: 400 }
          )
        }

        result = {
          method: 'useSetDEXRouter',
          params: { dexName, routerAddress: routerAddress as Address },
          note: 'Use this with the useSetDEXRouter hook'
        }
        break

      case 'set-authorized-executor':
        const { executorAddress, isAuthorized } = parameters
        
        if (!isAddress(executorAddress) || typeof isAuthorized !== 'boolean') {
          return NextResponse.json(
            { error: 'Valid executor address and authorization status are required' },
            { status: 400 }
          )
        }

        result = {
          method: 'useSetAuthorizedExecutor',
          params: { executorAddress: executorAddress as Address, isAuthorized },
          note: 'Use this with the useSetAuthorizedExecutor hook'
        }
        break

      case 'toggle-emergency-stop':
        result = {
          method: 'useToggleEmergencyStop',
          params: {},
          note: 'Use this with the useToggleEmergencyStop hook'
        }
        break

      case 'update-safety-params':
        const { maxSlippageBPS, minProfitBPS, maxGasPrice } = parameters
        
        if (!maxSlippageBPS || !minProfitBPS || !maxGasPrice) {
          return NextResponse.json(
            { error: 'All safety parameters are required' },
            { status: 400 }
          )
        }

        result = {
          method: 'useUpdateSafetyParams',
          params: {
            maxSlippageBPS: BigInt(maxSlippageBPS),
            minProfitBPS: BigInt(minProfitBPS),
            maxGasPrice: BigInt(maxGasPrice)
          },
          note: 'Use this with the useUpdateSafetyParams hook'
        }
        break

      case 'emergency-withdraw':
        const { tokenAddress, toAddress } = parameters
        
        if (!isAddress(tokenAddress) || !isAddress(toAddress)) {
          return NextResponse.json(
            { error: 'Valid token and destination addresses are required' },
            { status: 400 }
          )
        }

        result = {
          method: 'useEmergencyWithdraw',
          params: {
            tokenAddress: tokenAddress as Address,
            toAddress: toAddress as Address
          },
          note: 'Use this with the useEmergencyWithdraw hook'
        }
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported admin action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: Date.now(),
      warning: 'Admin actions require proper authorization and should be used with caution'
    })

  } catch (error) {
    console.error('Admin action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/actions',
    method: 'POST',
    description: 'Execute administrative actions on the FlashLoanExecutor contract',
    supportedActions: [
      'set-dex-router',
      'set-authorized-executor',
      'toggle-emergency-stop',
      'update-safety-params',
      'emergency-withdraw'
    ],
    examples: {
      setDexRouter: {
        action: 'set-dex-router',
        parameters: {
          dexName: 'Uniswap V2',
          routerAddress: '0x...'
        }
      },
      setAuthorizedExecutor: {
        action: 'set-authorized-executor',
        parameters: {
          executorAddress: '0x...',
          isAuthorized: true
        }
      },
      updateSafetyParams: {
        action: 'update-safety-params',
        parameters: {
          maxSlippageBPS: 500, // 5%
          minProfitBPS: 100,   // 1%
          maxGasPrice: '50000000000' // 50 gwei
        }
      },
      emergencyWithdraw: {
        action: 'emergency-withdraw',
        parameters: {
          tokenAddress: '0x...USDC',
          toAddress: '0x...recipient'
        }
      }
    },
    warning: 'These actions require admin privileges and should be used with extreme caution'
  })
}
