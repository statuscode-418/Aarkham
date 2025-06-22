"use client"

import { useState,useEffect } from "react"
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
interface FurucomboInterfaceProps {
  initialTransactions?: TransactionCard[]
  initialCubes?: DraggableCube[]
  triggerAddDialog?: () => void
  newToken?: {
    protocol: string
    token: string
    amount: string
  }
  clearNewToken?: () => void
  onDragDropOperation?: () => Promise<boolean>
}
export default function FurucomboInterface({
  initialTransactions = [],
  initialCubes = [],
  triggerAddDialog,
  newToken,
  clearNewToken,
  onDragDropOperation,
}: FurucomboInterfaceProps) {
  
  const [transactions, setTransactions] = useState<TransactionCard[]>(initialTransactions)
  const [cubes, setCubes] = useState<DraggableCube[]>(initialCubes)
useEffect(() => {
  if (newToken) {
    const nextIndex = transactions.length
    const id = `${nextIndex + 1}`

    const newTransaction: TransactionCard = {
      id,
      protocol: newToken.protocol,
      token: newToken.token,
      amount: newToken.amount,
      badge: nextIndex % 2 === 0 ? "Swap Token" : undefined,
      color: "bg-purple-500",
    }

    const newCube: DraggableCube = {
      id: `cube-${id}`,
      borderColor: "#8b5cf6",
      glowColor: "rgba(139, 92, 246, 0.3)",
      transactionId: id,
    }

    setTransactions([...transactions, newTransaction])
    setCubes([...cubes, newCube])

    clearNewToken?.()
  }
}, [newToken])

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
    // Store the previous state in case we need to revert
    const previousCubes = cubes
    const previousTransactions = transactions

    // Immediately update the visual state for smooth UX
    setCubes(newCubes)

    // Reorder transactions based on cube order
    const newTransactions = newCubes.map((cube) => transactions.find((t) => t.id === cube.transactionId)!)
    setTransactions(newTransactions)

    // Call the drag drop operation callback if provided
    if (onDragDropOperation) {
      onDragDropOperation().then((success) => {
        if (!success) {
          // If the operation was rejected, revert the changes
          setCubes(previousCubes)
          setTransactions(previousTransactions)
        }
      }).catch((error) => {
        console.error('Drag drop operation failed:', error)
        // Revert on error as well
        setCubes(previousCubes)
        setTransactions(previousTransactions)
      })
    }
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
  const cubeToDelete = cubes.find((cube) => cube.id === cubeId)
  if (!cubeToDelete) return

  // Update cubes
  const newCubes = cubes.filter((cube) => cube.id !== cubeId)
  setCubes(newCubes)

  // Update transactions
  const newTransactions = transactions.filter((tx) => tx.id !== cubeToDelete.transactionId)
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
    <div className="min-h-screen bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white">
      {/* Main layout */}
      <div className="flex-1 p-8">
        <div className="flex items-start justify-center gap-2 md:gap-20 max-w-7xl mx-auto">
          {/* Left Cube List */}
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
              onClick={triggerAddDialog}
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
                    Destroy All Nodes
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
                  {/* // ...inside your transaction cards map... */}
<Card
  className="bg-[#370a6e]/60 border-none rounded-2xl shadow-none px-0 py-0 h-[96px] flex items-center backdrop-blur-md backdrop-saturate-150"
  style={{
    boxShadow: "0 4px 32px 0 rgba(31, 38, 135, 0.15)",
    border: "1px solid rgba(255,255,255,0.08)",
  }}
>
  <CardContent className="p-0 w-full h-full flex flex-col justify-center">
    <div className="flex items-center justify-between px-5 pt-4">
      {/* Left: Badge, Protocol Icon, Protocol Name */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Badge */}
        {transaction.badge && (
          <span className="bg-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-md mr-2">
            {transaction.badge}
          </span>
        )}
        {/* Protocol Icon (placeholder: colored circle with first letter) */}
        {/* <span className="w-5 h-5 rounded-full flex items-center justify-center mr-1" style={{ background: transaction.color }}>
          <span className="text-white text-xs font-bold">{transaction.protocol.charAt(0)}</span>
        </span> */}
        {/* Protocol Name */}
        {/* <span className="text-white font-semibold text-base mr-2">{transaction.protocol}</span> */}
      </div>
      {/* Amount */}
      <div className="text-white font-bold text-lg flex-shrink-0">{transaction.amount}</div>
    </div>
    {/* Token swap row */}
    <div className="flex items-center justify-between px-5 pb-2 pt-2">
      {/* From Token */}
      <div className="flex items-center gap-2">
        {/* Token Icon (placeholder: colored circle with first letter) */}
        <span className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-base font-bold">{transaction.token.charAt(0)}</span>
        </span>
        {/* Token Name */}
        <span className="text-white font-medium text-base">{transaction.token}</span>
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
    
  )
}
