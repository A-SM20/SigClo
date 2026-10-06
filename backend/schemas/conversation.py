from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from schemas.user import UserResponse

class ContactCreate(BaseModel):
    contact_id: int

class ConversationCreate(BaseModel):
    contact_id: Optional[int] = None # For 1:1

class GroupCreate(BaseModel):
    name: str
    member_ids: List[int]

class ConversationResponse(BaseModel):
    id: int
    is_group: bool
    name: Optional[str]
    created_at: datetime
    # We will compute the other user's name for 1:1 chats
    display_name: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0

    class Config:
        from_attributes = True

class ConversationDetail(ConversationResponse):
    members: List[UserResponse] = []
