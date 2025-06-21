"use client"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/moving-border"

interface ChatToggleProps {
  isOpen: boolean
  onToggle: () => void
  buttonText?: {
    open: string
    closed: string
  }
}

export const ChatToggle = ({ 
  isOpen, 
  onToggle, 
  buttonText = { open: "Close Chat", closed: "Ask AI" }
}: ChatToggleProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onToggle}
        className="flex items-center gap-2 text-white px-4 py-2 rounded-full"
      >
        <MessageCircle className="w-5 h-5" />
        {isOpen ? buttonText.open : buttonText.closed}
      </Button>
    </div>
  )
}
