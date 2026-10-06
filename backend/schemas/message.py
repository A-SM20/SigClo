from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict

class MessageCreate(BaseModel):
    conversation_id: int
    content: str

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime
    receipts: Optional[Dict[int, str]] = None

    class Config:
        from_attributes = True
