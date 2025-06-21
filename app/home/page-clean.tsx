"use client"
import { useState, useEffect } from "react"
import FurucomboInterface from "@/components/dragable-cube-component"
import { Button } from "@/components/ui/moving-border"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Shield, Zap } from "lucide-react"
import { ChatWidget } from "@/components/chat"

export default function FurucomboPage() {
  const [started, setStarted] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [tokenName, setTokenName] = useState("")
  const [routerName, setRouterName] = useState("")
  const [tokenAmount, setTokenAmount] = useState("")
  const [blockCount, setBlockCount] = useState(0)
  const [walletAddress, setWalletAddress] = useState("0x021E3cBEd15C794513C749c334Ad88AD2617F7E7") // Default wallet for demo

  const [newToken, setNewToken] = useState<any | null>(null)
  const tokenOptions = ["ETH", "USDC", "AAVE", "CRV", "stETH", "1INCH", "COMP", "SUSHI", "YFI"]
  const routerOptions = ["Uniswap", "SushiSwap", "Lido", "Curve", "Compound", "Aave", "1inch", "Yearn"]

  const handleAddToken = () => {
    if (blockCount === 0 && (!tokenName || !tokenAmount)) return
    if (blockCount > 0 && (!routerName || !tokenName || !tokenAmount)) return

    setNewToken({
      protocol: blockCount > 0 ? routerName : tokenName,
      token: tokenName,
      amount: tokenAmount,
    })

    setTokenName("")
    setRouterName("")
    setTokenAmount("")
    setIsDialogOpen(false)
    setBlockCount((prev) => prev + 1)
  }

  const handleStart = () => {
    setStarted(true)
    setIsDialogOpen(true)
  }

  return (
    <div className="h-full bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white">
      <div className="container mx-auto p-8 h-full">
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1 rounded-full">
              <div className="bg-[#0d0221] rounded-full p-3">
                <Sparkles className="w-8 h-8 text-pink-400" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent mb-4">
            Aarkham Protocol
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Advanced DeFi protocol aggregation with AI-powered optimization. 
            Build complex strategies with drag-and-drop simplicity.
          </p>

          <div className="flex justify-center gap-6 mb-12">
            <div className="flex items-center gap-2 text-purple-300">
              <Shield className="w-5 h-5" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2 text-pink-300">
              <Zap className="w-5 h-5" />
              <span>Fast</span>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <Sparkles className="w-5 h-5" />
              <span>AI-Powered</span>
            </div>
          </div>

          {!started ? (
            <Button onClick={handleStart} className="px-8 py-3 text-lg">
              Start Building
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-purple-300 mb-4">
                  Block {blockCount + 1}: {blockCount === 0 ? "Select your starting token" : "Choose protocol"}
                </p>
                <Button onClick={() => setIsDialogOpen(true)} className="px-6 py-2">
                  Add Token
                </Button>
              </div>
            </div>
          )}
        </div>

        {started && (
          <div className="flex justify-center">
            <FurucomboInterface newToken={newToken} />
          </div>
        )}
      </div>

      {/* Token Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] border-purple-500">
          <DialogHeader>
            <DialogTitle className="text-white text-center">
              {blockCount === 0 ? "Select Starting Token" : "Choose Protocol & Token"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {blockCount > 0 && (
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Protocol
                </label>
                <Select onValueChange={setRouterName}>
                  <SelectTrigger className="bg-[#2a0852] border-purple-500 text-white">
                    <SelectValue placeholder="Choose protocol" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a0852] border-purple-500">
                    {routerOptions.map((router) => (
                      <SelectItem key={router} value={router} className="text-white">
                        {router}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">
                Token
              </label>
              <Select onValueChange={setTokenName}>
                <SelectTrigger className="bg-[#2a0852] border-purple-500 text-white">
                  <SelectValue placeholder="Choose token" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a0852] border-purple-500">
                  {tokenOptions.map((token) => (
                    <SelectItem key={token} value={token} className="text-white">
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                className="bg-[#2a0852] border-purple-500 text-white"
              />
            </div>

            <Button 
              onClick={handleAddToken} 
              className="w-full"
              disabled={blockCount === 0 ? (!tokenName || !tokenAmount) : (!routerName || !tokenName || !tokenAmount)}
            >
              Add {blockCount === 0 ? "Starting Token" : "Protocol Block"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chat Widget */}
      <ChatWidget 
        walletAddress={walletAddress}
        buttonText={{ open: "Close Chat", closed: "Ask Rohan" }}
      />
    </div>
  )
}
