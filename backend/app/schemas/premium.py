from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.premium_payment import PaymentStatus


class PremiumPaymentBase(BaseModel):
    policy_id: int = Field(gt=0)
    due_date: date
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class PremiumPaymentCreate(PremiumPaymentBase):
    payment_date: date | None = None
    payment_status: PaymentStatus | None = None


class PremiumPaymentUpdate(BaseModel):
    due_date: date | None = None
    payment_date: date | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    payment_status: PaymentStatus | None = None


class PremiumPaymentRead(PremiumPaymentBase):
    id: int
    payment_date: date | None
    payment_status: PaymentStatus

    model_config = {"from_attributes": True}


class PremiumSummary(BaseModel):
    policy_id: int
    total_payments: int
    paid_payments: int
    pending_payments: int
    overdue_payments: int
    total_paid_amount: Decimal
