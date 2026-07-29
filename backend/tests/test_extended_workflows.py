from datetime import date, timedelta
from io import BytesIO

from app.core.security import hash_password
from app.models.user import User, UserRole


def login_token(client, email: str, password: str = "password123") -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def create_staff_user(db_session, email: str, role: UserRole) -> None:
    db_session.add(
        User(
            name=f"{role.value.title()} User",
            email=email,
            hashed_password=hash_password("password123"),
            role=role,
        )
    )
    db_session.commit()


def create_customer_record(client, token: str, email: str = "customer-record@example.com") -> int:
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


def test_admin_can_manage_employees_and_settings(client, db_session):
    create_staff_user(db_session, "admin-ext@example.com", UserRole.ADMIN)
    admin_token = login_token(client, "admin-ext@example.com")

    employee_response = client.post(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Agent One",
            "email": "agent-one@example.com",
            "password": "password123",
            "role": "agent",
        },
    )
    assert employee_response.status_code == 201
    assert employee_response.json()["role"] == "agent"
    employee_id = employee_response.json()["id"]

    employee_update_response = client.put(
        f"/api/v1/users/{employee_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Agent Updated",
            "email": "agent-updated@example.com",
            "password": "updated-password123",
            "role": "agent",
        },
    )
    assert employee_update_response.status_code == 200
    assert employee_update_response.json()["name"] == "Agent Updated"
    assert employee_update_response.json()["email"] == "agent-updated@example.com"
    updated_agent_token = login_token(
        client,
        "agent-updated@example.com",
        "updated-password123",
    )
    assert updated_agent_token

    customer_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Employee List Customer",
            "email": "employee-list-customer@example.com",
            "password": "password123",
            "role": "customer",
        },
    )
    assert customer_response.status_code == 201

    employees_response = client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert employees_response.status_code == 200
    assert employees_response.json()["total"] == 2
    assert {employee["role"] for employee in employees_response.json()["items"]} == {"admin", "agent"}
    assert all(employee["email"] != "employee-list-customer@example.com" for employee in employees_response.json()["items"])

    customer_role_filter_response = client.get(
        "/api/v1/users/?role=customer",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert customer_role_filter_response.status_code == 400

    settings_response = client.get(
        "/api/v1/settings/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert settings_response.status_code == 200
    assert len(settings_response.json()) >= 1

    update_response = client.put(
        "/api/v1/settings/support_email",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "value": "helpdesk@healthinsure.com",
            "description": "Updated support mailbox",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["value"] == "helpdesk@healthinsure.com"

    invalid_email_response = client.put(
        "/api/v1/settings/support_email",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"value": "not-an-email"},
    )
    assert invalid_email_response.status_code == 400

    disable_registration_response = client.put(
        "/api/v1/settings/allow_public_registration",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"value": "false"},
    )
    assert disable_registration_response.status_code == 200
    blocked_registration_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Blocked Customer",
            "email": "blocked-customer@example.com",
            "password": "password123",
            "role": "customer",
        },
    )
    assert blocked_registration_response.status_code == 403


def test_database_plans_public_summary_and_document_link_validation(client, db_session):
    create_staff_user(db_session, "admin-plan@example.com", UserRole.ADMIN)
    admin_token = login_token(client, "admin-plan@example.com")
    customer_id = create_customer_record(client, admin_token, "plan-customer@example.com")

    create_response = client.post(
        "/api/v1/plans/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Database Health",
            "policy_type": "Health Insurance",
            "premium_amount": "9000.00",
            "coverage_amount": "750000.00",
            "tag": "Value",
            "description": "A database-managed health insurance plan.",
            "services": ["Cashless hospitalization"],
            "benefits": ["No claim bonus"],
            "required_documents": ["Aadhaar Card"],
            "exclusions": ["Waiting periods apply"],
            "is_active": True,
        },
    )
    assert create_response.status_code == 201
    plan_id = create_response.json()["id"]

    public_plans = client.get("/api/v1/plans/")
    assert public_plans.status_code == 200
    assert public_plans.json()[0]["name"] == "Database Health"

    update_response = client.put(
        f"/api/v1/plans/{plan_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"premium_amount": "9500.00", "is_active": False},
    )
    assert update_response.status_code == 200
    assert update_response.json()["premium_amount"] == "9500.00"
    assert client.get("/api/v1/plans/").json() == []

    public_summary = client.get("/api/v1/reports/public-summary")
    assert public_summary.status_code == 200
    assert public_summary.json()["active_policies"] == 0
    assert public_summary.json()["support_email"]

    orphan_policy_document = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("policy.pdf", BytesIO(b"sample-pdf-content"), "application/pdf")},
        data={"customer_id": str(customer_id), "document_type": "policy"},
    )
    assert orphan_policy_document.status_code == 400

    orphan_claim_document = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("claim.pdf", BytesIO(b"sample-pdf-content"), "application/pdf")},
        data={"customer_id": str(customer_id), "document_type": "claim"},
    )
    assert orphan_claim_document.status_code == 400


def test_customer_application_review_creates_policy(client, db_session):
    create_staff_user(db_session, "admin-app@example.com", UserRole.ADMIN)
    admin_token = login_token(client, "admin-app@example.com")
    customer_id = create_customer_record(client, admin_token, "app-customer@example.com")

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Application Customer",
            "email": "app-customer@example.com",
            "password": "password123",
            "role": "customer",
            "phone": "9876543210",
            "address": "22 Park Street, Jaipur",
        },
    )
    assert register_response.status_code == 201
    customer_token = login_token(client, "app-customer@example.com")

    plan_response = client.post(
        "/api/v1/plans/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Gold Health",
            "policy_type": "Health Insurance",
            "premium_amount": "12000.00",
            "coverage_amount": "1000000.00",
            "tag": "Popular",
            "description": "Balanced family protection with stronger claim support.",
            "services": ["Cashless hospitalization"],
            "benefits": ["No claim bonus"],
            "required_documents": ["Aadhaar Card", "PAN Card"],
            "exclusions": ["Waiting periods apply"],
            "is_active": True,
        },
    )
    assert plan_response.status_code == 201
    plan_id = plan_response.json()["id"]

    application_payload = {
            "plan_id": plan_id,
            "plan_name": "Gold Health",
            "policy_type": "Health Insurance",
            "premium_amount": "₹12,000/year",
            "coverage_amount": "₹10 Lakh",
            "applicant_name": "Application Customer",
            "date_of_birth": "1994-04-20",
            "gender": "Male",
            "marital_status": "Single",
            "occupation": "Engineer",
            "address": "22 Park Street, Jaipur",
            "nominee_name": "Parent Name",
            "nominee_relation": "Father",
            "nominee_age": 60,
            "height_cm": "176",
            "weight_kg": "72",
            "smoking": "No",
            "alcohol": "No",
            "previous_disease": "",
            "current_medication": "",
            "payment_method": "UPI",
            "document_names": ["aadhaar.pdf", "pan.pdf"],
        }
    submit_response = client.post(
        "/api/v1/applications/",
        headers={"Authorization": f"Bearer {customer_token}"},
        json=application_payload,
    )
    assert submit_response.status_code == 201
    application_id = submit_response.json()["id"]

    pending_history_response = client.get(
        f"/api/v1/customers/{customer_id}/history",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert pending_history_response.status_code == 200
    assert pending_history_response.json()["total_applications"] == 1
    assert pending_history_response.json()["pending_applications"] == 1
    assert pending_history_response.json()["applications"][0]["plan_name"] == "Gold Health"
    assert pending_history_response.json()["applications"][0]["status"] == "pending"

    upload_response = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {customer_token}"},
        files={"file": ("application-identity.pdf", BytesIO(b"sample-pdf-content"), "application/pdf")},
        data={
            "customer_id": str(customer_id),
            "application_id": str(application_id),
            "document_type": "identity",
        },
    )
    assert upload_response.status_code == 201
    application_document_id = upload_response.json()["id"]
    verify_document_response = client.patch(
        f"/api/v1/documents/{application_document_id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"verification_status": "verified", "verification_notes": "Application document accepted"},
    )
    assert verify_document_response.status_code == 200

    review_response = client.patch(
        f"/api/v1/applications/{application_id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "approved", "review_notes": "Approved for issue"},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "approved"
    assert review_response.json()["generated_policy_id"] is not None

    approved_history_response = client.get(
        f"/api/v1/customers/{customer_id}/history",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approved_history_response.status_code == 200
    assert approved_history_response.json()["pending_applications"] == 0
    assert approved_history_response.json()["applications"][0]["status"] == "approved"
    assert approved_history_response.json()["applications"][0]["generated_policy_id"] is not None

    mine_response = client.get(
        "/api/v1/policies/mine",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert mine_response.status_code == 200
    assert mine_response.json()["total"] == 1

    second_application_response = client.post(
        "/api/v1/applications/",
        headers={"Authorization": f"Bearer {customer_token}"},
        json=application_payload,
    )
    assert second_application_response.status_code == 201
    reject_response = client.patch(
        f"/api/v1/applications/{second_application_response.json()['id']}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "rejected", "review_notes": "Application rejected during review"},
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["status"] == "rejected"


def test_customer_profile_update_and_document_verification(client, db_session):
    create_staff_user(db_session, "admin-doc@example.com", UserRole.ADMIN)
    admin_token = login_token(client, "admin-doc@example.com")
    customer_id = create_customer_record(client, admin_token, "profile-customer@example.com")

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Profile Customer",
            "email": "profile-customer@example.com",
            "password": "password123",
            "role": "customer",
            "phone": "9998887776",
            "address": "Old Address 1",
        },
    )
    assert register_response.status_code == 201
    customer_token = login_token(client, "profile-customer@example.com")

    update_response = client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "name": "Updated Customer",
            "email": "updated-user@example.com",
            "phone": "9876501234",
            "address": "New Address 9",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Updated Customer"
    assert update_response.json()["email"] == "updated-user@example.com"
    customer_token = login_token(client, "updated-user@example.com")

    upload_response = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {customer_token}"},
        files={"file": ("identity.pdf", BytesIO(b"sample-pdf-content"), "application/pdf")},
        data={"customer_id": str(customer_id), "document_type": "identity"},
    )
    assert upload_response.status_code == 201
    document_id = upload_response.json()["id"]

    verify_response = client.patch(
        f"/api/v1/documents/{document_id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "verification_status": "verified",
            "verification_notes": "Document accepted",
        },
    )
    assert verify_response.status_code == 200
    assert verify_response.json()["verification_status"] == "verified"


def test_complete_claim_workflow_and_pdf_report(client, db_session):
    create_staff_user(db_session, "admin-claim@example.com", UserRole.ADMIN)
    create_staff_user(db_session, "agent-claim@example.com", UserRole.AGENT)
    admin_token = login_token(client, "admin-claim@example.com")
    agent_token = login_token(client, "agent-claim@example.com")
    customer_id = create_customer_record(client, admin_token, "claim-customer@example.com")

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Claim Customer",
            "email": "claim-customer@example.com",
            "password": "password123",
            "role": "customer",
        },
    )
    assert register_response.status_code == 201
    customer_token = login_token(client, "claim-customer@example.com")

    policy_response = client.post(
        "/api/v1/policies/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "customer_id": customer_id,
            "policy_type": "Health Insurance",
            "policy_number": "HI-CLAIM-001",
            "premium_amount": "18000.00",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365)),
        },
    )
    assert policy_response.status_code == 201
    policy_id = policy_response.json()["id"]

    claim_response = client.post(
        "/api/v1/claims/",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"policy_id": policy_id, "claim_amount": "5000.00", "reason": "Emergency hospitalization"},
    )
    assert claim_response.status_code == 201
    claim_id = claim_response.json()["id"]

    upload_response = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {customer_token}"},
        files={"file": ("hospital-bill.pdf", BytesIO(b"sample-pdf-content"), "application/pdf")},
        data={
            "customer_id": str(customer_id),
            "policy_id": str(policy_id),
            "claim_id": str(claim_id),
            "document_type": "claim",
        },
    )
    assert upload_response.status_code == 201
    document_id = upload_response.json()["id"]

    document_verify_response = client.patch(
        f"/api/v1/documents/{document_id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"verification_status": "verified"},
    )
    assert document_verify_response.status_code == 200

    agent = db_session.query(User).filter(User.email == "agent-claim@example.com").one()
    assignment_response = client.patch(
        f"/api/v1/claims/{claim_id}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"agent_id": agent.id},
    )
    assert assignment_response.status_code == 200

    claim_verify_response = client.patch(
        f"/api/v1/claims/{claim_id}/verify",
        headers={"Authorization": f"Bearer {agent_token}"},
        json={"status": "verified", "review_notes": "Bills and reports verified"},
    )
    assert claim_verify_response.status_code == 200
    assert claim_verify_response.json()["verification_status"] == "verified"

    approval_response = client.patch(
        f"/api/v1/claims/{claim_id}/decision",
        headers={"Authorization": f"Bearer {agent_token}"},
        json={"status": "approved", "review_notes": "Approved after verification"},
    )
    assert approval_response.status_code == 200

    settlement_response = client.patch(
        f"/api/v1/claims/{claim_id}/settle",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"amount": "4500.00", "reference": "SETTLEMENT-001"},
    )
    assert settlement_response.status_code == 200
    assert settlement_response.json()["settlement_reference"] == "SETTLEMENT-001"

    report_response = client.get(
        "/api/v1/reports/export/pdf",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert report_response.status_code == 200
    assert report_response.headers["content-type"] == "application/pdf"
    assert report_response.content.startswith(b"%PDF")


def test_customer_pagination_search_and_bounds(client, db_session):
    create_staff_user(db_session, "admin-pagination@example.com", UserRole.ADMIN)
    admin_token = login_token(client, "admin-pagination@example.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    for index in range(25):
        response = client.post(
            "/api/v1/customers/",
            headers=headers,
            json={
                "name": f"Pagination Customer {index:02d}",
                "dob": "1990-01-01",
                "phone": f"98765{index:05d}",
                "address": f"Pagination Address {index}",
                "email": f"pagination-{index:02d}@example.com",
            },
        )
        assert response.status_code == 201

    first_page = client.get("/api/v1/customers/?skip=0&limit=10", headers=headers)
    second_page = client.get("/api/v1/customers/?skip=10&limit=10", headers=headers)
    last_page = client.get("/api/v1/customers/?skip=20&limit=10", headers=headers)

    assert first_page.status_code == 200
    assert first_page.json()["total"] == 25
    assert len(first_page.json()["items"]) == 10
    assert len(second_page.json()["items"]) == 10
    assert len(last_page.json()["items"]) == 5
    assert {item["id"] for item in first_page.json()["items"]}.isdisjoint(
        {item["id"] for item in second_page.json()["items"]}
    )

    search_response = client.get(
        "/api/v1/customers/?search=Customer%2024&skip=0&limit=10",
        headers=headers,
    )
    assert search_response.status_code == 200
    assert search_response.json()["total"] == 1
    assert search_response.json()["items"][0]["email"] == "pagination-24@example.com"

    invalid_limit = client.get("/api/v1/customers/?limit=101", headers=headers)
    assert invalid_limit.status_code == 422
