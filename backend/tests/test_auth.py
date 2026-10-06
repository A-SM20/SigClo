from fastapi.testclient import TestClient

def test_register_user(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "phone_number": "+1234567890",
            "display_name": "Test User",
            "password": "securepassword"
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_user(client: TestClient):
    # Register first
    client.post(
        "/api/auth/register",
        json={
            "phone_number": "+1999999999",
            "display_name": "Login User",
            "password": "mypassword"
        },
    )
    
    # Login
    response = client.post(
        "/api/auth/login",
        json={
            "username_or_phone": "+1999999999",
            "password": "mypassword"
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data

def test_read_users_me(client: TestClient):
    # Register
    register_resp = client.post(
        "/api/auth/register",
        json={
            "username": "me_user",
            "display_name": "Me User",
            "password": "password"
        },
    )
    token = register_resp.json()["access_token"]
    
    # Get Me
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["username"] == "me_user"
    assert data["display_name"] == "Me User"
    assert "id" in data
