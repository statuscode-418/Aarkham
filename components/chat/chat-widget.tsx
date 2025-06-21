"use client"
import { useState } from "react"
import { ChatConfig } from "@/types/chat"
import { useChat } from "@/hooks/use-chat"
import { ChatWindow } from "./chat-window"
import { ChatToggle } from "./chat-toggle"

interface ChatWidgetProps {
  walletAddress: string
  sessionId?: string | null
  agentUrl?: string
  title?: string
  buttonText?: {
    open: string
    closed: string
  }
}

export const ChatWidget = ({ 
  walletAddress,
  sessionId = null,
  agentUrl = process.env.NEXT_PUBLIC_AI_AGENT_URL || "http://localhost:8000",
  title = "Flash Loan AI Assistant",
  buttonText = { open: "Close Chat", closed: "Ask Rohan" }
}: ChatWidgetProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  
  const chatConfig: ChatConfig = {
    walletAddress,
    sessionId,
    agentUrl
  }

  const { messages, isLoading, sendMessage } = useChat(chatConfig)

  const handleToggleChat = () => {
    setIsChatOpen(prev => !prev)
  }

  return (
    <>
      <ChatToggle 
        isOpen={isChatOpen}
        onToggle={handleToggleChat}
        buttonText={buttonText}
      />
      
      <ChatWindow
        isOpen={isChatOpen}
        messages={messages}
        isLoading={isLoading}
        onSendMessage={sendMessage}
        title={title}
      />
    </>
  )
}
