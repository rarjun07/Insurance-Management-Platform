from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.policy import PolicyStatus


class PolicyBase(BaseModel):
    customer_id: int = Field(gt=0)
    policy_type: str = Field(default="Health Insurance", min_length=2, max_length=100)
    policy_number: str = Field(min_length=3, max_length=50)
    premium_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_policy_dates(self) -> "PolicyBase":
        if self.end_date <= self.start_date:
            raise ValueError("Policy end date must be after start date")
        return self


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseModel):
    premium_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    start_date: date | None = None
    end_date: date | None = None
    status: PolicyStatus | None = None

    @model_validator(mode="after")
    def validate_policy_dates(self) -> "PolicyUpdate":
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("Policy end date must be after start date")
        return self


class PolicyRenew(BaseModel):
    premium_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_policy_dates(self) -> "PolicyRenew":
        if self.end_date <= self.start_date:
            raise ValueError("Policy end date must be after start date")
        return self


class PolicyRead(PolicyBase):
    id: int
    status: PolicyStatus

    model_config = {"from_attributes": True}
