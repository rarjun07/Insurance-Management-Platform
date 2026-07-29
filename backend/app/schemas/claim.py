from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.claim import ClaimStatus, ClaimVerificationStatus


class ClaimBase(BaseModel):
    policy_id: int = Field(gt=0)
    claim_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    reason: str = Field(min_length=5, max_length=255)


class ClaimCreate(ClaimBase):
    submission_date: date | None = None


class ClaimUpdate(BaseModel):
    claim_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    reason: str | None = Field(default=None, min_length=5, max_length=255)
    status: ClaimStatus | None = None


class ClaimDecision(BaseModel):
    status: ClaimStatus
    review_notes: str | None = Field(default=None, max_length=1000)


class ClaimAssignment(BaseModel):
    agent_id: int = Field(gt=0)


class ClaimVerification(BaseModel):
    status: ClaimVerificationStatus
    review_notes: str | None = Field(default=None, max_length=1000)


class ClaimSettlement(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    reference: str = Field(min_length=3, max_length=100)


class ClaimRead(ClaimBase):
    id: int
    status: ClaimStatus
    verification_status: ClaimVerificationStatus
    assigned_agent_id: int | None
    review_notes: str | None
    settlement_amount: Decimal | None
    settled_at: datetime | None
    settlement_reference: str | None
    submission_date: date

    model_config = {"from_attributes": True}
