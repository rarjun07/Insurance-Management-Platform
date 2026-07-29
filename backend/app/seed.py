from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.claim import Claim, ClaimStatus, ClaimVerificationStatus
from app.models.customer import Customer
from app.models.document import Document, DocumentVerificationStatus
from app.models.insurance_plan import InsurancePlan
from app.models.policy import Policy, PolicyStatus
from app.models.policy_application import PolicyApplication, PolicyApplicationStatus
from app.models.premium_payment import PaymentStatus, PremiumPayment
from app.models.system_setting import SystemSetting
from app.models.user import User, UserRole


def seed_database() -> None:
    Base.metadata.create_all(bind=engine)
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    for file_name in ["sample-aadhaar-card.pdf", "sample-health-policy.pdf", "sample-hospital-bill.pdf"]:
        file_path = upload_dir / file_name
        if not file_path.exists():
            file_path.write_text("Sample document for internship demo.\n")

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@healthinsure.com").first():
            return

        customers = [
            Customer(
                name="Rohit Sharma",
                created_at=date.today() - timedelta(days=85),
                dob=date(1994, 4, 20),
                phone="9876543210",
                address="22 Park Street, Jaipur",
                email="rohit@example.com",
            ),
            Customer(
                name="Priya Mehta",
                created_at=date.today() - timedelta(days=42),
                dob=date(1990, 9, 12),
                phone="9123456780",
                address="18 Green Avenue, Delhi",
                email="priya@example.com",
            ),
            Customer(
                name="Aman Verma",
                created_at=date.today() - timedelta(days=12),
                dob=date(1988, 1, 8),
                phone="9988776655",
                address="41 Lake View Road, Mumbai",
                email="aman@example.com",
            ),
        ]
        db.add_all(customers)
        db.flush()

        users = [
            User(
                name="Arjun Singh",
                email="admin@healthinsure.com",
                hashed_password=hash_password("password123"),
                role=UserRole.ADMIN,
            ),
            User(
                name="Neha Kapoor",
                email="agent@healthinsure.com",
                hashed_password=hash_password("password123"),
                role=UserRole.AGENT,
            ),
            User(
                name="Rohit Sharma",
                email="customer@healthinsure.com",
                hashed_password=hash_password("password123"),
                role=UserRole.CUSTOMER,
                customer_id=customers[0].id,
            ),
        ]
        db.add_all(users)
        db.flush()

        plans = [
            InsurancePlan(
                name="Silver Health",
                premium_amount=Decimal("8000.00"),
                coverage_amount=Decimal("500000.00"),
                tag="Starter",
                description="Essential hospitalization cover at an affordable yearly premium.",
                services=["Cashless hospitalization", "Pre and post hospitalization support"],
                benefits=["Annual health checkup", "No claim bonus"],
                required_documents=["Aadhaar Card", "PAN Card", "Passport size photo", "Address proof"],
                exclusions=["Initial waiting period", "Cosmetic treatment"],
            ),
            InsurancePlan(
                name="Gold Health",
                premium_amount=Decimal("12000.00"),
                coverage_amount=Decimal("1000000.00"),
                tag="Popular",
                description="Balanced family protection with higher coverage and stronger claim support.",
                services=["Wide cashless hospital network", "Hospital daily cash"],
                benefits=["Family floater option", "Faster claim assistance"],
                required_documents=["Aadhaar Card", "PAN Card", "Passport size photo", "Address proof"],
                exclusions=["Pre-existing disease waiting period", "Experimental treatments"],
            ),
            InsurancePlan(
                name="Premium Health",
                premium_amount=Decimal("18000.00"),
                coverage_amount=Decimal("2000000.00"),
                tag="Family",
                description="High family coverage with premium hospital access and dedicated claim support.",
                services=["Priority cashless approval", "Premium hospital network"],
                benefits=["Private room eligibility", "Preventive care package"],
                required_documents=["Aadhaar Card", "PAN Card", "Family member details", "Address proof"],
                exclusions=["Listed disease waiting period", "Non-medical hospital expenses"],
            ),
        ]
        db.add_all(plans)
        db.flush()

        policies = [
            Policy(
                customer_id=customers[0].id,
                plan_id=plans[1].id,
                policy_type="Health Insurance",
                policy_number="HI-2026-001",
                premium_amount=Decimal("12000.00"),
                start_date=date.today() - timedelta(days=160),
                end_date=date.today() + timedelta(days=205),
                status=PolicyStatus.ACTIVE,
            ),
            Policy(
                customer_id=customers[1].id,
                plan_id=plans[2].id,
                policy_type="Health Insurance",
                policy_number="HI-2026-002",
                premium_amount=Decimal("18000.00"),
                start_date=date.today() - timedelta(days=320),
                end_date=date.today() + timedelta(days=18),
                status=PolicyStatus.ACTIVE,
            ),
            Policy(
                customer_id=customers[2].id,
                policy_type="Health Insurance",
                policy_number="HI-2026-003",
                premium_amount=Decimal("9500.00"),
                start_date=date.today() - timedelta(days=260),
                end_date=date.today() - timedelta(days=5),
                status=PolicyStatus.EXPIRED,
            ),
        ]
        db.add_all(policies)
        db.flush()

        db.add_all(
            [
                PremiumPayment(
                    policy_id=policies[0].id,
                    due_date=date.today() - timedelta(days=4),
                    payment_date=date.today() - timedelta(days=3),
                    amount=Decimal("12000.00"),
                    payment_status=PaymentStatus.PAID,
                ),
                PremiumPayment(
                    policy_id=policies[1].id,
                    due_date=date.today() - timedelta(days=9),
                    amount=Decimal("18000.00"),
                    payment_status=PaymentStatus.OVERDUE,
                ),
                PremiumPayment(
                    policy_id=policies[2].id,
                    due_date=date.today() + timedelta(days=14),
                    amount=Decimal("9500.00"),
                    payment_status=PaymentStatus.PENDING,
                ),
            ]
        )

        claims = [
                Claim(
                    policy_id=policies[0].id,
                    claim_amount=Decimal("25000.00"),
                    reason="Hospitalization expense claim",
                    status=ClaimStatus.PENDING,
                    assigned_agent_id=users[1].id,
                    submission_date=date.today() - timedelta(days=2),
                ),
                Claim(
                    policy_id=policies[1].id,
                    claim_amount=Decimal("11000.00"),
                    reason="Diagnostic tests reimbursement",
                    status=ClaimStatus.APPROVED,
                    verification_status=ClaimVerificationStatus.VERIFIED,
                    assigned_agent_id=users[1].id,
                    submission_date=date.today() - timedelta(days=21),
                ),
                Claim(
                    policy_id=policies[2].id,
                    claim_amount=Decimal("8000.00"),
                    reason="Outpatient treatment claim",
                    status=ClaimStatus.REJECTED,
                    verification_status=ClaimVerificationStatus.REJECTED,
                    assigned_agent_id=users[1].id,
                    submission_date=date.today() - timedelta(days=35),
                ),
            ]
        db.add_all(claims)
        db.flush()

        db.add_all(
            [
                Document(
                    customer_id=customers[0].id,
                    policy_id=policies[0].id,
                    document_type="identity",
                    file_name="aadhaar-card.pdf",
                    file_path="uploads/sample-aadhaar-card.pdf",
                    verification_status=DocumentVerificationStatus.VERIFIED,
                ),
                Document(
                    customer_id=customers[1].id,
                    policy_id=policies[1].id,
                    document_type="policy",
                    file_name="health-policy.pdf",
                    file_path="uploads/sample-health-policy.pdf",
                    verification_status=DocumentVerificationStatus.PENDING,
                ),
                Document(
                    customer_id=customers[2].id,
                    policy_id=policies[2].id,
                    claim_id=claims[2].id,
                    document_type="claim",
                    file_name="hospital-bill.pdf",
                    file_path="uploads/sample-hospital-bill.pdf",
                    verification_status=DocumentVerificationStatus.REJECTED,
                    verification_notes="Bill copy is unclear. Upload a clearer scan.",
                ),
            ]
        )

        db.flush()

        db.add(
            PolicyApplication(
                customer_id=customers[0].id,
                plan_id=plans[1].id,
                plan_name="Gold Health",
                policy_type="Health Insurance",
                premium_amount="₹12,000/year",
                coverage_amount="₹10 Lakh",
                applicant_name="Rohit Sharma",
                date_of_birth=date(1994, 4, 20),
                gender="Male",
                marital_status="Single",
                occupation="Engineer",
                address="22 Park Street, Jaipur",
                nominee_name="Sunita Sharma",
                nominee_relation="Mother",
                nominee_age=58,
                height_cm="176",
                weight_kg="72",
                smoking="No",
                alcohol="No",
                previous_disease="",
                current_medication="",
                payment_method="UPI",
                document_names=["aadhaar-card.pdf", "pan-card.pdf", "medical-report.pdf"],
                status=PolicyApplicationStatus.PENDING,
            )
        )

        db.add_all(
            [
                SystemSetting(
                    key="active_policy_type",
                    value="Health Insurance",
                    description="Currently active insurance line in the platform.",
                ),
                SystemSetting(
                    key="support_email",
                    value="support@healthinsure.com",
                    description="Support contact shown to platform users.",
                ),
                SystemSetting(
                    key="allow_public_registration",
                    value="true",
                    description="Whether customers can self-register from the frontend.",
                ),
            ]
        )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
