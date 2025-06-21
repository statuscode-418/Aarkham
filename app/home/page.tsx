"use client"
import { useState } from "react"
import FurucomboInterface from "@/components/dragable-cube-component"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
export default function FurucomboPage() {
  const [started, setStarted] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [tokenName, setTokenName] = useState("")
const [routerName, setRouterName] = useState("")
const [tokenAmount, setTokenAmount] = useState("")
const [blockCount, setBlockCount] = useState(0)
  
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
    <div className="min-h-screen bg-[#0D001D] text-white">
      {!started ? (
        <div className="h-screen flex items-center justify-center">
          <Button
            onClick={handleStart}
            className="text-xl px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700"
          >
            Start
          </Button>
        </div>
      ) : (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="bg-gray-900 text-white border border-gray-700">
              <DialogHeader>
                <DialogTitle>Add a Token</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
  {blockCount > 0 && (
    <Select onValueChange={(value) => setRouterName(value)} value={routerName}>
      <SelectTrigger className="bg-gray-800 text-white">
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
    <SelectTrigger className="bg-gray-800 text-white">
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
    className="bg-gray-800 text-white"
  />

  <Button onClick={handleAddToken} className="bg-purple-600 hover:bg-purple-700 w-full">
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
    </div>
  )
}