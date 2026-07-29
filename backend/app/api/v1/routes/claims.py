from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import ensure_customer_access, get_current_user, is_admin, require_roles
from app.db.session import get_db
from app.models.claim import Claim, ClaimStatus, ClaimVerificationStatus
from app.models.policy import Policy
from app.models.user import User, UserRole
from app.schemas.pagination import PaginatedResponse
from app.schemas.claim import (
    ClaimAssignment,
    ClaimCreate,
    ClaimDecision,
    ClaimRead,
    ClaimSettlement,
    ClaimUpdate,
    ClaimVerification,
)

router = APIRouter()


AuthenticatedUser = Annotated[User, Depends(get_current_user)]
StaffOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]
AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


def ensure_claim_reviewer_access(user: User, claim: Claim) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.AGENT and claim.assigned_agent_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="This claim is not assigned to you",
    )


@router.post("/", response_model=ClaimRead, status_code=status.HTTP_201_CREATED)
def submit_claim(
    claim_data: ClaimCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> Claim:
    policy = db.get(Policy, claim_data.policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    ensure_customer_access(current_user, policy.customer_id)

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
    current_user: StaffOnly,
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
    current_user: StaffOnly,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[ClaimRead]:
    query = db.query(Claim).filter(Claim.status == ClaimStatus.PENDING)
    total = query.count()
    claims = query.order_by(Claim.submission_date.asc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=claims, total=total, skip=skip, limit=limit)


@router.get("/mine", response_model=PaginatedResponse[ClaimRead])
def list_my_claims(
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[ClaimRead]:
    if current_user.customer_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not linked to a customer profile")

    query = db.query(Claim).join(Policy).filter(Policy.customer_id == current_user.customer_id)
    total = query.count()
    claims = query.order_by(Claim.submission_date.desc()).offset(skip).limit(limit).all()
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
    ensure_customer_access(current_user, policy.customer_id)

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
    if not is_admin(current_user):
        ensure_customer_access(current_user, claim.policy.customer_id)
    return claim


@router.put("/{claim_id}", response_model=ClaimRead)
def update_claim(
    claim_id: int,
    claim_data: ClaimUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
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
    current_user: StaffOnly,
) -> Claim:
    if decision.status == ClaimStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be approved or rejected",
        )

    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    ensure_claim_reviewer_access(current_user, claim)
    if decision.status == ClaimStatus.APPROVED and claim.verification_status != ClaimVerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim documents must be verified before approval",
        )

    claim.status = decision.status
    claim.review_notes = decision.review_notes
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/assign", response_model=ClaimRead)
def assign_claim(
    claim_id: int,
    assignment: ClaimAssignment,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    agent = db.get(User, assignment.agent_id)
    if agent is None or agent.role != UserRole.AGENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user must be an insurance agent")
    claim.assigned_agent_id = agent.id
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/verify", response_model=ClaimRead)
def verify_claim(
    claim_id: int,
    verification: ClaimVerification,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    ensure_claim_reviewer_access(current_user, claim)
    if verification.status == ClaimVerificationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification must be verified or rejected")
    if not claim.documents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload supporting documents before verification")
    if any(document.verification_status.value != "verified" for document in claim.documents):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Every supporting document must be verified first")
    claim.verification_status = verification.status
    claim.review_notes = verification.review_notes
    if verification.status == ClaimVerificationStatus.REJECTED:
        claim.status = ClaimStatus.REJECTED
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/settle", response_model=ClaimRead)
def settle_claim(
    claim_id: int,
    settlement: ClaimSettlement,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    if claim.status != ClaimStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only approved claims can be settled")
    if claim.verification_status != ClaimVerificationStatus.VERIFIED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Claim must be verified before settlement")
    if settlement.amount > claim.claim_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Settlement cannot exceed the claim amount")
    claim.settlement_amount = settlement.amount
    claim.settlement_reference = settlement.reference
    claim.settled_at = datetime.utcnow()
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/approve", response_model=ClaimRead)
def approve_claim(
    claim_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    ensure_claim_reviewer_access(current_user, claim)
    if claim.verification_status != ClaimVerificationStatus.VERIFIED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Claim documents must be verified before approval")

    claim.status = ClaimStatus.APPROVED
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}/reject", response_model=ClaimRead)
def reject_claim(
    claim_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    ensure_claim_reviewer_access(current_user, claim)

    claim.status = ClaimStatus.REJECTED
    db.commit()
    db.refresh(claim)
    return claim
