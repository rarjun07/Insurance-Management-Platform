from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import ensure_customer_access, get_current_user, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.customer import Customer
from app.models.document import DocumentVerificationStatus
from app.models.insurance_plan import InsurancePlan
from app.models.policy import Policy, PolicyStatus
from app.models.policy_application import PolicyApplication, PolicyApplicationStatus
from app.models.premium_payment import PaymentStatus, PremiumPayment
from app.models.user import User, UserRole
from app.schemas.pagination import PaginatedResponse
from app.schemas.policy_application import PolicyApplicationCreate, PolicyApplicationRead, PolicyApplicationReview

router = APIRouter()

AuthenticatedUser = Annotated[User, Depends(get_current_user)]
StaffUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]


def generate_policy_number(customer_id: int, application_id: int) -> str:
    return f"HI-{customer_id:04d}-{application_id:04d}"


def parse_currency_amount(value: str) -> Decimal:
    cleaned = value.replace("₹", "").replace(",", "").replace("/year", "").replace("Lakh", "00000").strip()
    numeric = "".join(ch for ch in cleaned if ch.isdigit() or ch == ".")
    if not numeric:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid premium amount")
    return Decimal(numeric)


@router.post("/", response_model=PolicyApplicationRead, status_code=status.HTTP_201_CREATED)
def submit_application(
    payload: PolicyApplicationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> PolicyApplication:
    if current_user.customer_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not linked to a customer profile")
    customer = db.get(Customer, current_user.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    ensure_customer_access(current_user, customer.id)

    plan = db.get(InsurancePlan, payload.plan_id)
    if plan is None or not plan.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active insurance plan not found")

    application_data = payload.model_dump()
    application_data.update(
        {
            "plan_name": plan.name,
            "policy_type": plan.policy_type,
            "premium_amount": f"₹{plan.premium_amount:,.0f}/year",
            "coverage_amount": f"₹{plan.coverage_amount:,.0f}",
        }
    )
    application = PolicyApplication(customer_id=customer.id, **application_data)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/", response_model=PaginatedResponse[PolicyApplicationRead])
def list_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffUser,
    status_filter: Annotated[PolicyApplicationStatus | None, Query(alias="status")] = None,
    customer_id: Annotated[int | None, Query(gt=0)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[PolicyApplicationRead]:
    query = db.query(PolicyApplication)
    if status_filter:
        query = query.filter(PolicyApplication.status == status_filter)
    if customer_id:
        query = query.filter(PolicyApplication.customer_id == customer_id)
    total = query.count()
    items = query.order_by(PolicyApplication.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/mine", response_model=PaginatedResponse[PolicyApplicationRead])
def list_my_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[PolicyApplicationRead]:
    if current_user.customer_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not linked to a customer profile")
    query = db.query(PolicyApplication).filter(PolicyApplication.customer_id == current_user.customer_id)
    total = query.count()
    items = query.order_by(PolicyApplication.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.patch("/{application_id}/review", response_model=PolicyApplicationRead)
def review_application(
    application_id: int,
    payload: PolicyApplicationReview,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffUser,
) -> PolicyApplication:
    application = db.get(PolicyApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if application.status != PolicyApplicationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application already reviewed")

    application.status = payload.status
    application.review_notes = payload.review_notes
    application.reviewed_at = datetime.utcnow()
    application.reviewed_by = current_user.id

    if payload.status == PolicyApplicationStatus.APPROVED:
        if not application.documents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application documents must be uploaded before approval",
            )
        if any(document.verification_status != DocumentVerificationStatus.VERIFIED for document in application.documents):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Every application document must be verified before approval",
            )
        policy = Policy(
            customer_id=application.customer_id,
            plan_id=application.plan_id,
            policy_type=settings.ACTIVE_POLICY_TYPE,
            policy_number=generate_policy_number(application.customer_id, application.id),
            premium_amount=parse_currency_amount(application.premium_amount),
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            status=PolicyStatus.ACTIVE,
        )
        db.add(policy)
        db.flush()
        db.add(
            PremiumPayment(
                policy_id=policy.id,
                due_date=date.today(),
                payment_date=None,
                amount=policy.premium_amount,
                payment_status=PaymentStatus.PENDING,
            )
        )
        application.generated_policy_id = policy.id

    db.commit()
    db.refresh(application)
    return application
