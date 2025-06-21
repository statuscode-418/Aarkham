"use client"
import { useState, KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
  placeholder?: string
}

export const ChatInput = ({ 
  onSendMessage, 
  isLoading, 
  placeholder = "Type a message..." 
}: ChatInputProps) => {
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSendMessage(input)
    setInput("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend()
    }
  }

  return (
    <div className="p-2 border-t border-purple-700 flex gap-2 bg-[#22055d]/60 rounded-b-2xl">
      <Input
        placeholder={placeholder}
        className="flex-1 bg-[#2a0852] text-white border-none focus:ring-2 focus:ring-pink-400/60"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <button
        className={`bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-3 py-1 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={handleSend}
        disabled={isLoading}
        aria-label="Send"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
