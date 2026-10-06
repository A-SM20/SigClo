import pytest
from fastapi.testclient import TestClient

def test_websocket_chat_and_persistence(client: TestClient):
    # 1. Register users
    resp1 = client.post("/api/auth/register", json={"phone_number": "+1100000010", "display_name": "WS Test 1", "password": "pw"})
    token1 = resp1.json()["access_token"]
    user1_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token1}"}).json()["id"]

    resp2 = client.post("/api/auth/register", json={"phone_number": "+1100000011", "display_name": "WS Test 2", "password": "pw"})
    token2 = resp2.json()["access_token"]
    user2_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token2}"}).json()["id"]

    # 2. Create conversation
    conv = client.post("/api/conversations/", json={"contact_id": user2_id}, headers={"Authorization": f"Bearer {token1}"}).json()
    conv_id = conv["id"]

    # 3. Connect via TestClient WebSockets
    with client.websocket_connect(f"/ws?token={token1}") as ws1, \
         client.websocket_connect(f"/ws?token={token2}") as ws2:
        
        # User 1 sends message
        ws1.send_json({
            "type": "chat_message",
            "conversation_id": conv_id,
            "content": "Automated Pytest Message"
        })

        # Receive on ws1 (echo back)
        data1 = ws1.receive_json()
        assert data1["type"] == "new_message"
        assert data1["message"]["content"] == "Automated Pytest Message"

        # Receive on ws2 (broadcast)
        data2 = ws2.receive_json()
        assert data2["type"] == "new_message"
        assert data2["message"]["content"] == "Automated Pytest Message"
        assert data2["message"]["sender_id"] == user1_id

    # 4. Verify History API (Persistence)
    history = client.get(f"/api/messages/{conv_id}", headers={"Authorization": f"Bearer {token1}"})
    assert history.status_code == 200
    msgs = history.json()
    assert len(msgs) == 1
    assert msgs[-1]["content"] == "Automated Pytest Message"
