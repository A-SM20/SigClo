from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User
from schemas.user import UserCreate, UserLogin, UserResponse, Token
from core.security import get_password_hash, verify_password, create_access_token
from core.config import settings
from api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if user_in.username:
        user = db.query(User).filter(User.username == user_in.username).first()
        if user:
            raise HTTPException(status_code=400, detail="Username already registered")
    if user_in.phone_number:
        user = db.query(User).filter(User.phone_number == user_in.phone_number).first()
        if user:
            raise HTTPException(status_code=400, detail="Phone number already registered")
            
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        phone_number=user_in.phone_number,
        username=user_in.username,
        display_name=user_in.display_name,
        avatar_url=user_in.avatar_url,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == user_in.username_or_phone) | 
        (User.phone_number == user_in.username_or_phone)
    ).first()
    
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
