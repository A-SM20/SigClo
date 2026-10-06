from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc, select
from db.database import get_db
from db.models import User, Conversation, ConversationMember, Message
from schemas.conversation import ConversationCreate, ConversationResponse, GroupCreate
from api.deps import get_current_user

router = APIRouter()

@router.post("/group", response_model=ConversationResponse)
def create_group(
    group_in: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not group_in.name:
        raise HTTPException(status_code=400, detail="Group name required")
    
    # Ensure current user is in the member list
    member_ids = set(group_in.member_ids)
    member_ids.add(current_user.id)
    
    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="Groups must have at least 2 members")

    # Verify all users exist
    valid_users = db.query(User.id).filter(User.id.in_(member_ids)).all()
    if len(valid_users) != len(member_ids):
        raise HTTPException(status_code=404, detail="One or more users not found")

    new_conv = Conversation(is_group=1, name=group_in.name)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    
    # Add members
    members = []
    for uid in member_ids:
        role = "admin" if uid == current_user.id else "member"
        members.append(ConversationMember(conversation_id=new_conv.id, user_id=uid, role=role))
    
    db.add_all(members)
    db.commit()
    
    resp = ConversationResponse.model_validate(new_conv)
    resp.display_name = new_conv.name
    return resp

@router.post("/", response_model=ConversationResponse)
def create_conversation(
    conv_in: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not conv_in.contact_id:
        raise HTTPException(status_code=400, detail="Must provide contact_id for 1:1 chat")
        
    if conv_in.contact_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create conversation with yourself")
        
    target_user = db.query(User).filter(User.id == conv_in.contact_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if 1:1 conversation already exists
    # Find conversations where current_user is a member
    user_convs = db.query(ConversationMember.conversation_id).filter(
        ConversationMember.user_id == current_user.id
    )
    
    # Check if target_user is in any of those AND it's a 1:1 (is_group=0)
    existing_conv = db.query(Conversation).join(
        ConversationMember, Conversation.id == ConversationMember.conversation_id
    ).filter(
        Conversation.id.in_(user_convs),
        ConversationMember.user_id == target_user.id,
        Conversation.is_group == 0
    ).first()
    
    if existing_conv:
        resp = ConversationResponse.model_validate(existing_conv)
        resp.display_name = target_user.display_name
        return resp
        
    # Create new conversation
    new_conv = Conversation(is_group=0)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    
    # Add members
    member1 = ConversationMember(conversation_id=new_conv.id, user_id=current_user.id)
    member2 = ConversationMember(conversation_id=new_conv.id, user_id=target_user.id)
    db.add_all([member1, member2])
    db.commit()
    
    resp = ConversationResponse.model_validate(new_conv)
    resp.display_name = target_user.display_name
    return resp

@router.get("/", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find all conversations the user is part of
    memberships = db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()
    conv_ids = [m.conversation_id for m in memberships]
    
    conversations = db.query(Conversation).filter(Conversation.id.in_(conv_ids)).all()
    
    result = []
    for conv in conversations:
        resp = ConversationResponse.model_validate(conv)
        
        if conv.is_group == 0:
            # Find the other member to get display name
            other_member = db.query(ConversationMember).filter(
                ConversationMember.conversation_id == conv.id,
                ConversationMember.user_id != current_user.id
            ).first()
            if other_member:
                other_user = db.query(User).filter(User.id == other_member.user_id).first()
                if other_user:
                    resp.display_name = other_user.display_name
        else:
            resp.display_name = conv.name
            
        # Get last message
        last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(desc(Message.created_at)).first()
        if last_msg:
            resp.last_message = last_msg.content
            resp.last_message_at = last_msg.created_at
            
        result.append(resp)
        
    # Sort by last message time
    result.sort(key=lambda x: x.last_message_at or x.created_at, reverse=True)
    return result

from schemas.group import AddGroupMember

@router.post("/{conversation_id}/members", response_model=dict)
def add_group_member(
    conversation_id: int,
    member_in: AddGroupMember,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify the conversation exists and is a group
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.is_group == 1).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Group conversation not found")
        
    # Verify current user is a member of the group
    my_membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not my_membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    # Check if target user exists
    target = db.query(User).filter(User.id == member_in.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    # Check if target is already a member
    existing = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == target.id
    ).first()
    if existing:
        return {"status": "success", "message": "User is already a member"}
        
    # Add member
    new_member = ConversationMember(conversation_id=conversation_id, user_id=target.id, role="member")
    db.add(new_member)
    db.commit()
    return {"status": "success", "message": "User added to group"}

@router.delete("/{conversation_id}/members/{user_id}", response_model=dict)
def remove_group_member(
    conversation_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.is_group == 1).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Group conversation not found")
        
    # User can leave by themselves, or an admin can remove them
    my_membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not my_membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    if current_user.id != user_id and my_membership.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to remove others")
        
    target_membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id
    ).first()
    
    if target_membership:
        db.delete(target_membership)
        db.commit()
        
    return {"status": "success", "message": "User removed from group"}
