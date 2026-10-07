from typing import Dict, List
from fastapi import WebSocket
from sqlalchemy.orm import Session
from db.models import ConversationMember

class ConnectionManager:
    def __init__(self):
        # Maps user_id to a list of active websocket connections
        self.active_connections: Dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(message)
                
    async def broadcast_to_conversation(self, db: Session, conversation_id: int, message_data: dict, exclude_user_id: int = None):
        members = db.query(ConversationMember.user_id).filter(
            ConversationMember.conversation_id == conversation_id
        ).all()
        
        for (member_id,) in members:
            if exclude_user_id and member_id == exclude_user_id:
                continue
            if member_id in self.active_connections:
                # Iterate over a copy of the list in case disconnect() is called concurrently
                for connection in list(self.active_connections[member_id]):
                    try:
                        await connection.send_json(message_data)
                    except Exception:
                        self.disconnect(connection, member_id)

manager = ConnectionManager()
