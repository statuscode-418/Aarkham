import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { polygon } from 'viem/chains' // Replace with your target chain
import { FLASH_LOAN_EXECUTOR_ADDRESS, FLASH_LOAN_EXECUTOR_ABI } from '@/lib/abi'

// Initialize Viem client
const publicClient = createPublicClient({
  chain: polygon, // Replace with your target chain
  transport: http(process.env.RPC_URL)
})

// GET list of strategies with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // Max 50 per page
    const creatorFilter = searchParams.get('creator')
    const activeOnly = searchParams.get('active') === 'true'

    // Get total number of strategies
    const nextStrategyId = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'nextStrategyId'
    })

    const totalStrategies = Number(nextStrategyId) - 1 // nextStrategyId starts from 1

    if (totalStrategies <= 0) {
      return NextResponse.json({
        success: true,
        strategies: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Calculate pagination
    const totalPages = Math.ceil(totalStrategies / limit)
    const skip = (page - 1) * limit

    // Fetch strategies in the requested range
    const strategies = []
    const startId = Math.max(1, totalStrategies - skip - limit + 1)
    const endId = Math.min(totalStrategies, totalStrategies - skip)

    for (let id = endId; id >= startId; id--) { // Reverse order to get newest first
      try {
        // Get basic strategy info
        const strategy = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'getStrategy',
          args: [BigInt(id)]
        })

        // Get full strategy details
        const fullStrategy = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'strategies',
          args: [BigInt(id)]
        })

        // Apply filters
        if (creatorFilter && strategy[1].toLowerCase() !== creatorFilter.toLowerCase()) {
          continue
        }

        if (activeOnly && !strategy[2]) {
          continue
        }

        // Get action count
        const actionCount = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'getStrategyActionsCount',
          args: [BigInt(id)]
        })

        const strategyData = {
          id: id.toString(),
          creator: strategy[1],
          active: strategy[2],
          minProfitBPS: strategy[3]?.toString(),
          executionCount: strategy[4]?.toString(),
          totalProfit: strategy[5]?.toString(),
          strategyType: fullStrategy[1],
          maxGasPrice: fullStrategy[5]?.toString(),
          deadline: fullStrategy[6]?.toString(),
          name: fullStrategy[7],
          description: fullStrategy[8],
          createdAt: fullStrategy[11]?.toString(),
          actionCount: Number(actionCount),
          status: strategy[2] ? 'Active' : 'Inactive'
        }

        strategies.push(strategyData)
      } catch (error) {
        console.warn(`Could not fetch strategy ${id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      strategies,
      pagination: {
        page,
        limit,
        total: totalStrategies,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        creator: creatorFilter,
        activeOnly
      }
    })

  } catch (error) {
    console.error('Error fetching strategies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch strategies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST endpoint to search strategies by specific criteria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      creator, 
      minProfit, 
      maxProfit, 
      strategyType, 
      active, 
      searchTerm,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = body

    // Validate parameters
    if (creator && !isAddress(creator)) {
      return NextResponse.json(
        { error: 'Invalid creator address' },
        { status: 400 }
      )
    }

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 50)

    // Get total strategies
    const nextStrategyId = await publicClient.readContract({
      address: FLASH_LOAN_EXECUTOR_ADDRESS,
      abi: FLASH_LOAN_EXECUTOR_ABI,
      functionName: 'nextStrategyId'
    })

    const totalStrategies = Number(nextStrategyId) - 1

    if (totalStrategies <= 0) {
      return NextResponse.json({
        success: true,
        strategies: [],
        pagination: { page: 1, limit: limitNum, total: 0, totalPages: 0 }
      })
    }

    // Fetch and filter strategies
    const matchingStrategies = []

    for (let id = 1; id <= totalStrategies; id++) {
      try {
        const strategy = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'getStrategy',
          args: [BigInt(id)]
        })

        const fullStrategy = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'strategies',
          args: [BigInt(id)]
        })

        // Apply filters
        if (creator && strategy[1].toLowerCase() !== creator.toLowerCase()) continue
        if (typeof active === 'boolean' && strategy[2] !== active) continue
        if (typeof strategyType === 'number' && fullStrategy[1] !== strategyType) continue
        
        const totalProfitNum = Number(strategy[5])
        if (typeof minProfit === 'number' && totalProfitNum < minProfit) continue
        if (typeof maxProfit === 'number' && totalProfitNum > maxProfit) continue
        
        if (searchTerm && !fullStrategy[7].toLowerCase().includes(searchTerm.toLowerCase()) && 
            !fullStrategy[8].toLowerCase().includes(searchTerm.toLowerCase())) continue

        const actionCount = await publicClient.readContract({
          address: FLASH_LOAN_EXECUTOR_ADDRESS,
          abi: FLASH_LOAN_EXECUTOR_ABI,
          functionName: 'getStrategyActionsCount',
          args: [BigInt(id)]
        })

        const strategyData = {
          id: id.toString(),
          creator: strategy[1],
          active: strategy[2],
          minProfitBPS: strategy[3]?.toString(),
          executionCount: strategy[4]?.toString(),
          totalProfit: strategy[5]?.toString(),
          strategyType: fullStrategy[1],
          maxGasPrice: fullStrategy[5]?.toString(),
          deadline: fullStrategy[6]?.toString(),
          name: fullStrategy[7],
          description: fullStrategy[8],
          createdAt: fullStrategy[11]?.toString(),
          actionCount: Number(actionCount)
        }

        matchingStrategies.push(strategyData)
      } catch (error) {
        console.warn(`Could not process strategy ${id}:`, error)
      }
    }

    // Sort strategies
    matchingStrategies.sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'totalProfit':
          aVal = Number(a.totalProfit)
          bVal = Number(b.totalProfit)
          break
        case 'executionCount':
          aVal = Number(a.executionCount)
          bVal = Number(b.executionCount)
          break
        case 'createdAt':
          aVal = Number(a.createdAt)
          bVal = Number(b.createdAt)
          break
        default:
          aVal = a.name
          bVal = b.name
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1
      } else {
        return aVal > bVal ? 1 : -1
      }
    })

    // Apply pagination
    const totalMatching = matchingStrategies.length
    const totalPages = Math.ceil(totalMatching / limitNum)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum
    const paginatedStrategies = matchingStrategies.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      strategies: paginatedStrategies,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMatching,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        creator,
        minProfit,
        maxProfit,
        strategyType,
        active,
        searchTerm,
        sortBy,
        sortOrder
      }
    })

  } catch (error) {
    console.error('Error searching strategies:', error)
    return NextResponse.json(
      { error: 'Failed to search strategies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
