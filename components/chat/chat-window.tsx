"use client"
import { MessageCircle, Bot, Loader2 } from "lucide-react"
import { ChatMessage as ChatMessageType } from "@/types/chat"
import { ChatMessageComponent } from "./chat-message"
import { ChatInput } from "./chat-input"

interface ChatWindowProps {
  isOpen: boolean
  messages: ChatMessageType[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  title?: string
}

export const ChatWindow = ({ 
  isOpen, 
  messages, 
  isLoading, 
  onSendMessage,
  title = "AI Assistant" 
}: ChatWindowProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed bottom-20 right-6 w-80 h-96 bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] border-2 border-purple-500 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-4 font-bold text-white border-b border-purple-700 flex items-center gap-2 bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] rounded-t-2xl">
        <MessageCircle className="w-5 h-5 text-pink-300 animate-bounce" />
        {title}
      </div>
      
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto text-sm text-white space-y-2 custom-scrollbar">
        {messages.map((msg, idx) => (
          <ChatMessageComponent key={idx} message={msg} />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="p-2 rounded-lg w-fit max-w-xs shadow-md bg-purple-800/80 mr-auto flex items-start gap-2">
            <Bot className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is thinking...
            </div>
          </div>
        )}
      </div>
      
      {/* Input */}
      <ChatInput 
        onSendMessage={onSendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}
