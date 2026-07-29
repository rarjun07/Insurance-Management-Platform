from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class InsurancePlanBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    policy_type: str = Field(default="Health Insurance", min_length=2, max_length=100)
    premium_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    coverage_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    tag: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=5, max_length=2000)
    services: list[str] = Field(min_length=1)
    benefits: list[str] = Field(min_length=1)
    required_documents: list[str] = Field(min_length=1)
    exclusions: list[str] = Field(default_factory=list)
    is_active: bool = True


class InsurancePlanCreate(InsurancePlanBase):
    pass


class InsurancePlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    policy_type: str | None = Field(default=None, min_length=2, max_length=100)
    premium_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    coverage_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    tag: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, min_length=5, max_length=2000)
    services: list[str] | None = Field(default=None, min_length=1)
    benefits: list[str] | None = Field(default=None, min_length=1)
    required_documents: list[str] | None = Field(default=None, min_length=1)
    exclusions: list[str] | None = None
    is_active: bool | None = None


class InsurancePlanRead(InsurancePlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
