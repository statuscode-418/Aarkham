"use client"
import { useState } from "react"
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
import { Sparkles, Shield, Zap, Send, MessageCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useChat } from "@/hooks/use-chat"
import { LogOut } from "lucide-react"

// Add MetaMask types
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function FurucomboPage() {
  const [started, setStarted] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [tokenName, setTokenName] = useState("")
  const [routerName, setRouterName] = useState("")
  const [tokenAmount, setTokenAmount] = useState("")
  const [blockCount, setBlockCount] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")

  const [newToken, setNewToken] = useState<any | null>(null)
  const tokenOptions = ["ETH", "USDC", "AAVE", "CRV", "stETH", "1INCH", "COMP", "SUSHI", "YFI"]
  const routerOptions = ["Uniswap", "SushiSwap", "Lido", "Curve", "Compound", "Aave", "1inch", "Yearn"]

  // Auth and Chat functionality
  const { logout, address } = useAuth()
  const { messages, sendMessage, isLoading } = useChat({
    agentUrl: process.env.NEXT_PUBLIC_AI_AGENT_URL || "http://localhost:8000",
    walletAddress: address || "",
    sessionId: null
  })

  // MetaMask simulation function
  const triggerMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed!')
      return false
    }

    try {
      // Request account access if needed
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Simulate a transaction (this will show MetaMask popup)
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: (await window.ethereum.request({ method: 'eth_accounts' }))[0],
          to: '0x0000000000000000000000000000000000000000', // Null address for simulation
          value: '0x0', // 0 ETH
          data: '0x', // No data
        }],
      })
      
      console.log('Transaction hash:', txHash)
      return true
    } catch (error: any) {
      if (error.code === 4001) {
        console.log('User rejected the transaction')
      } else {
        console.error('MetaMask error:', error)
      }
      return false
    }
  }

  const handleAddToken = async () => {
    if (blockCount === 0 && (!tokenName || !tokenAmount)) return
    if (blockCount > 0 && (!routerName || !tokenName || !tokenAmount)) return

    // Trigger MetaMask popup
    const success = await triggerMetaMask()
    
    if (success) {
      // Only proceed if MetaMask transaction was successful
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
  }

  // Handler for drag and drop operations
  const handleDragDropOperation = async () => {
    const success = await triggerMetaMask()
    return success
  }

  const handleStart = () => {
    setStarted(true)
    setIsDialogOpen(true)
  }

  // Enhanced logout function (matching home page logic)
  const handleLogout = async () => {
    console.log('Logout button clicked')
    try {
      // Clear local states first
      setStarted(false)
      setIsDialogOpen(false)
      setIsChatOpen(false)
      setBlockCount(0)
      setNewToken(null)
      setChatInput("")
      setTokenName("")
      setRouterName("")
      setTokenAmount("")
      
      // Clear localStorage
      localStorage.removeItem('qr_validated')
      localStorage.removeItem('qr_response')
      console.log('Local storage cleared')
      
      // Call the logout function
      logout()
      console.log('Logout function called')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return
    await sendMessage(chatInput)
    setChatInput("")
  }

  return (
    <div className="h-full bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white">
      {/* Logout Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2 transition-colors duration-200 shadow-lg"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>

      {!started ? (
        <div className="min-h-screen flex items-center justify-center">
           <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Header Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] rounded-full flex items-center justify-center shadow-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] rounded-full blur opacity-75 animate-pulse"></div>
          </div>
        </div>

        {/* Main Heading */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            Token
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              Generator
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-lg mx-auto leading-relaxed">
            To start generating your secure token, click on the start button below
          </p>
        </div>

        {/* Start Button */}
        <div className="space-y-4">
         <Button
            onClick={handleStart}
            className="text-xl px-7 py-3 rounded-full bg-transparent"
          >
            Start
          </Button>
          
          <p className="text-slate-400 text-sm">Click the button above to begin the token generation process</p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
        </div>
      ) : (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white border border-gray-700">
              <DialogHeader>
                <DialogTitle>Add a Token</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {blockCount > 0 && (
                  <Select onValueChange={(value) => setRouterName(value)} value={routerName}>
                    <SelectTrigger className="bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white">
                      <SelectValue placeholder="Select Router Name" />
                    </SelectTrigger>
                    <SelectContent>
                      {routerOptions.map((router) => (
                        <SelectItem key={router} value={router}>
                          {router}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select onValueChange={(value) => setTokenName(value)} value={tokenName}>
                  <SelectTrigger className="bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white">
                    <SelectValue placeholder="Select Token Name" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenOptions.map((token) => (
                      <SelectItem key={token} value={token}>
                        {token}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Token Quantity"
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white"
                />

                <Button onClick={handleAddToken} className="h-10 w-full">
                  Add Block 
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <FurucomboInterface
            newToken={newToken}
            clearNewToken={() => setNewToken(null)}
            triggerAddDialog={() => setIsDialogOpen(true)}
          />
        </>
      )}
      
      {/* Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsChatOpen((prev) => !prev)}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-full"
        >
          <MessageCircle className="w-5 h-5" />
          {isChatOpen ? "Close Chat" : "Ask Rohan"}
        </Button>
      </div>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] border-2 border-purple-500 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in">
          <div className="p-4 font-bold text-white border-b border-purple-700 flex items-center gap-2 bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] rounded-t-2xl">
            <MessageCircle className="w-5 h-5 text-pink-300 animate-bounce" />
            Support Chat
          </div>
          <div className="flex-1 p-4 overflow-y-auto text-sm text-white space-y-2 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg w-fit max-w-xs shadow-md ${msg.from === "ai" ? "bg-purple-800/80" : "bg-gradient-to-r from-pink-500 to-purple-600 ml-auto"}`}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="bg-purple-800/80 p-2 rounded-lg w-fit max-w-xs shadow-md">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-2 border-t border-purple-700 flex gap-2 bg-[#22055d]/60 rounded-b-2xl">
            <Input
              placeholder="Type a message..."
              className="flex-1 bg-[#2a0852] text-white border-none focus:ring-2 focus:ring-pink-400/60"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
              disabled={isLoading}
            />
            <button
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-3 py-1 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50"
              onClick={handleSendMessage}
              disabled={isLoading}
              aria-label="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}