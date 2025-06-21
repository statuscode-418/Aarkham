"""
Pydantic models for request/response schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class ChatRequest(BaseModel):
    message: str
    wallet_address: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    wallet_address: str


class SessionsResponse(BaseModel):
    sessions: List[str]
    wallet_address: str


class SessionHistoryResponse(BaseModel):
    history: List[Dict[str, Any]]
    session_id: str
    wallet_address: str
