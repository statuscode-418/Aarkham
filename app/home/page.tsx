"use client"
import { useState, useEffect } from "react"
import { useRequireAuth, useQRValidation } from "@/hooks/use-auth"
import { useRouter } from 'next/navigation'
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
import { ChatWidget } from "@/components/chat/chat-widget"
import { Sparkles, LogOut } from "lucide-react"

export default function FurucomboPage() {
  const { isAuthenticated, isLoading, logout } = useRequireAuth()
  const { isQRValidated } = useQRValidation()
  const router = useRouter()
  
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

  // Redirect to scanning page if QR is not validated
  useEffect(() => {
    console.log('Home page: isAuthenticated =', isAuthenticated, 'isQRValidated =', isQRValidated);
    if (isAuthenticated && !isQRValidated) {
      console.log('Redirecting to scanning page - QR not validated');
      // Small delay to ensure state is properly set
      const timer = setTimeout(() => {
        router.replace('/scanning-page')
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isQRValidated, router])

  // Show loading while checking authentication
  if (isLoading || !isAuthenticated || !isQRValidated) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

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

  const handleLogout = async () => {
    console.log('Logout button clicked')
    try {
      // Clear local states first
      setStarted(false)
      setIsDialogOpen(false)
      setBlockCount(0)
      setNewToken(null)
      
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

  return (
    <div className="h-full bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] text-white">
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
      
      {/* Chat Widget */}
      <ChatWidget 
        walletAddress={walletAddress}
        buttonText={{ open: "Close Chat", closed: "Ask Rohan" }}
      />

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
    </div>
  )
}
