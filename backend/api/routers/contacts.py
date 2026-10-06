from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User, Contact
from schemas.user import UserResponse
from schemas.conversation import ContactCreate
from api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = db.query(User).join(Contact, User.id == Contact.contact_id).filter(
        Contact.user_id == current_user.id
    ).all()
    return contacts

@router.post("/", response_model=UserResponse)
def add_contact(
    contact_in: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if contact_in.contact_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")
        
    target_user = db.query(User).filter(User.id == contact_in.contact_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_id == contact_in.contact_id
    ).first()
    
    if not existing:
        new_contact = Contact(user_id=current_user.id, contact_id=contact_in.contact_id)
        db.add(new_contact)
        db.commit()
        
    return target_user
