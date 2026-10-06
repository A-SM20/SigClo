import pytest
from fastapi.testclient import TestClient

def test_group_creation_and_messaging(client: TestClient):
    # 1. Register 3 users
    u1 = client.post("/api/auth/register", json={"phone_number": "+1100000020", "display_name": "G User 1", "password": "pw"}).json()
    u2 = client.post("/api/auth/register", json={"phone_number": "+1100000021", "display_name": "G User 2", "password": "pw"}).json()
    u3 = client.post("/api/auth/register", json={"phone_number": "+1100000022", "display_name": "G User 3", "password": "pw"}).json()
    
    t1 = u1["access_token"]
    t2 = u2["access_token"]
    t3 = u3["access_token"]
    
    id1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {t1}"}).json()["id"]
    id2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {t2}"}).json()["id"]
    id3 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {t3}"}).json()["id"]
    
    # 2. Create Group with user 2 (u1 is creator)
    grp_resp = client.post("/api/conversations/group", json={
        "name": "Secret Project",
        "member_ids": [id2]
    }, headers={"Authorization": f"Bearer {t1}"})
    assert grp_resp.status_code == 200
    grp_id = grp_resp.json()["id"]
    
    # 3. Add user 3 to group
    add_resp = client.post(f"/api/conversations/{grp_id}/members", json={
        "user_id": id3
    }, headers={"Authorization": f"Bearer {t1}"})
    assert add_resp.status_code == 200
    
    # 4. Connect WebSockets for u1 and u3
    with client.websocket_connect(f"/ws?token={t1}") as ws1, \
         client.websocket_connect(f"/ws?token={t3}") as ws3:
         
        # u3 sends a message to the group
        ws3.send_json({
            "type": "chat_message",
            "conversation_id": grp_id,
            "content": "Hello Team!"
        })
        
        # u1 should receive it
        data1 = ws1.receive_json()
        assert data1["type"] == "new_message"
        assert data1["message"]["content"] == "Hello Team!"
        
    # 5. User 2 leaves the group
    leave_resp = client.delete(f"/api/conversations/{grp_id}/members/{id2}", headers={"Authorization": f"Bearer {t2}"})
    assert leave_resp.status_code == 200
