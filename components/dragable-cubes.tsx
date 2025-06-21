"use client"

import { useState, useRef, useEffect } from "react"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, X } from "lucide-react"

interface TokenData {
  id: string
  type: "Send Token" | "Swap Token" | "Stake Token" | "Bridge Token" | "Lend Token"
  protocol: string
  fromToken: string
  toToken?: string
  fromAmount: string
  toAmount?: string
  address?: string
  color: string
  cubeColor: string
}

const initialTokens: TokenData[] = [
  {
    id: "1",
    type: "Send Token",
    protocol: "Utility",
    fromToken: "ETH",
    fromAmount: "36",
    address: "vitalik.eth",
    color: "bg-blue-600",
    cubeColor: "#ef4444",
  },
  {
    id: "2",
    type: "Swap Token",
    protocol: "Uniswap V3",
    fromToken: "USDC",
    toToken: "ETH",
    fromAmount: "20000",
    toAmount: "10.9897",
    color: "bg-pink-600",
    cubeColor: "#3b82f6",
  },
  {
    id: "3",
    type: "Stake Token",
    protocol: "Lido",
    fromToken: "ETH",
    toToken: "stETH",
    fromAmount: "5.5",
    toAmount: "5.5",
    color: "bg-green-600",
    cubeColor: "#6b7280",
  },
  {
    id: "4",
    type: "Bridge Token",
    protocol: "Arbitrum",
    fromToken: "ETH",
    toToken: "ETH",
    fromAmount: "12.3",
    toAmount: "12.3",
    color: "bg-purple-600",
    cubeColor: "#8b5cf6",
  },
  {
    id: "5",
    type: "Lend Token",
    protocol: "Aave",
    fromToken: "USDC",
    fromAmount: "50000",
    address: "lending.pool",
    color: "bg-orange-600",
    cubeColor: "#f97316",
  },
]

export default function Component() {
  const [tokens, setTokens] = useState(initialTokens)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, tokenId: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()

    if (containerRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setDragPosition({
        x: e.clientX - containerRect.left - (e.clientX - rect.left),
        y: e.clientY - containerRect.top - (e.clientY - rect.top),
      })
    }

    setDraggedItem(tokenId)
    setIsDragging(true)
    e.preventDefault()
  }

  const handleMouseUp = () => {
    setDraggedItem(null)
    setDragOffset({ x: 0, y: 0 })
    setDragPosition({ x: 0, y: 0 })
    setHoveredIndex(null)
    setIsDragging(false)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggedItem || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()

      setDragPosition({
        x: e.clientX - containerRect.left - dragOffset.x,
        y: e.clientY - containerRect.top - dragOffset.y,
      })

      const mouseY = e.clientY - containerRect.top - dragOffset.y
      const itemHeight = 140
      const newIndex = Math.max(0, Math.min(tokens.length - 1, Math.floor((mouseY + itemHeight / 2) / itemHeight)))
      setHoveredIndex(newIndex)

      const currentIndex = tokens.findIndex((token) => token.id === draggedItem)
      if (newIndex !== currentIndex) {
        const newTokens = [...tokens]
        const [moved] = newTokens.splice(currentIndex, 1)
        newTokens.splice(newIndex, 0, moved)
        setTokens(newTokens)
      }
    }

    const handleGlobalMouseUp = () => handleMouseUp()

    document.addEventListener("mousemove", handleGlobalMouseMove)
    document.addEventListener("mouseup", handleGlobalMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove)
      document.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [isDragging, draggedItem, dragOffset, tokens])

  const deleteToken = (tokenId: string) => {
    setTokens(prevTokens => prevTokens.filter(token => token.id !== tokenId))
  }

  const clearAllTokens = () => {
    setTokens([])
  }

  const addNewToken = () => {
    const newToken: TokenData = {
      id: `${tokens.length + 1}`,
      type: "Swap Token",
      protocol: "New Protocol",
      fromToken: "TOKEN",
      toToken: "NEW",
      fromAmount: "100",
      toAmount: "100",
      color: "bg-blue-600",
      cubeColor: "#3b82f6",
    }
    setTokens([...tokens, newToken])
  }

  const WireframeCube = ({
    tokenId,
    isDragged,
    cubeColor,
    index,
  }: {
    tokenId: string
    isDragged?: boolean
    cubeColor: string
    index: number
  }) => (
    <div
      className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragged ? "opacity-40 pointer-events-none" : "hover:scale-105"
      }`}
      onMouseDown={(e) => handleMouseDown(e, tokenId)}
      style={{
        width: "120px",
        height: "120px",
        animation: !isDragged ? `float-${index % 3} 4s ease-in-out infinite` : "none",
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{
          animation: !isDragged ? `pulse-${index % 2} 3s ease-in-out infinite` : "none",
        }}
      >
        <g stroke={cubeColor} strokeWidth="2.5" fill="none" opacity="0.9">
          <rect x="20" y="35" width="45" height="45" />
          <rect x="35" y="20" width="45" height="45" />
          <line x1="20" y1="35" x2="35" y2="20" />
          <line x1="65" y1="35" x2="80" y2="20" />
          <line x1="65" y1="80" x2="80" y2="65" />
          <line x1="20" y1="80" x2="35" y2="65" />
        </g>
      </svg>
    </div>
  )

  const TokenCard = ({
    token,
    isHovered,
    isDragged,
    dragPosition,
  }: {
    token: TokenData
    isHovered?: boolean
    isDragged?: boolean
    dragPosition?: { x: number; y: number }
  }) => (
    <Card
      className={`bg-gray-800 border-gray-700 text-white transition-all duration-300 relative group ${
        isHovered ? "ring-2 ring-blue-500 bg-gray-750 scale-105" : ""
      } ${isDragged ? "opacity-40" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className={token.color}>
            {token.type}
          </Badge>
          <span className="text-sm text-gray-400">{token.protocol}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
            {token.fromToken === "ETH" ? "Ξ" : token.fromToken.charAt(0)}
          </div>
          <span className="text-sm">{token.fromToken}</span>
          <span className="text-lg font-bold ml-auto">{token.fromAmount}</span>
        </div>
        {token.address && <div className="text-sm text-gray-400 mb-2">{token.address}</div>}
        {token.toToken && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
              {token.toToken === "ETH" ? "Ξ" : token.toToken.charAt(0)}
            </div>
            <span className="text-sm">{token.toToken}</span>
            <span className="text-lg font-bold ml-auto">{token.toAmount}</span>
          </div>
        )}
      </CardContent>
      
      {/* Delete button - appears on hover */}
      <button
        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        onClick={(e) => {
          e.stopPropagation()
          deleteToken(token.id)
        }}
      >
        <X size={12} />
      </button>
    </Card>
  )

  return (
    <div className="min-h-screen bg-zinc-900 p-8 select-none">
      <div ref={containerRef} className="max-w-4xl mx-auto relative">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Rohan is Gay</h1>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={addNewToken}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add Block
            </Button>
            
            {tokens.length > 0 && (
              <Button
                variant="destructive"
                onClick={clearAllTokens}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Trash2 size={16} />
                Clear All
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-6 relative">
          {tokens.map((token, index) => {
            const isDragged = draggedItem === token.id
            const isHovered = hoveredIndex === index && draggedItem !== null && !isDragged

            return (
              <div
                key={token.id}
                className={`flex items-center gap-8 transition-all duration-300 ease-out ${
                  isHovered ? "transform translate-y-2" : ""
                }`}
              >
                <WireframeCube tokenId={token.id} cubeColor={token.cubeColor} index={index} isDragged={isDragged} />
                <div className="flex-1">
                  <TokenCard
                    token={token}
                    isHovered={isHovered}
                    isDragged={isDragged}
                    dragPosition={isDragged ? dragPosition : undefined}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Drag Preview with Cube + Card */}
        {draggedItem && (
          <div
            className="fixed pointer-events-none z-50 flex items-center gap-4"
            style={{
              left: 0,
              top: 0,
              transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`,
            }}
          >
            <WireframeCube
              tokenId={draggedItem}
              cubeColor={tokens.find((t) => t.id === draggedItem)?.cubeColor || "#6b7280"}
              index={0}
            />
            <TokenCard token={tokens.find((t) => t.id === draggedItem)!} />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float-0 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-0 {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
        @keyframes pulse-1 {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.03); }
        }
      `}</style>
    </div>
  )
}
