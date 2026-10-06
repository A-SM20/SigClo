from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    phone_number: Optional[str] = None
    username: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str # Can be a dummy password or OTP for mock

class UserLogin(BaseModel):
    username_or_phone: str
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
