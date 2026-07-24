from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.db.session import get_db
from app.models.policy import Policy
from app.models.premium_payment import PaymentStatus, PremiumPayment
from app.models.user import User, UserRole
from app.schemas.premium import (
    PremiumPaymentCreate,
    PremiumPaymentRead,
    PremiumPaymentUpdate,
    PremiumSummary,
)

router = APIRouter()


AdminOrAgent = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]


def resolve_payment_status(
    due_date: date,
    payment_date: date | None,
    requested_status: PaymentStatus | None = None,
) -> PaymentStatus:
    if requested_status:
        return requested_status
    if payment_date:
        return PaymentStatus.PAID
    if due_date < date.today():
        return PaymentStatus.OVERDUE
    return PaymentStatus.PENDING


@router.post("/", response_model=PremiumPaymentRead, status_code=status.HTTP_201_CREATED)
def record_premium_payment(
    payment_data: PremiumPaymentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> PremiumPayment:
    policy = db.get(Policy, payment_data.policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    payment = PremiumPayment(
        policy_id=payment_data.policy_id,
        due_date=payment_data.due_date,
        payment_date=payment_data.payment_date,
        amount=payment_data.amount,
        payment_status=resolve_payment_status(
            due_date=payment_data.due_date,
            payment_date=payment_data.payment_date,
            requested_status=payment_data.payment_status,
        ),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/", response_model=list[PremiumPaymentRead])
def list_premium_payments(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
    policy_id: Annotated[int | None, Query(gt=0)] = None,
    status_filter: Annotated[PaymentStatus | None, Query(alias="status")] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[PremiumPayment]:
    query = db.query(PremiumPayment)
    if policy_id:
        query = query.filter(PremiumPayment.policy_id == policy_id)
    if status_filter:
        query = query.filter(PremiumPayment.payment_status == status_filter)

    return query.order_by(PremiumPayment.id.desc()).offset(skip).limit(limit).all()


@router.get("/overdue", response_model=list[PremiumPaymentRead])
def list_overdue_premiums(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[PremiumPayment]:
    return (
        db.query(PremiumPayment)
        .filter(PremiumPayment.payment_status == PaymentStatus.OVERDUE)
        .order_by(PremiumPayment.due_date.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{payment_id}", response_model=PremiumPaymentRead)
def get_premium_payment(
    payment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> PremiumPayment:
    payment = db.get(PremiumPayment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Premium payment not found")
    return payment


@router.put("/{payment_id}", response_model=PremiumPaymentRead)
def update_premium_payment(
    payment_id: int,
    payment_data: PremiumPaymentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> PremiumPayment:
    payment = db.get(PremiumPayment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Premium payment not found")

    update_data = payment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)

    if "payment_status" not in update_data:
        payment.payment_status = resolve_payment_status(
            due_date=payment.due_date,
            payment_date=payment.payment_date,
        )

    db.commit()
    db.refresh(payment)
    return payment


@router.patch("/{payment_id}/mark-paid", response_model=PremiumPaymentRead)
def mark_premium_paid(
    payment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> PremiumPayment:
    payment = db.get(PremiumPayment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Premium payment not found")

    payment.payment_date = date.today()
    payment.payment_status = PaymentStatus.PAID
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/policy/{policy_id}/history", response_model=list[PremiumPaymentRead])
def get_policy_payment_history(
    policy_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> list[PremiumPayment]:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    return (
        db.query(PremiumPayment)
        .filter(PremiumPayment.policy_id == policy_id)
        .order_by(PremiumPayment.due_date.desc())
        .all()
    )


@router.get("/policy/{policy_id}/summary", response_model=PremiumSummary)
def get_policy_payment_summary(
    policy_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> PremiumSummary:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    payments = db.query(PremiumPayment).filter(PremiumPayment.policy_id == policy_id).all()
    paid_payments = [payment for payment in payments if payment.payment_status == PaymentStatus.PAID]
    pending_payments = [payment for payment in payments if payment.payment_status == PaymentStatus.PENDING]
    overdue_payments = [payment for payment in payments if payment.payment_status == PaymentStatus.OVERDUE]

    return PremiumSummary(
        policy_id=policy_id,
        total_payments=len(payments),
        paid_payments=len(paid_payments),
        pending_payments=len(pending_payments),
        overdue_payments=len(overdue_payments),
        total_paid_amount=sum((payment.amount for payment in paid_payments), Decimal("0.00")),
    )
