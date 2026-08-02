from pathlib import Path

from app.core.config import settings


def test_register_login_and_current_user(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Customer User",
            "email": "customer@example.com",
            "password": "password123",
            "role": "customer",
        },
    )

    assert register_response.status_code == 201
    assert register_response.json()["email"] == "customer@example.com"

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "customer@example.com",
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
    assert me_response.json()["role"] == "customer"


def test_forgot_password_resets_password(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Reset Customer",
            "email": "reset.customer@example.com",
            "password": "password123",
            "role": "customer",
        },
    )
    assert register_response.status_code == 201

    reset_request = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset.customer@example.com"},
    )
    assert reset_request.status_code == 200
    reset_token = reset_request.json()["reset_token"]
    assert reset_token

    reset_response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "new-password123"},
    )
    assert reset_response.status_code == 200

    old_login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "reset.customer@example.com", "password": "password123"},
    )
    assert old_login_response.status_code == 401

    new_login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "reset.customer@example.com", "password": "new-password123"},
    )
    assert new_login_response.status_code == 200


def test_public_register_cannot_create_admin_account(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Admin User",
            "email": "admin@example.com",
            "password": "password123",
            "role": "admin",
        },
    )

    assert response.status_code == 403


def test_public_register_cannot_create_agent_account(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Agent User",
            "email": "agent.user@example.com",
            "password": "password123",
            "role": "agent",
        },
    )

    assert register_response.status_code == 403


def test_validation_error_uses_standard_format(client):
    response = client.post("/api/v1/auth/register", json={"email": "invalid"})

    assert response.status_code == 422
    assert "error" in response.json()
    assert response.json()["error"]["message"] == "Validation failed"


def test_customer_register_creates_customer_profile(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "New Customer",
            "email": "new.customer@example.com",
            "password": "password123",
            "role": "customer",
            "phone": "9876543210",
            "address": "11 Blue Street, Jaipur",
        },
    )

    assert response.status_code == 201
    assert response.json()["customer_id"] is not None


def test_customer_can_register_with_profile_image(client, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    response = client.post(
        "/api/v1/auth/register-with-image",
        data={
            "name": "Photo Customer",
            "email": "photo.customer@example.com",
            "password": "password123",
            "phone": "9876543210",
            "address": "22 Green Street, Jaipur",
        },
        files={
            "profile_image": (
                "profile.png",
                b"\x89PNG\r\n\x1a\nprofile-image-test",
                "image/png",
            ),
        },
    )

    assert response.status_code == 201
    profile_image_url = response.json()["profile_image_url"]
    assert profile_image_url.startswith("/uploads/profiles/")
    stored_path = Path(settings.UPLOAD_DIR) / profile_image_url.removeprefix("/uploads/")
    assert stored_path.exists()


def test_profile_image_upload_rejects_fake_image(client):
    response = client.post(
        "/api/v1/auth/register-with-image",
        data={
            "name": "Invalid Photo",
            "email": "invalid.photo@example.com",
            "password": "password123",
        },
        files={
            "profile_image": ("profile.png", b"not-a-real-image", "image/png"),
        },
    )

    assert response.status_code == 400


def test_profile_update_can_replace_profile_image(client, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Image Update Customer",
            "email": "image.update@example.com",
            "password": "password123",
            "role": "customer",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "image.update@example.com",
            "password": "password123",
        },
    )
    token = login_response.json()["access_token"]

    update_response = client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "name": "Image Update Customer",
            "email": "image.update@example.com",
        },
        files={
            "profile_image": (
                "profile.webp",
                b"RIFF1234WEBPprofile-image-test",
                "image/webp",
            ),
        },
    )

    assert update_response.status_code == 200
    profile_image_url = update_response.json()["profile_image_url"]
    assert profile_image_url.startswith("/uploads/profiles/")
    stored_path = Path(settings.UPLOAD_DIR) / profile_image_url.removeprefix("/uploads/")
    assert stored_path.exists()
