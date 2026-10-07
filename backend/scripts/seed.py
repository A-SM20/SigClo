import os
import sys
import random
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import SessionLocal, engine, Base
from db.models import User, Conversation, ConversationMember, Message, MessageReceipt, Contact
from core.security import get_password_hash

def seed_db():
    print("Dropping existing tables to start fresh...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    print("Seeding Users...")
    users_data = [
        {"phone": "+15550001111", "name": "Alice (Demo)"},
        {"phone": "+15550002222", "name": "Bob"},
        {"phone": "+15550003333", "name": "Charlie"},
        {"phone": "+15550004444", "name": "Diana"},
        {"phone": "+15550005555", "name": "Ethan"},
        {"phone": "+15550006666", "name": "Fiona"},
        {"phone": "+15550007777", "name": "George"},
        {"phone": "+15550008888", "name": "Hannah"},
        {"phone": "+15550009999", "name": "Ian"},
        {"phone": "+15550000000", "name": "Julia"}
    ]
    
    users = []
    for ud in users_data:
        u = User(
            phone_number=ud["phone"],
            username=ud["name"].lower().replace(" ", "").replace("(demo)", ""),
            display_name=ud["name"],
            hashed_password=get_password_hash("pass")
        )
        users.append(u)
    
    db.add_all(users)
    db.commit()
    for u in users:
        db.refresh(u)
        
    alice = users[0]
    
    print("Seeding Contacts...")
    contacts = []
    for u in users[1:]:
        contacts.append(Contact(user_id=alice.id, contact_id=u.id))
        contacts.append(Contact(user_id=u.id, contact_id=alice.id))
    db.add_all(contacts)
    db.commit()

    print("Seeding Conversations...")
    now = datetime.utcnow()
    
    def create_dm(u1, u2):
        c = Conversation(is_group=0, created_at=now - timedelta(days=5))
        db.add(c)
        db.commit()
        db.refresh(c)
        db.add_all([
            ConversationMember(conversation_id=c.id, user_id=u1.id, role="member"),
            ConversationMember(conversation_id=c.id, user_id=u2.id, role="member")
        ])
        db.commit()
        return c

    def create_group(name, admin, members):
        c = Conversation(is_group=1, name=name, created_at=now - timedelta(days=10))
        db.add(c)
        db.commit()
        db.refresh(c)
        db.add(ConversationMember(conversation_id=c.id, user_id=admin.id, role="admin"))
        for m in members:
            db.add(ConversationMember(conversation_id=c.id, user_id=m.id, role="member"))
        db.commit()
        return c

    dm_alice_bob = create_dm(alice, users[1])
    dm_alice_charlie = create_dm(alice, users[2])
    dm_alice_diana = create_dm(alice, users[3])
    dm_alice_ethan = create_dm(alice, users[4])
    dm_alice_fiona = create_dm(alice, users[5])
    
    group_phoenix = create_group("Project Phoenix", alice, [users[1], users[2], users[4]])
    group_weekend = create_group("Weekend Getaway", users[3], [alice, users[5], users[6], users[7]])
    group_leads = create_group("Engineering Leads", users[4], [alice, users[8], users[9]])

    print("Seeding Messages...")
    
    def add_msg(conv, sender, content, dt, receipts=None):
        m = Message(conversation_id=conv.id, sender_id=sender.id, content=content, created_at=dt)
        db.add(m)
        db.commit()
        db.refresh(m)
        
        if receipts:
            for uid, status in receipts.items():
                if uid != sender.id:
                    db.add(MessageReceipt(message_id=m.id, user_id=uid, status=status))
            db.commit()
        return m

    # Alice <-> Bob (Recent chat)
    add_msg(dm_alice_bob, users[1], "Hey Alice, do you have the specs for the new feature?", now - timedelta(hours=2), {alice.id: "read"})
    add_msg(dm_alice_bob, alice, "Yes, I'll send them over in a bit.", now - timedelta(hours=1, minutes=55), {users[1].id: "read"})
    add_msg(dm_alice_bob, users[1], "Awesome, thanks!", now - timedelta(hours=1, minutes=50), {alice.id: "read"})
    add_msg(dm_alice_bob, users[1], "Let me know when you're ready to review the PR.", now - timedelta(minutes=10), {alice.id: "delivered"}) 

    # Alice <-> Charlie (Older chat, grouped messages)
    add_msg(dm_alice_charlie, alice, "Are we still on for lunch today?", now - timedelta(days=1, hours=4), {users[2].id: "read"})
    add_msg(dm_alice_charlie, users[2], "Yeah, definitely.", now - timedelta(days=1, hours=3, minutes=50), {alice.id: "read"})
    add_msg(dm_alice_charlie, users[2], "Can we push it to 1pm though?", now - timedelta(days=1, hours=3, minutes=49), {alice.id: "read"})
    add_msg(dm_alice_charlie, users[2], "Got a conflict at noon.", now - timedelta(days=1, hours=3, minutes=49), {alice.id: "read"})
    add_msg(dm_alice_charlie, alice, "1pm works for me!", now - timedelta(days=1, hours=3, minutes=45), {users[2].id: "read"})

    # Alice <-> Diana (Unread messages)
    add_msg(dm_alice_diana, users[3], "Hey Alice!", now - timedelta(minutes=5), {alice.id: "delivered"})
    add_msg(dm_alice_diana, users[3], "Can you call me when you have a sec?", now - timedelta(minutes=4), {alice.id: "delivered"})
    
    # Alice <-> Ethan (Mostly Alice sending)
    add_msg(dm_alice_ethan, alice, "Here is the presentation.", now - timedelta(days=2), {users[4].id: "read"})
    add_msg(dm_alice_ethan, alice, "Did you get a chance to look?", now - timedelta(days=1), {users[4].id: "read"})
    add_msg(dm_alice_ethan, alice, "Ping me if you need help.", now - timedelta(hours=5), {users[4].id: "delivered"})

    # Group: Project Phoenix
    add_msg(group_phoenix, alice, "Welcome to the new channel for Project Phoenix.", now - timedelta(days=3), {users[1].id: "read", users[2].id: "read", users[4].id: "read"})
    add_msg(group_phoenix, users[1], "Excited to get started on this.", now - timedelta(days=2, hours=20), {alice.id: "read", users[2].id: "read", users[4].id: "read"})
    add_msg(group_phoenix, users[2], "What's our first milestone?", now - timedelta(days=2, hours=19), {alice.id: "read", users[1].id: "read", users[4].id: "read"})
    add_msg(group_phoenix, alice, "Phase 1 is architecture design.", now - timedelta(days=2, hours=10), {users[1].id: "read", users[2].id: "read", users[4].id: "read"})
    add_msg(group_phoenix, users[4], "I can take the lead on the backend diagram.", now - timedelta(hours=1), {alice.id: "read", users[1].id: "delivered", users[2].id: "delivered"})

    # Group: Weekend Getaway
    add_msg(group_weekend, users[3], "Hey everyone! Let's start planning the trip.", now - timedelta(days=5), {alice.id: "read", users[5].id: "read", users[6].id: "read", users[7].id: "read"})
    add_msg(group_weekend, users[6], "I vote for the mountains.", now - timedelta(days=4), {alice.id: "read", users[3].id: "read", users[5].id: "read", users[7].id: "read"})
    add_msg(group_weekend, users[7], "Beach is better IMO 🏖️", now - timedelta(days=4, hours=-2), {alice.id: "read", users[3].id: "read", users[5].id: "read", users[6].id: "read"})
    add_msg(group_weekend, users[3], "Let's do a poll.", now - timedelta(days=1), {alice.id: "delivered", users[5].id: "read", users[6].id: "read", users[7].id: "read"})
    add_msg(group_weekend, users[5], "I'm fine with either!", now - timedelta(hours=2), {alice.id: "delivered", users[3].id: "read", users[6].id: "delivered", users[7].id: "delivered"})

    print("Seed complete! Database populated with realistic demo data.")
    print("Demo Account: +15550001111 / pass")
    db.close()

if __name__ == "__main__":
    seed_db()
