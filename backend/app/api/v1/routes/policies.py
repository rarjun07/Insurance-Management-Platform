from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.customer import Customer
from app.models.policy import Policy, PolicyStatus
from app.models.user import User, UserRole
from app.schemas.policy import PolicyCreate, PolicyRead, PolicyRenew, PolicyUpdate

router = APIRouter()


AdminOrAgent = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]


@router.post("/", response_model=PolicyRead, status_code=status.HTTP_201_CREATED)
def create_policy(
    policy_data: PolicyCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Policy:
    if policy_data.policy_type != settings.ACTIVE_POLICY_TYPE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{policy_data.policy_type} is coming soon. Only {settings.ACTIVE_POLICY_TYPE} is available now.",
        )

    customer = db.get(Customer, policy_data.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    existing_policy = db.query(Policy).filter(Policy.policy_number == policy_data.policy_number).first()
    if existing_policy:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Policy number is already registered",
        )

    policy = Policy(**policy_data.model_dump(), status=PolicyStatus.ACTIVE)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/", response_model=list[PolicyRead])
def list_policies(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
    status_filter: Annotated[PolicyStatus | None, Query(alias="status")] = None,
    customer_id: Annotated[int | None, Query(gt=0)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Policy]:
    query = db.query(Policy)
    if status_filter:
        query = query.filter(Policy.status == status_filter)
    if customer_id:
        query = query.filter(Policy.customer_id == customer_id)

    return query.order_by(Policy.id.desc()).offset(skip).limit(limit).all()


@router.get("/active", response_model=list[PolicyRead])
def list_active_policies(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Policy]:
    return (
        db.query(Policy)
        .filter(Policy.status == PolicyStatus.ACTIVE)
        .order_by(Policy.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{policy_id}", response_model=PolicyRead)
def get_policy(
    policy_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return policy


@router.put("/{policy_id}", response_model=PolicyRead)
def update_policy(
    policy_id: int,
    policy_data: PolicyUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    update_data = policy_data.model_dump(exclude_unset=True)
    start_date = update_data.get("start_date", policy.start_date)
    end_date = update_data.get("end_date", policy.end_date)
    if end_date <= start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy end date must be after start date",
        )

    for field, value in update_data.items():
        setattr(policy, field, value)

    db.commit()
    db.refresh(policy)
    return policy


@router.patch("/{policy_id}/renew", response_model=PolicyRead)
def renew_policy(
    policy_id: int,
    renewal_data: PolicyRenew,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    policy.start_date = renewal_data.start_date
    policy.end_date = renewal_data.end_date
    policy.status = PolicyStatus.ACTIVE
    if renewal_data.premium_amount is not None:
        policy.premium_amount = renewal_data.premium_amount

    db.commit()
    db.refresh(policy)
    return policy


@router.patch("/{policy_id}/cancel", response_model=PolicyRead)
def cancel_policy(
    policy_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    policy.status = PolicyStatus.CANCELLED
    db.commit()
    db.refresh(policy)
    return policy
