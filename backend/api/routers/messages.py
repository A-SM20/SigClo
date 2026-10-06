from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import asc
from db.database import get_db
from db.models import User, Message, ConversationMember, MessageReceipt
from schemas.message import MessageResponse
from api.deps import get_current_user

router = APIRouter()

@router.get("/{conversation_id}", response_model=List[MessageResponse])
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify membership
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")
        
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(asc(Message.created_at)).limit(50).all()
    
    msg_ids = [m.id for m in messages]
    receipts = db.query(MessageReceipt).filter(MessageReceipt.message_id.in_(msg_ids)).all()
    
    receipts_by_msg = {}
    for r in receipts:
        if r.message_id not in receipts_by_msg:
            receipts_by_msg[r.message_id] = {}
        receipts_by_msg[r.message_id][r.user_id] = r.status

    response = []
    for m in messages:
        m_dict = m.__dict__.copy()
        m_dict["receipts"] = receipts_by_msg.get(m.id, {})
        response.append(MessageResponse(**m_dict))
        
    return response
