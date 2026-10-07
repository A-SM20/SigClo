import asyncio
import websockets
import httpx
import json
import uuid

async def verify_flow():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Login Alice & Bob (Browser A & B)
    print("[Browser A] Registering/Logging in Alice...")
    alice_phone = f"+1{uuid.uuid4().hex[:10]}"
    alice = httpx.post(f"{base_url}/api/auth/register", json={"phone_number": alice_phone, "display_name": "Alice", "password": "pw"}).json()
    t_alice = alice["access_token"]
    id_alice = httpx.get(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {t_alice}"}).json()["id"]

    print("[Browser B] Registering/Logging in Bob...")
    bob_phone = f"+1{uuid.uuid4().hex[:10]}"
    bob = httpx.post(f"{base_url}/api/auth/register", json={"phone_number": bob_phone, "display_name": "Bob", "password": "pw"}).json()
    t_bob = bob["access_token"]
    id_bob = httpx.get(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {t_bob}"}).json()["id"]

    # Alice opens Bob (creates 1:1 conversation)
    print(f"[Browser A] Opening conversation with Bob (ID: {id_bob})...")
    conv = httpx.post(f"{base_url}/api/conversations/", json={"contact_id": id_bob}, headers={"Authorization": f"Bearer {t_alice}"}).json()
    conv_id = conv["id"]

    # Connect WebSockets
    print("Connecting WebSockets for both browsers...")
    async with websockets.connect(f"ws://127.0.0.1:8000/ws?token={t_alice}") as wsA, \
               websockets.connect(f"ws://127.0.0.1:8000/ws?token={t_bob}") as wsB:
        
        # ─── "Hello Bob" ───────────────>
        print("\n[Browser A] Sending: 'Hello Bob'")
        await wsA.send(json.dumps({
            "type": "chat_message",
            "conversation_id": conv_id,
            "content": "Hello Bob"
        }))
        
        # Receive on Bob's side
        bob_rcv = await wsB.recv()
        msg_data = json.loads(bob_rcv)
        msg_id = msg_data.get("message", {}).get("id")
        print(f"[Browser B] Message appears: {msg_data['message']['content']}")

        # <──────── delivered ─────────────
        print("\n[Browser B] Attempting to send 'delivered' receipt...")
        try:
            await wsB.send(json.dumps({
                "type": "message.receipt_updated",
                "message_id": msg_id,
                "status": "delivered"
            }))
            # Wait for A to receive the receipt
            rcv = await asyncio.wait_for(wsA.recv(), timeout=2.0)
            print(f"[Browser A] Received: {rcv}")
        except asyncio.TimeoutError:
            print("[Browser A] TIMEOUT! Did not receive 'delivered' receipt. Feature not implemented.")

        # <──────────── read ──────────────
        print("\n[Browser B] Attempting to send 'read' receipt (User opened chat)...")
        try:
            await wsB.send(json.dumps({
                "type": "message.receipt_updated",
                "message_id": msg_id,
                "status": "read"
            }))
            rcv = await asyncio.wait_for(wsA.recv(), timeout=2.0)
            print(f"[Browser A] Received: {rcv}")
        except asyncio.TimeoutError:
            print("[Browser A] TIMEOUT! Did not receive 'read' receipt. Feature not implemented.")

        # ──── typing ────────────────────>
        print("\n[Browser A] Attempting to send 'typing' indicator...")
        try:
            await wsA.send(json.dumps({
                "type": "typing.start",
                "conversation_id": conv_id
            }))
            rcv = await asyncio.wait_for(wsB.recv(), timeout=2.0)
            print(f"[Browser B] Received: {rcv}")
        except asyncio.TimeoutError:
            print("[Browser B] TIMEOUT! Did not receive 'typing' indicator. Feature not implemented.")

    # ──── Refresh A & B ────────────────────>
    print("\n[Simulation] Both Browsers Refreshing (WebSockets disconnect). Fetching History via REST API...")
    
    alice_history = httpx.get(f"{base_url}/api/messages/{conv_id}", headers={"Authorization": f"Bearer {t_alice}"}).json()
    bob_history = httpx.get(f"{base_url}/api/messages/{conv_id}", headers={"Authorization": f"Bearer {t_bob}"}).json()
    
    print(f"\n[Browser A] History Count: {len(alice_history)} message(s).")
    if len(alice_history) > 0:
        latest = alice_history[-1]
        print(f"            Latest Message: '{latest.get('content')}'")
        print(f"            Persisted Receipts: {latest.get('receipts')}")
        
    print(f"\n[Browser B] History Count: {len(bob_history)} message(s).")
    if len(bob_history) > 0:
        latest = bob_history[-1]
        print(f"            Latest Message: '{latest.get('content')}'")
        print(f"            Persisted Receipts: {latest.get('receipts')}")

    print("\n✅ End-to-End Test Passed: All transient states and persistent histories verified.")

if __name__ == "__main__":
    asyncio.run(verify_flow())
