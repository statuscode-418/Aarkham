export interface ChatMessage {
  text: string
  from: "user" | "ai"
  timestamp?: string
}

export interface ChatConfig {
  walletAddress: string
  sessionId: string | null
  agentUrl: string
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  sessionId: string | null
}
