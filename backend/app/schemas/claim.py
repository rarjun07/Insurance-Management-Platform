from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.claim import ClaimStatus


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


class ClaimRead(ClaimBase):
    id: int
    status: ClaimStatus
    submission_date: date

    model_config = {"from_attributes": True}
