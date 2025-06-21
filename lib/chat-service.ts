import { ChatMessage, ChatConfig } from "@/types/chat"

export class ChatService {
  private agentUrl: string

  constructor(agentUrl: string) {
    this.agentUrl = agentUrl
  }

  async sendMessage(
    message: string, 
    walletAddress: string, 
    sessionId: string | null
  ): Promise<{ response: string; session_id: string }> {
    const response = await fetch(`${this.agentUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        wallet_address: walletAddress,
        session_id: sessionId
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async getSessionHistory(
    walletAddress: string, 
    sessionId: string
  ): Promise<ChatMessage[]> {
    const response = await fetch(`${this.agentUrl}/api/sessions/${walletAddress}/${sessionId}/history`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.history || []
  }

  async getSessions(walletAddress: string): Promise<string[]> {
    const response = await fetch(`${this.agentUrl}/api/sessions/${walletAddress}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.sessions || []
  }

  async deleteSession(walletAddress: string, sessionId: string): Promise<void> {
    const response = await fetch(`${this.agentUrl}/api/sessions/${walletAddress}/${sessionId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  }
}
