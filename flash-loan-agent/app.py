from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import asyncio
from contextlib import asynccontextmanager

# Agent imports
from agno.models.google import Gemini
from agno.agent import Agent
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.storage.mongodb import MongoDbStorage
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Environment setup
DB_URL = os.getenv("MONGO_CONNECTION_STRING")
if not DB_URL:
    raise ValueError("MONGO_CONNECTION_STRING environment variable is not set.")

# Import our flash loan tools
from flash_loan_tools import (
    create_flash_loan_strategy,
    execute_flash_loan,
    get_strategy_details,
    validate_profitability,
    estimate_gas_cost,
    analyze_arbitrage_opportunity,
    monitor_strategy_performance,
    get_market_conditions,
    check_flash_loan_availability,
    get_uniswap_quote
)

# Initialize storage
storage = MongoDbStorage(
    db_url=DB_URL,
    collection_name="flash_loan_agent",
)

# Agent functions
def get_agent_for_session(session_id: Optional[str] = None, user_id: str = "user"):
    """
    Get or create an agent for a specific session.
    If no session_id is provided, creates a new session.
    """
    # Generate a new session ID if none provided
    if session_id is None:
        session_id = str(uuid.uuid4())
    
    # Create agent with session-specific storage
    agent = Agent(
        model=Gemini(
            id="gemini-2.5-flash",
        ),
        tools=[
            DuckDuckGoTools(),
            create_flash_loan_strategy,
            execute_flash_loan,
            get_strategy_details,
            validate_profitability,
            estimate_gas_cost,
            analyze_arbitrage_opportunity,
            monitor_strategy_performance,
            get_market_conditions,
            check_flash_loan_availability,
            get_uniswap_quote
        ],
        description="Flash Loan AI Agent - I can help you create, execute, and optimize flash loan strategies on DeFi protocols.",
        storage=storage,
        session_id=session_id,
        user_id=user_id,
        show_tool_calls=True,
        read_chat_history=True,
    )
    
    return agent

def chat_with_agent_streaming(user_input, agent):
    """
    Stream response chunks as they arrive.
    """
    try:
        response_stream = agent.run(user_input, stream=True)
        
        # Handle different response types
        if hasattr(response_stream, '__iter__') and not isinstance(response_stream, (str, bytes)):
            for chunk in response_stream:
                if chunk:
                    # Extract content from event objects
                    if hasattr(chunk, 'content'):
                        content = chunk.content
                    else:
                        content = str(chunk)
                    
                    if content and content.strip():  # Only yield non-empty content
                        yield content
        else:
            # If not iterable, treat as single response
            yield str(response_stream)
    except Exception as e:
        yield f"Error getting response: {e}"

def chat_with_agent_non_streaming(user_input, agent):
    """
    Get complete response without streaming.
    """
    try:
        response = agent.run(user_input, stream=False)
        # Extract content from RunResponse object
        if hasattr(response, 'content'):
            return response.content
        else:
            return str(response)
    except Exception as e:
        return f"Error getting response: {e}"

def chat_with_agent(user_input, agent, stream=True):
    """
    Function to chat with the agent and get a response.
    If stream=True, returns a generator that yields response chunks.
    If stream=False, returns the complete response as a string.
    """
    if stream:
        return chat_with_agent_streaming(user_input, agent)
    else:
        return chat_with_agent_non_streaming(user_input, agent)

def list_sessions(user_id: str = "user") -> List[str]:
    """
    List all available sessions from storage.
    """
    try:
        # Get all session IDs for the user
        sessions = storage.get_all_session_ids(user_id)
        return sessions if sessions else []
    except Exception as e:
        print(f"Error listing sessions: {e}")
        return []

def load_session_history(session_id: str):
    """
    Load conversation history for a session.
    """
    try:
        # Use the correct method name for the MongoDbStorage
        session = storage.read(session_id)
        if session and hasattr(session, 'messages'):
            return session.messages
        return []
    except Exception as e:
        print(f"Error loading session history: {e}")
        return []

def create_chat_session(session_id: str = None, user_id: str = "user"):
    """
    Create a new chat session for programmatic use.
    Returns the agent and session_id for external use.
    """
    agent = get_agent_for_session(session_id, user_id)
    return agent, agent.session_id

def chat_session(message: str, agent, stream: bool = False):
    """
    Send a message to a chat session and get response.
    Convenience wrapper around chat_with_agent for programmatic use.
    """
    return chat_with_agent(message, agent, stream=stream)

# FastAPI components
# Pydantic models for request/response
class ChatRequest(BaseModel):
    message: str
    wallet_address: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    wallet_address: str

class SessionsResponse(BaseModel):
    sessions: list[str]
    wallet_address: str

class SessionHistoryResponse(BaseModel):
    history: list[Dict[str, Any]]
    session_id: str
    wallet_address: str

# Global dictionary to store agents per session to avoid recreating them
agents_cache: Dict[str, Any] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Flash Loan AI Agent API Starting up...")
    yield
    # Shutdown
    print("Flash Loan AI Agent API Shutting down...")
    agents_cache.clear()

# Create FastAPI app
app = FastAPI(
    title="Flash Loan AI Agent API",
    description="API for interacting with Flash Loan AI Agent with session persistence",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_or_create_agent(wallet_address: str, session_id: Optional[str] = None):
    """
    Get or create an agent for a wallet address and session.
    Uses caching to avoid recreating agents unnecessarily.
    """
    cache_key = f"{wallet_address}:{session_id or 'new'}"
    
    if cache_key not in agents_cache:
        agent = get_agent_for_session(session_id, wallet_address)
        agents_cache[cache_key] = agent
        # Update cache key with actual session ID if it was generated
        if session_id is None:
            actual_session_id = agent.session_id
            new_cache_key = f"{wallet_address}:{actual_session_id}"
            if new_cache_key != cache_key:
                agents_cache[new_cache_key] = agent
                # Remove the temporary key
                if cache_key in agents_cache:
                    del agents_cache[cache_key]
            return agent, actual_session_id
        return agent, session_id
    
    agent = agents_cache[cache_key]
    return agent, agent.session_id

@app.get("/api")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Flash Loan AI Agent API",
        "version": "1.0.0",
        "web_client": "/",
        "endpoints": {
            "chat": "/api/chat",
            "chat_stream": "/api/chat/stream",
            "sessions": "/api/sessions/{wallet_address}",
            "session_history": "/api/sessions/{wallet_address}/{session_id}/history"
        }
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the agent - non-streaming response
    """
    try:
        # Get or create agent for the wallet address and session
        agent, session_id = get_or_create_agent(request.wallet_address, request.session_id)
        
        # Get response from agent
        response = chat_with_agent_non_streaming(request.message, agent)
        
        return ChatResponse(
            response=response,
            session_id=session_id,
            wallet_address=request.wallet_address
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Chat with the agent - streaming response
    """
    try:
        # Get or create agent for the wallet address and session
        agent, session_id = get_or_create_agent(request.wallet_address, request.session_id)
        
        async def generate_response():
            """Generator function for streaming response"""
            try:
                # Send initial metadata
                initial_data = {
                    "type": "session_info",
                    "session_id": session_id,
                    "wallet_address": request.wallet_address
                }
                yield f"data: {json.dumps(initial_data)}\n\n"
                
                # Stream the actual response
                for chunk in chat_with_agent_streaming(request.message, agent):
                    if chunk and chunk.strip():
                        chunk_data = {
                            "type": "content",
                            "content": chunk,
                            "session_id": session_id,
                            "wallet_address": request.wallet_address
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Send completion signal
                completion_data = {
                    "type": "complete",
                    "session_id": session_id,
                    "wallet_address": request.wallet_address
                }
                yield f"data: {json.dumps(completion_data)}\n\n"
                
            except Exception as e:
                error_data = {
                    "type": "error",
                    "error": str(e),
                    "session_id": session_id,
                    "wallet_address": request.wallet_address
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(
            generate_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing streaming chat request: {str(e)}")

@app.get("/api/sessions/{wallet_address}", response_model=SessionsResponse)
async def get_sessions(wallet_address: str):
    """
    Get all sessions for a wallet address
    """
    try:
        sessions = list_sessions(wallet_address)
        return SessionsResponse(
            sessions=sessions,
            wallet_address=wallet_address
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sessions: {str(e)}")

@app.get("/api/sessions/{wallet_address}/{session_id}/history", response_model=SessionHistoryResponse)
async def get_session_history(wallet_address: str, session_id: str):
    """
    Get conversation history for a specific session
    """
    try:
        history = load_session_history(session_id)
        return SessionHistoryResponse(
            history=history,
            session_id=session_id,
            wallet_address=wallet_address
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting session history: {str(e)}")

@app.delete("/api/sessions/{wallet_address}/{session_id}")
async def delete_session(wallet_address: str, session_id: str):
    """
    Delete a specific session (clear from cache and potentially from storage)
    """
    try:
        # Remove from cache
        cache_key = f"{wallet_address}:{session_id}"
        if cache_key in agents_cache:
            del agents_cache[cache_key]
        
        # Note: You might want to add actual session deletion from MongoDB here
        # storage.delete_session(session_id) - if such method exists
        
        return {"message": f"Session {session_id} cleared from cache", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "flash-loan-ai-agent"}

# Add a root redirect to index.html
@app.get("/")
async def serve_frontend():
    """Serve the web client at root"""
    return FileResponse('static/index.html')

# Mount static files for assets (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    # Run API mode
    import uvicorn
    
    # Get host and port from environment variables
    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("PORT", "8000"))

    print(f"Starting Flash Loan AI Agent API on {host}:{port}...")
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
