from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.claim import Claim, ClaimStatus
from app.models.policy import Policy
from app.models.user import User, UserRole
from app.schemas.pagination import PaginatedResponse
from app.schemas.claim import ClaimCreate, ClaimDecision, ClaimRead, ClaimUpdate

router = APIRouter()


AuthenticatedUser = Annotated[User, Depends(get_current_user)]
AdminOrAgent = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]


@router.post("/", response_model=ClaimRead, status_code=status.HTTP_201_CREATED)
def submit_claim(
    claim_data: ClaimCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> Claim:
    policy = db.get(Policy, claim_data.policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    claim = Claim(
        policy_id=claim_data.policy_id,
        claim_amount=claim_data.claim_amount,
        reason=claim_data.reason,
        status=ClaimStatus.PENDING,
        submission_date=claim_data.submission_date or date.today(),
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


@router.get("/", response_model=PaginatedResponse[ClaimRead])
def list_claims(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
    status_filter: Annotated[ClaimStatus | None, Query(alias="status")] = None,
    policy_id: Annotated[int | None, Query(gt=0)] = None,
    submitted_before: Annotated[date | None, Query()] = None,
    submitted_after: Annotated[date | None, Query()] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[ClaimRead]:
    query = db.query(Claim)
    if status_filter:
        query = query.filter(Claim.status == status_filter)
    if policy_id:
        query = query.filter(Claim.policy_id == policy_id)
    if submitted_before:
        query = query.filter(Claim.submission_date <= submitted_before)
    if submitted_after:
        query = query.filter(Claim.submission_date >= submitted_after)

    total = query.count()
    claims = query.order_by(Claim.id.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=claims, total=total, skip=skip, limit=limit)


@router.get("/pending", response_model=PaginatedResponse[ClaimRead])
def list_pending_claims(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[ClaimRead]:
    query = db.query(Claim).filter(Claim.status == ClaimStatus.PENDING)
    total = query.count()
    claims = query.order_by(Claim.submission_date.asc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=claims, total=total, skip=skip, limit=limit)


@router.get("/policy/{policy_id}/history", response_model=list[ClaimRead])
def get_policy_claim_history(
    policy_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> list[Claim]:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    return (
        db.query(Claim)
        .filter(Claim.policy_id == policy_id)
        .order_by(Claim.submission_date.desc())
        .all()
    )


@router.get("/{claim_id}", response_model=ClaimRead)
def get_claim(
    claim_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    return claim


@router.put("/{claim_id}", response_model=ClaimRead)
def update_claim(
    claim_id: int,
    claim_data: ClaimUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    update_data = claim_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(claim, field, value)

    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/decision", response_model=ClaimRead)
def decide_claim(
    claim_id: int,
    decision: ClaimDecision,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Claim:
    if decision.status == ClaimStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be approved or rejected",
        )

    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    claim.status = decision.status
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/approve", response_model=ClaimRead)
def approve_claim(
    claim_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    claim.status = ClaimStatus.APPROVED
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/reject", response_model=ClaimRead)
def reject_claim(
    claim_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    claim.status = ClaimStatus.REJECTED
    db.commit()
    db.refresh(claim)
    return claim
