"use client"

import { useState } from "react"
import { motion, Reorder } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, X } from "lucide-react"

interface TransactionCard {
  id: string
  protocol: string
  token: string
  amount: string
  badge?: string
  color: string
}

interface DraggableCube {
  id: string
  borderColor: string
  glowColor: string
  transactionId: string
}

export default function FurucomboInterface() {
  const [transactions, setTransactions] = useState<TransactionCard[]>([
    {
      id: "1",
      protocol: "vitalik.eth",
      token: "ETH",
      amount: "36",
      color: "bg-blue-500",
    },
    {
      id: "2",
      protocol: "Uniswap V3",
      token: "USDC",
      amount: "20000",
      badge: "Swap Token",
      color: "bg-pink-500",
    },
    {
      id: "3",
      protocol: "Lido",
      token: "ETH",
      amount: "10.9897",
      badge: "Deposit",
      color: "bg-blue-600",
    },
    {
      id: "4",
      protocol: "stETH",
      token: "stETH",
      amount: "10.9897",
      color: "bg-gray-600",
    },
  ])

  const [cubes, setCubes] = useState<DraggableCube[]>([
    {
      id: "cube-1",
      borderColor: "#9ca3af",
      glowColor: "rgba(156, 163, 175, 0.3)",
      transactionId: "1",
    },
    {
      id: "cube-2",
      borderColor: "#ec4899",
      glowColor: "rgba(236, 72, 153, 0.3)",
      transactionId: "2",
    },
    {
      id: "cube-3",
      borderColor: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.3)",
      transactionId: "3",
    },
    {
      id: "cube-4",
      borderColor: "#6b7280",
      glowColor: "rgba(107, 114, 128, 0.3)",
      transactionId: "4",
    },
  ])

  const availableProtocols = [
    { protocol: "Compound", token: "COMP", amount: "150", color: "bg-green-500" },
    { protocol: "Aave", token: "AAVE", amount: "25", color: "bg-purple-500" },
    { protocol: "Curve", token: "CRV", amount: "500", color: "bg-yellow-500" },
    { protocol: "SushiSwap", token: "SUSHI", amount: "75", color: "bg-red-500" },
    { protocol: "1inch", token: "1INCH", amount: "200", color: "bg-indigo-500" },
    { protocol: "Yearn", token: "YFI", amount: "2.5", color: "bg-cyan-500" },
  ]

  const availableCubeStyles = [
    { borderColor: "#10b981", glowColor: "rgba(16, 185, 129, 0.3)" },
    { borderColor: "#8b5cf6", glowColor: "rgba(139, 92, 246, 0.3)" },
    { borderColor: "#eab308", glowColor: "rgba(234, 179, 8, 0.3)" },
    { borderColor: "#ef4444", glowColor: "rgba(239, 68, 68, 0.3)" },
    { borderColor: "#6366f1", glowColor: "rgba(99, 102, 241, 0.3)" },
    { borderColor: "#06b6d4", glowColor: "rgba(6, 182, 212, 0.3)" },
  ]

  const handleCubeReorder = (newCubes: DraggableCube[]) => {
    setCubes(newCubes)

    // Reorder transactions based on cube order
    const newTransactions = newCubes.map((cube) => transactions.find((t) => t.id === cube.transactionId)!)
    setTransactions(newTransactions)
  }

  const addNewCubeAndTransaction = () => {
    const nextIndex = transactions.length
    const protocolData = availableProtocols[nextIndex % availableProtocols.length]
    const cubeStyle = availableCubeStyles[nextIndex % availableCubeStyles.length]

    const newTransactionId = `${nextIndex + 1}`
    const newCubeId = `cube-${nextIndex + 1}`

    const newTransaction: TransactionCard = {
      id: newTransactionId,
      protocol: protocolData.protocol,
      token: protocolData.token,
      amount: protocolData.amount,
      badge: nextIndex % 2 === 0 ? "Swap Token" : undefined,
      color: protocolData.color,
    }

    const newCube: DraggableCube = {
      id: newCubeId,
      borderColor: cubeStyle.borderColor,
      glowColor: cubeStyle.glowColor,
      transactionId: newTransactionId,
    }

    setTransactions([...transactions, newTransaction])
    setCubes([...cubes, newCube])
  }

  const deleteCubeAndTransaction = (cubeId: string) => {
    const cubeToDelete = cubes.find(cube => cube.id === cubeId)
    if (!cubeToDelete) return

    // Remove the cube
    const newCubes = cubes.filter(cube => cube.id !== cubeId)
    setCubes(newCubes)

    // Remove the corresponding transaction
    const newTransactions = transactions.filter(transaction => transaction.id !== cubeToDelete.transactionId)
    setTransactions(newTransactions)
  }

  const clearAllCubesAndTransactions = () => {
    setCubes([])
    setTransactions([])
  }

  const EnhancedCube = ({ borderColor, glowColor }: { borderColor: string; glowColor: string }) => {
    return (
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg">
          <defs>
            <filter id={`glow-${borderColor.replace("#", "")}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Shadow/depth effect */}
          <g opacity="0.2">
            <polygon points="20,30 70,30 70,80 20,80" fill={borderColor} />
            <polygon points="20,30 35,15 85,15 70,30" fill={borderColor} />
            <polygon points="70,30 85,15 85,65 70,80" fill={borderColor} />
          </g>

          {/* Main cube outline */}
          <g filter={`url(#glow-${borderColor.replace("#", "")})`}>
            {/* Front face */}
            <polygon
              points="15,25 65,25 65,75 15,75"
              fill="none"
              stroke={borderColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Top face */}
            <polygon
              points="15,25 30,10 80,10 65,25"
              fill="none"
              stroke={borderColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right face */}
            <polygon
              points="65,25 80,10 80,60 65,75"
              fill="none"
              stroke={borderColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>

        {/* Subtle glow effect */}
        <div
          className="absolute inset-0 rounded-lg opacity-20 blur-sm"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          }}
        />
      </div>
    )
  }

  const EnhancedDottedCube = () => {
    return (
      <div className="relative group h-[120px] flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg">
          {/* Dotted cube outline */}
          <g className="group-hover:opacity-80 transition-opacity">
            <polygon
              points="15,25 65,25 65,75 15,75"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
              strokeDasharray="5,5"
              strokeLinecap="round"
            />
            <polygon
              points="15,25 30,10 80,10 65,25"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
              strokeDasharray="5,5"
              strokeLinecap="round"
            />
            <polygon
              points="65,25 80,10 80,60 65,75"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
              strokeDasharray="5,5"
              strokeLinecap="round"
            />
          </g>

          {/* Plus icon positioned in the center of the front face */}
          <g className="group-hover:opacity-80 transition-opacity">
            <line x1="25" y1="50" x2="55" y2="50" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
            <line x1="40" y1="35" x2="40" y2="65" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="flex items-start justify-center gap-20 max-w-7xl mx-auto">
            {/* Left - Draggable Cubes */}
            <div className="flex flex-col items-center space-y-2">
              <Reorder.Group axis="y" values={cubes} onReorder={handleCubeReorder} className="space-y-2">
                {cubes.map((cube, index) => (
                  <Reorder.Item key={cube.id} value={cube} className="cursor-grab active:cursor-grabbing relative group">
                    <motion.div
                      whileHover={{
                        scale: 1.08,
                        rotateY: 5,
                        rotateX: -5,
                        transition: { duration: 0.3, ease: "easeOut" },
                      }}
                      whileDrag={{
                        scale: 1.15,
                        rotateY: 10,
                        rotateX: -10,
                        transition: { duration: 0.2 },
                      }}
                      style={{
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <EnhancedCube borderColor={cube.borderColor} glowColor={cube.glowColor} />
                      
                      {/* Delete button - appears on hover */}
                      <motion.button
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCubeAndTransaction(cube.id)
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={12} />
                      </motion.button>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Add Cube Button */}
              <motion.div
                className="cursor-pointer mt-2"
                onClick={addNewCubeAndTransaction}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <EnhancedDottedCube />
              </motion.div>

              {/* Clear All Button */}
              {cubes.length > 0 && (
                <motion.div
                  className="mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearAllCubesAndTransactions}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Clear All
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Right - Transaction Cards */}
            <div className="flex flex-col space-y-2 min-w-0 flex-1 max-w-md">
              {transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  layout
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700/50 hover:bg-gray-700/80 transition-all duration-300 shadow-lg hover:shadow-xl h-[120px] flex items-center">
                    <CardContent className="p-5 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-10 h-10 rounded-full ${transaction.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                          >
                            <span className="text-white text-sm font-bold">{transaction.token.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-white font-semibold truncate text-base">
                                {transaction.protocol}
                              </span>
                              {transaction.badge && (
                                <Badge className="bg-pink-500/90 hover:bg-pink-500 text-xs flex-shrink-0 px-2 py-1">
                                  {transaction.badge}
                                </Badge>
                              )}
                            </div>
                            <div className="text-gray-400 text-sm font-medium">{transaction.token}</div>
                          </div>
                        </div>
                        <div className="text-white font-bold text-xl flex-shrink-0 bg-gray-700/50 px-3 py-1 rounded-lg">
                          {transaction.amount}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
