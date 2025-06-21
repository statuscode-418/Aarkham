"use client"
import { useState, useCallback } from "react"
import { ChatMessage, ChatConfig } from "@/types/chat"
import { ChatService } from "@/lib/chat-service"

export const useChat = (config: ChatConfig) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      text: "Hi! I'm your Flash Loan AI Assistant. I can help you create, analyze, and optimize flash loan strategies. How can I assist you today?", 
      from: "ai", 
      timestamp: new Date().toLocaleTimeString() 
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(config.sessionId)

  const chatService = new ChatService(config.agentUrl)

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    // Add user message to chat
    const userMessage: ChatMessage = { 
      text: message, 
      from: "user", 
      timestamp: new Date().toLocaleTimeString() 
    }
    setMessages(prev => [...prev, userMessage])

    setIsLoading(true)
    try {
      const data = await chatService.sendMessage(message, config.walletAddress, sessionId)
      
      // Update session ID if it's a new session
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id)
      }

      // Add AI response to messages
      setMessages(prev => [...prev, { 
        text: data.response, 
        from: "ai" as const, 
        timestamp: new Date().toLocaleTimeString() 
      }])

    } catch (error) {
      console.error('Error sending message to AI:', error)
      setMessages(prev => [...prev, { 
        text: "Sorry, I'm having trouble connecting to the AI service. Please try again later.", 
        from: "ai" as const, 
        timestamp: new Date().toLocaleTimeString() 
      }])
    } finally {
      setIsLoading(false)
    }
  }, [config.walletAddress, sessionId, isLoading, chatService])

  const loadSessionHistory = useCallback(async (targetSessionId: string) => {
    try {
      const history = await chatService.getSessionHistory(config.walletAddress, targetSessionId)
      if (history.length > 0) {
        setMessages(history)
        setSessionId(targetSessionId)
      }
    } catch (error) {
      console.error('Error loading session history:', error)
    }
  }, [config.walletAddress, chatService])

  const clearChat = useCallback(() => {
    setMessages([
      { 
        text: "Hi! I'm your Flash Loan AI Assistant. I can help you create, analyze, and optimize flash loan strategies. How can I assist you today?", 
        from: "ai", 
        timestamp: new Date().toLocaleTimeString() 
      },
    ])
    setSessionId(null)
  }, [])

  return {
    messages,
    isLoading,
    sessionId,
    sendMessage,
    loadSessionHistory,
    clearChat,
    chatService
  }
}
