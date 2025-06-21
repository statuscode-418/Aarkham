"use client"
import { Bot, User } from "lucide-react"
import { ChatMessage as ChatMessageType } from "@/types/chat"

interface ChatMessageProps {
  message: ChatMessageType
}

export const ChatMessageComponent = ({ message }: ChatMessageProps) => {
  const isAI = message.from === "ai"
  
  return (
    <div
      className={`p-2 rounded-lg w-fit max-w-xs shadow-md flex items-start gap-2 ${
        isAI 
          ? "bg-purple-800/80 mr-auto" 
          : "bg-gradient-to-r from-pink-500 to-purple-600 ml-auto flex-row-reverse"
      }`}
    >
      {isAI ? (
        <Bot className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
      ) : (
        <User className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
      )}
      <div className="text-sm">
        {message.text}
        {message.timestamp && (
          <div className="text-xs opacity-70 mt-1">
            {message.timestamp}
          </div>
        )}
      </div>
    </div>
  )
}
