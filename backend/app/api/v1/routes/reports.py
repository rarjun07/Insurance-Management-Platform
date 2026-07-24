from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.db.session import get_db
from app.models.claim import Claim, ClaimStatus
from app.models.customer import Customer
from app.models.policy import Policy, PolicyStatus
from app.models.premium_payment import PaymentStatus, PremiumPayment
from app.models.user import User, UserRole
from app.schemas.report import (
    ClaimReport,
    CustomerReport,
    DashboardReport,
    PolicyReport,
    PremiumReport,
)


router = APIRouter()


AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


def build_customer_report(db: Session) -> CustomerReport:
    return CustomerReport(total_customers=db.query(Customer).count())


def build_policy_report(db: Session) -> PolicyReport:
    return PolicyReport(
        total_policies=db.query(Policy).count(),
        active_policies=db.query(Policy).filter(Policy.status == PolicyStatus.ACTIVE).count(),
        expired_policies=db.query(Policy).filter(Policy.status == PolicyStatus.EXPIRED).count(),
        cancelled_policies=db.query(Policy).filter(Policy.status == PolicyStatus.CANCELLED).count(),
    )


def build_claim_report(db: Session) -> ClaimReport:
    return ClaimReport(
        total_claims=db.query(Claim).count(),
        pending_claims=db.query(Claim).filter(Claim.status == ClaimStatus.PENDING).count(),
        approved_claims=db.query(Claim).filter(Claim.status == ClaimStatus.APPROVED).count(),
        rejected_claims=db.query(Claim).filter(Claim.status == ClaimStatus.REJECTED).count(),
    )


def build_premium_report(db: Session) -> PremiumReport:
    total_collected = (
        db.query(func.coalesce(func.sum(PremiumPayment.amount), 0))
        .filter(PremiumPayment.payment_status == PaymentStatus.PAID)
        .scalar()
    )

    return PremiumReport(
        total_premium_records=db.query(PremiumPayment).count(),
        paid_premiums=db.query(PremiumPayment).filter(PremiumPayment.payment_status == PaymentStatus.PAID).count(),
        pending_premiums=db.query(PremiumPayment).filter(PremiumPayment.payment_status == PaymentStatus.PENDING).count(),
        overdue_premiums=db.query(PremiumPayment).filter(PremiumPayment.payment_status == PaymentStatus.OVERDUE).count(),
        total_collected_amount=Decimal(total_collected),
    )


@router.get("/summary", response_model=DashboardReport)
def reports_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> DashboardReport:
    return DashboardReport(
        customers=build_customer_report(db),
        policies=build_policy_report(db),
        claims=build_claim_report(db),
        premiums=build_premium_report(db),
    )


@router.get("/customers", response_model=CustomerReport)
def customer_growth_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> CustomerReport:
    return build_customer_report(db)


@router.get("/policies", response_model=PolicyReport)
def policies_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> PolicyReport:
    return build_policy_report(db)


@router.get("/claims", response_model=ClaimReport)
def claims_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> ClaimReport:
    return build_claim_report(db)


@router.get("/premiums", response_model=PremiumReport)
def premium_collection_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> PremiumReport:
    return build_premium_report(db)
