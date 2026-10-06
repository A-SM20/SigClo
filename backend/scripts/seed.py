import os
import sys
import asyncio
from sqlalchemy.orm import Session
from passlib.context import CryptContext

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import SessionLocal, engine, Base
from db.models import User, Conversation, ConversationMember, Message
from core.security import get_password_hash

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(User).first():
        print("Database already contains users. Skipping seed.")
        db.close()
        return

    print("Seeding Users...")
    users = [
        User(phone_number="+15550001111", display_name="Alice (Demo)", password_hash=get_password_hash("password")),
        User(phone_number="+15550002222", display_name="Bob (Demo)", password_hash=get_password_hash("password")),
        User(phone_number="+15550003333", display_name="Charlie (Demo)", password_hash=get_password_hash("password"))
    ]
    db.add_all(users)
    db.commit()
    
    for u in users:
        db.refresh(u)
        
    print("Seeding Conversations...")
    # 1:1 Alice <-> Bob
    c1 = Conversation(is_group=False)
    db.add(c1)
    db.commit()
    db.refresh(c1)
    
    db.add_all([
        ConversationMember(conversation_id=c1.id, user_id=users[0].id, role="member"),
        ConversationMember(conversation_id=c1.id, user_id=users[1].id, role="member")
    ])
    
    # Group Alice, Bob, Charlie
    c2 = Conversation(is_group=True, name="Engineering Team")
    db.add(c2)
    db.commit()
    db.refresh(c2)
    
    db.add_all([
        ConversationMember(conversation_id=c2.id, user_id=users[0].id, role="admin"),
        ConversationMember(conversation_id=c2.id, user_id=users[1].id, role="member"),
        ConversationMember(conversation_id=c2.id, user_id=users[2].id, role="member")
    ])
    db.commit()

    print("Seeding Messages...")
    db.add_all([
        Message(conversation_id=c1.id, sender_id=users[0].id, content="Hey Bob, did you see the new deployment?"),
        Message(conversation_id=c1.id, sender_id=users[1].id, content="Yes, it looks great. The websockets are super fast!"),
        
        Message(conversation_id=c2.id, sender_id=users[0].id, content="Welcome to the team group!"),
        Message(conversation_id=c2.id, sender_id=users[2].id, content="Glad to be here!"),
    ])
    db.commit()
    
    print("Seed complete! You can log in with +15550001111 / password")
    db.close()

if __name__ == "__main__":
    seed_db()
