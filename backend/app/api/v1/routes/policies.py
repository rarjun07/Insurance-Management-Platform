from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.dependencies import ensure_customer_access, get_current_user, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.customer import Customer
from app.models.insurance_plan import InsurancePlan
from app.models.policy import Policy, PolicyStatus
from app.models.user import User, UserRole
from app.schemas.pagination import PaginatedResponse
from app.schemas.policy import PolicyCreate, PolicyRead, PolicyRenew, PolicyUpdate

router = APIRouter()


StaffOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]

def refresh_expired_policies(db: Session) -> None:
    changed = (
        db.query(Policy)
        .filter(Policy.status == PolicyStatus.ACTIVE, Policy.end_date < date.today())
        .update({Policy.status: PolicyStatus.EXPIRED}, synchronize_session=False)
    )
    if changed:
        db.commit()


@router.post("/", response_model=PolicyRead, status_code=status.HTTP_201_CREATED)
def create_policy(
    policy_data: PolicyCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
) -> Policy:
    if policy_data.policy_type != settings.ACTIVE_POLICY_TYPE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{policy_data.policy_type} is coming soon. Only {settings.ACTIVE_POLICY_TYPE} is available now.",
        )

    customer = db.get(Customer, policy_data.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    policy_values = policy_data.model_dump()
    if policy_data.plan_id is not None:
        plan = db.get(InsurancePlan, policy_data.plan_id)
        if plan is None or not plan.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active insurance plan not found")
        if plan.policy_type != policy_data.policy_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan does not match the policy type")
        policy_values["premium_amount"] = plan.premium_amount
        policy_values["policy_type"] = plan.policy_type

    existing_policy = db.query(Policy).filter(Policy.policy_number == policy_data.policy_number).first()
    if existing_policy:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Policy number is already registered",
        )

    policy = Policy(**policy_values, status=PolicyStatus.ACTIVE)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/", response_model=PaginatedResponse[PolicyRead])
def list_policies(
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
    status_filter: Annotated[PolicyStatus | None, Query(alias="status")] = None,
    customer_id: Annotated[int | None, Query(gt=0)] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[PolicyRead]:
    refresh_expired_policies(db)
    query = db.query(Policy)
    if status_filter:
        query = query.filter(Policy.status == status_filter)
    if customer_id:
        query = query.filter(Policy.customer_id == customer_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Policy.policy_number.ilike(search_pattern),
                Policy.policy_type.ilike(search_pattern),
            )
        )

    total = query.count()
    policies = query.order_by(Policy.id.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=policies, total=total, skip=skip, limit=limit)


@router.get("/active", response_model=PaginatedResponse[PolicyRead])
def list_active_policies(
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[PolicyRead]:
    refresh_expired_policies(db)
    query = db.query(Policy).filter(Policy.status == PolicyStatus.ACTIVE)
    total = query.count()
    policies = query.order_by(Policy.id.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=policies, total=total, skip=skip, limit=limit)


@router.get("/expiring", response_model=PaginatedResponse[PolicyRead])
def list_expiring_policies(
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
    days: Annotated[int, Query(ge=1, le=180)] = 30,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[PolicyRead]:
    today = date.today()
    expiry_date = today + timedelta(days=days)
    query = db.query(Policy).filter(
        Policy.status == PolicyStatus.ACTIVE,
        Policy.end_date >= today,
        Policy.end_date <= expiry_date,
    )
    total = query.count()
    policies = query.order_by(Policy.end_date.asc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=policies, total=total, skip=skip, limit=limit)


@router.get("/mine", response_model=PaginatedResponse[PolicyRead])
def list_my_policies(
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[PolicyRead]:
    refresh_expired_policies(db)
    if current_user.customer_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not linked to a customer profile")

    query = db.query(Policy).filter(Policy.customer_id == current_user.customer_id)
    total = query.count()
    policies = query.order_by(Policy.id.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=policies, total=total, skip=skip, limit=limit)


@router.get("/{policy_id}", response_model=PolicyRead)
def get_policy(
    policy_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    ensure_customer_access(current_user, policy.customer_id)
    return policy


@router.put("/{policy_id}", response_model=PolicyRead)
def update_policy(
    policy_id: int,
    policy_data: PolicyUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
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
    current_user: StaffOnly,
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
    current_user: StaffOnly,
) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    policy.status = PolicyStatus.CANCELLED
    db.commit()
    db.refresh(policy)
    return policy
