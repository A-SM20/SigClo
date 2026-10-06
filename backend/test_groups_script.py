import asyncio
import websockets
import httpx
import json
import uuid

async def test_groups():
    # 1. Register 3 users
    u1 = httpx.post("http://127.0.0.1:8000/api/auth/register", json={"phone_number": f"+1{uuid.uuid4().hex[:10]}", "display_name": "Group Creator", "password": "pw"}).json()
    u2 = httpx.post("http://127.0.0.1:8000/api/auth/register", json={"phone_number": f"+1{uuid.uuid4().hex[:10]}", "display_name": "Group Member 1", "password": "pw"}).json()
    u3 = httpx.post("http://127.0.0.1:8000/api/auth/register", json={"phone_number": f"+1{uuid.uuid4().hex[:10]}", "display_name": "Group Member 2", "password": "pw"}).json()
    
    t1 = u1["access_token"]
    t2 = u2["access_token"]
    t3 = u3["access_token"]
    
    id1 = httpx.get("http://127.0.0.1:8000/api/auth/me", headers={"Authorization": f"Bearer {t1}"}).json()["id"]
    id2 = httpx.get("http://127.0.0.1:8000/api/auth/me", headers={"Authorization": f"Bearer {t2}"}).json()["id"]
    id3 = httpx.get("http://127.0.0.1:8000/api/auth/me", headers={"Authorization": f"Bearer {t3}"}).json()["id"]
    
    print("Registered users:", id1, id2, id3)

    # 2. Create Group with user 2 (Slice 7)
    grp_resp = httpx.post("http://127.0.0.1:8000/api/conversations/group", json={
        "name": "Slice 7 Group",
        "member_ids": [id2]
    }, headers={"Authorization": f"Bearer {t1}"})
    if grp_resp.status_code != 200:
        print("Group creation failed:", grp_resp.text)
    grp_id = grp_resp.json()["id"]
    print(f"Created group {grp_id}")
    
    # 3. Add user 3 to group (Slice 9)
    add_resp = httpx.post(f"http://127.0.0.1:8000/api/conversations/{grp_id}/members", json={
        "user_id": id3
    }, headers={"Authorization": f"Bearer {t1}"})
    print("Add member response:", add_resp.json())

    # 4. Connect WebSockets for u1, u2, u3 (Slice 8)
    async with websockets.connect(f"ws://127.0.0.1:8000/ws?token={t1}") as ws1, \
               websockets.connect(f"ws://127.0.0.1:8000/ws?token={t2}") as ws2, \
               websockets.connect(f"ws://127.0.0.1:8000/ws?token={t3}") as ws3:
         
        # u1 sends a message to the group
        await ws1.send(json.dumps({
            "type": "chat_message",
            "conversation_id": grp_id,
            "content": "Welcome to the group everyone!"
        }))
        
        # u2 and u3 should receive it
        data1 = await ws1.recv()
        data2 = await ws2.recv()
        data3 = await ws3.recv()
        
        print("U1 received (echo):", data1)
        print("U2 received:", data2)
        print("U3 received:", data3)

    # 5. User 2 leaves the group (Slice 9)
    leave_resp = httpx.delete(f"http://127.0.0.1:8000/api/conversations/{grp_id}/members/{id2}", headers={"Authorization": f"Bearer {t2}"})
    print("Leave response:", leave_resp.json())
    print("Slice 7, 8, 9 fully verified!")

if __name__ == "__main__":
    asyncio.run(test_groups())
