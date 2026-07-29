from datetime import date, timedelta

from app.core.security import hash_password
from app.models.user import User, UserRole


def register_user(client, email: str, role: str, customer_id: int | None = None) -> str:
    payload = {
        "name": f"{role.title()} User",
        "email": email,
        "password": "password123",
        "role": role,
    }
    if customer_id:
        payload["customer_id"] = customer_id

    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "password123"},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def create_internal_staff_token(client, db_session, email: str, role: UserRole) -> str:
    staff_user = User(
        name=f"Internal {role.value.title()}",
        email=email,
        hashed_password=hash_password("password123"),
        role=role,
    )
    db_session.add(staff_user)
    db_session.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "password123"},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def create_customer(client, token: str, email: str = "customer-record@example.com") -> int:
    response = client.post(
        "/api/v1/customers/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Customer Record",
            "dob": "1994-04-20",
            "phone": "9876543210",
            "address": "22 Park Street, Jaipur",
            "email": email,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_policy(client, token: str, customer_id: int) -> int:
    response = client.post(
        "/api/v1/policies/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "customer_id": customer_id,
            "policy_type": "Health Insurance",
            "policy_number": "HI-TEST-001",
            "premium_amount": "12000.00",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=20)),
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def record_premium(client, token: str, policy_id: int) -> int:
    response = client.post(
        "/api/v1/premiums/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "policy_id": policy_id,
            "due_date": str(date.today() + timedelta(days=10)),
            "amount": "12000.00",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_customer_can_only_access_owned_records(client, db_session):
    admin_token = create_internal_staff_token(client, db_session, "admin-role@example.com", UserRole.ADMIN)
    customer_id = create_customer(client, admin_token)
    policy_id = create_policy(client, admin_token, customer_id)
    customer_token = register_user(client, "customer-record@example.com", "customer")

    forbidden_response = client.get(
        "/api/v1/customers/",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert forbidden_response.status_code == 403

    policies_response = client.get(
        "/api/v1/policies/mine",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert policies_response.status_code == 200
    assert policies_response.json()["items"][0]["id"] == policy_id


def test_customer_can_pay_own_premium(client, db_session):
    admin_token = create_internal_staff_token(client, db_session, "admin-payment@example.com", UserRole.ADMIN)
    customer_id = create_customer(client, admin_token, "payment-customer@example.com")
    policy_id = create_policy(client, admin_token, customer_id)
    premium_id = record_premium(client, admin_token, policy_id)
    customer_token = register_user(client, "payment-customer@example.com", "customer")

    response = client.patch(
        f"/api/v1/premiums/{premium_id}/mark-paid",
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 200
    assert response.json()["payment_status"] == "paid"


def test_admin_reports_and_expiry_alerts(client, db_session):
    admin_token = create_internal_staff_token(client, db_session, "admin-report@example.com", UserRole.ADMIN)
    customer_id = create_customer(client, admin_token, "report-customer@example.com")
    create_policy(client, admin_token, customer_id)

    expiring_response = client.get(
        "/api/v1/policies/expiring?days=30",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert expiring_response.status_code == 200
    assert expiring_response.json()["total"] == 1

    monthly_response = client.get(
        "/api/v1/reports/monthly",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert monthly_response.status_code == 200
    assert len(monthly_response.json()) == 6

    summary_response = client.get(
        "/api/v1/reports/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert summary_response.status_code == 200
    assert summary_response.json()["premiums"]["total_premium_records"] == 0
