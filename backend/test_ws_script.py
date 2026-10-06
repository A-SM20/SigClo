import asyncio
import websockets
import httpx
import json

async def test_websocket():
    # 1. Register User 1
    resp1 = httpx.post("http://127.0.0.1:8000/api/auth/register", json={"phone_number": "+1100000001", "display_name": "WS User 1", "password": "pw"})
    token1 = resp1.json()["access_token"]
    user1_id = httpx.get("http://127.0.0.1:8000/api/auth/me", headers={"Authorization": f"Bearer {token1}"}).json()["id"]

    # 2. Register User 2
    resp2 = httpx.post("http://127.0.0.1:8000/api/auth/register", json={"phone_number": "+1100000002", "display_name": "WS User 2", "password": "pw"})
    token2 = resp2.json()["access_token"]
    user2_id = httpx.get("http://127.0.0.1:8000/api/auth/me", headers={"Authorization": f"Bearer {token2}"}).json()["id"]

    # 3. User 1 creates conversation with User 2
    conv = httpx.post("http://127.0.0.1:8000/api/conversations/", json={"contact_id": user2_id}, headers={"Authorization": f"Bearer {token1}"}).json()
    conv_id = conv["id"]

    # 4. Connect WebSockets
    async with websockets.connect(f"ws://127.0.0.1:8000/ws?token={token1}") as ws1, \
               websockets.connect(f"ws://127.0.0.1:8000/ws?token={token2}") as ws2:
        
        # User 1 sends message
        msg_payload = {
            "type": "chat_message",
            "conversation_id": conv_id,
            "content": "Hello from WS User 1"
        }
        await ws1.send(json.dumps(msg_payload))

        # Both should receive the broadcast (the sender receives it too)
        recv1 = await ws1.recv()
        recv2 = await ws2.recv()
        
        print("User 1 received:", recv1)
        print("User 2 received:", recv2)

        # 5. Verify persistence (Slice 5)
        history = httpx.get(f"http://127.0.0.1:8000/api/messages/{conv_id}", headers={"Authorization": f"Bearer {token2}"}).json()
        print("History length:", len(history))
        print("Last message:", history[-1]["content"])

if __name__ == "__main__":
    asyncio.run(test_websocket())
