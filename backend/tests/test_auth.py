def test_register_login_and_current_user(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Admin User",
            "email": "admin@example.com",
            "password": "password123",
            "role": "admin",
        },
    )

    assert register_response.status_code == 201
    assert register_response.json()["email"] == "admin@example.com"

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "admin@example.com",
            "password": "password123",
        },
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 200
    assert me_response.json()["role"] == "admin"


def test_validation_error_uses_standard_format(client):
    response = client.post("/api/v1/auth/register", json={"email": "invalid"})

    assert response.status_code == 422
    assert "error" in response.json()
    assert response.json()["error"]["message"] == "Validation failed"
