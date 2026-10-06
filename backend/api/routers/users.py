from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User
from schemas.user import UserResponse
from api.deps import get_current_user

router = APIRouter()

@router.get("/search", response_model=List[UserResponse])
def search_users(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).filter(
        (User.id != current_user.id) & 
        ((User.username.ilike(f"%{query}%")) | (User.phone_number.ilike(f"%{query}%")) | (User.display_name.ilike(f"%{query}%")))
    ).limit(20).all()
    return users
