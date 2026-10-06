from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from typing import Optional
import jwt
from jwt import InvalidTokenError as JWTError
import json
from sqlalchemy.orm import Session
from ws.manager import manager
from db.database import get_db, SessionLocal
from db.models import User, Message, ConversationMember, MessageReceipt
from core.config import settings
from schemas.message import MessageResponse

router = APIRouter()

async def get_token_user(token: str, db: Session) -> Optional[User]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except JWTError:
        return None

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    user = await get_token_user(token, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await manager.connect(websocket, user.id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                msg_type = payload.get("type")
                
                if msg_type == "chat_message":
                    conversation_id = payload.get("conversation_id")
                    content = payload.get("content")
                    db_session = SessionLocal()
                    try:
                        membership = db_session.query(ConversationMember).filter(
                            ConversationMember.conversation_id == conversation_id,
                            ConversationMember.user_id == user.id
                        ).first()
                        
                        if membership and content:
                            new_msg = Message(
                                conversation_id=conversation_id,
                                sender_id=user.id,
                                content=content
                            )
                            db_session.add(new_msg)
                            db_session.commit()
                            db_session.refresh(new_msg)
                            
                            resp = MessageResponse.model_validate(new_msg)
                            msg_dict = resp.model_dump()
                            msg_dict["created_at"] = msg_dict["created_at"].isoformat()
                            
                            broadcast_payload = {
                                "type": "new_message",
                                "message": msg_dict
                            }
                            
                            await websocket.send_json(broadcast_payload)
                            await manager.broadcast_to_conversation(
                                db=db_session, 
                                conversation_id=conversation_id, 
                                message_data=broadcast_payload,
                                exclude_user_id=user.id
                            )
                    finally:
                        db_session.close()

                elif msg_type in ("typing.start", "typing.stop"):
                    conversation_id = payload.get("conversation_id")
                    if conversation_id:
                        db_session = SessionLocal()
                        try:
                            await manager.broadcast_to_conversation(
                                db=db_session,
                                conversation_id=conversation_id,
                                message_data={
                                    "type": msg_type,
                                    "conversation_id": conversation_id,
                                    "user_id": user.id
                                },
                                exclude_user_id=user.id
                            )
                        finally:
                            db_session.close()

                elif msg_type == "message.receipt_updated":
                    message_id = payload.get("message_id")
                    status = payload.get("status") 
                    
                    db_session = SessionLocal()
                    try:
                        msg = db_session.query(Message).filter(Message.id == message_id).first()
                        if msg:
                            membership = db_session.query(ConversationMember).filter(
                                ConversationMember.conversation_id == msg.conversation_id,
                                ConversationMember.user_id == user.id
                            ).first()
                            
                            if membership:
                                receipt = db_session.query(MessageReceipt).filter(
                                    MessageReceipt.message_id == message_id,
                                    MessageReceipt.user_id == user.id
                                ).first()
                                
                                if receipt:
                                    if receipt.status != "read" or status == "read":
                                        receipt.status = status
                                else:
                                    receipt = MessageReceipt(message_id=message_id, user_id=user.id, status=status)
                                    db_session.add(receipt)
                                
                                db_session.commit()
                                
                                await manager.broadcast_to_conversation(
                                    db=db_session,
                                    conversation_id=msg.conversation_id,
                                    message_data={
                                        "type": "message.receipt_updated",
                                        "message_id": message_id,
                                        "user_id": user.id,
                                        "status": status,
                                        "conversation_id": msg.conversation_id
                                    },
                                    exclude_user_id=user.id
                                )
                    finally:
                        db_session.close()

            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
