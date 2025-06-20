import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const endpoints = {
    "API Documentation": {
      "description": "Flash Loan Executor AI Agent API Endpoints",
      "version": "1.0.0",
      "baseUrl": process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    },
    
    "Strategy Management": {
      "create": {
        "endpoint": "/api/strategies/create",
        "method": "POST",
        "description": "Create a new flash loan strategy",
        "parameters": {
          "name": "string - Strategy name",
          "actionTypes": "number[] - Array of action type enums",
          "targets": "string[] - Array of target contract addresses", 
          "datas": "string[] - Array of encoded function call data",
          "minProfitBPS": "number - Minimum profit in basis points"
        }
      },
      
      "execute": {
        "endpoint": "/api/strategies/execute", 
        "method": "POST",
        "description": "Execute a flash loan strategy",
        "parameters": {
          "strategyId": "number - ID of strategy to execute",
          "assets": "string[] - Asset addresses for flash loan",
          "amounts": "string[] - Amounts to borrow (in wei)"
        }
      },
      
      "query": {
        "endpoint": "/api/strategies/query",
        "method": "GET", 
        "description": "Get instructions for querying strategy data",
        "parameters": {
          "strategyId": "number - Strategy ID (optional)",
          "walletAddress": "string - Wallet address (optional)"
        }
      },
      
      "templates": {
        "endpoint": "/api/strategies/templates",
        "method": "POST",
        "description": "Generate strategy templates",
        "supportedTypes": ["arbitrage", "yield-farming", "liquidation", "refinancing"]
      }
    },
    
    "Analytics & Calculations": {
      "calculate": {
        "endpoint": "/api/analytics/calculate",
        "method": "POST", 
        "description": "Perform DeFi calculations",
        "supportedCalculations": [
          "uniswap-output",
          "price-impact", 
          "min-amount-out",
          "gas-estimate",
          "max-gas-price",
          "strategy-validation"
        ]
      }
    },
    
    "Admin Actions": {
      "actions": {
        "endpoint": "/api/admin/actions",
        "method": "POST",
        "description": "Execute administrative actions", 
        "supportedActions": [
          "set-dex-router",
          "set-authorized-executor",
          "toggle-emergency-stop", 
          "update-safety-params",
          "emergency-withdraw"
        ],
        "warning": "Requires admin privileges"
      }
    },
    
    "AI Agent Integration": {
      "workflow": {
        "description": "Recommended workflow for AI agents",
        "steps": [
          "1. Use /api/strategies/templates to generate strategy templates",
          "2. Use /api/analytics/calculate to validate profitability", 
          "3. Use /api/strategies/create to create the strategy",
          "4. Use /api/strategies/execute to execute when conditions are met",
          "5. Use /api/strategies/query to monitor performance"
        ]
      },
      
      "examples": {
        "arbitrage_bot": {
          "description": "Example arbitrage bot workflow",
          "steps": [
            "POST /api/strategies/templates with arbitrage parameters",
            "POST /api/analytics/calculate to check price differences", 
            "POST /api/strategies/create when profitable opportunity found",
            "POST /api/strategies/execute to capture arbitrage"
          ]
        }
      }
    },
    
    "Common Token Addresses": {
      "description": "Update these in lib/functions.ts",
      "tokens": {
        "WETH": "0x...",
        "USDC": "0x...", 
        "USDT": "0x...",
        "DAI": "0x..."
      }
    },
    
    "DEX Router Addresses": {
      "description": "Update these in lib/functions.ts",
      "routers": {
        "UNISWAP_V2": "0x...",
        "UNISWAP_V3": "0x...",
        "SUSHISWAP": "0x..."
      }
    },
    
    "Action Types": {
      "description": "Available action types for strategies",
      "types": {
        "SWAP": 0,
        "LEND": 1, 
        "BORROW": 2,
        "STAKE": 3,
        "HARVEST": 4,
        "CUSTOM": 5
      }
    }
  }

  return NextResponse.json(endpoints, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

export async function POST() {
  return NextResponse.json({
    message: "Use GET method to view API documentation",
    availableEndpoints: [
      "GET /api/docs - This documentation",
      "POST /api/strategies/create - Create strategy",
      "POST /api/strategies/execute - Execute strategy", 
      "GET /api/strategies/query - Query strategies",
      "POST /api/strategies/templates - Generate templates",
      "POST /api/analytics/calculate - Perform calculations",
      "POST /api/admin/actions - Admin actions"
    ]
  })
}
