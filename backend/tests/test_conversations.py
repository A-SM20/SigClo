from fastapi.testclient import TestClient

def test_search_users(client: TestClient):
    # Register two users
    resp1 = client.post("/api/auth/register", json={"username": "user1", "display_name": "User One", "password": "pw"})
    token1 = resp1.json()["access_token"]
    
    client.post("/api/auth/register", json={"username": "user2", "display_name": "User Two", "password": "pw"})
    
    # Search for user2 using user1 token
    res = client.get("/api/users/search?query=user2", headers={"Authorization": f"Bearer {token1}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["username"] == "user2"

def test_create_and_get_conversation(client: TestClient):
    # Setup users
    t1 = client.post("/api/auth/register", json={"username": "c_user1", "display_name": "C User 1", "password": "pw"}).json()["access_token"]
    c_user2 = client.post("/api/auth/register", json={"username": "c_user2", "display_name": "C User 2", "password": "pw"}).json()
    u2_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {c_user2['access_token']}"}).json()["id"]
    
    # Create conversation
    res = client.post("/api/conversations/", json={"contact_id": u2_id}, headers={"Authorization": f"Bearer {t1}"})
    assert res.status_code == 200
    conv = res.json()
    assert conv["is_group"] == False
    assert conv["display_name"] == "C User 2"
    
    # List conversations
    res2 = client.get("/api/conversations/", headers={"Authorization": f"Bearer {t1}"})
    assert res2.status_code == 200
    convs = res2.json()
    assert len(convs) >= 1
    assert convs[0]["id"] == conv["id"]
