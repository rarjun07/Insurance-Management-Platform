import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class PaymentStatus(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"


class PremiumPayment(Base):
    __tablename__ = "premium_payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(ForeignKey("policies.id"), nullable=False)
    due_date: Mapped[date] = mapped_column(nullable=False)
    payment_date: Mapped[date | None] = mapped_column(nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)

    policy = relationship("Policy", back_populates="premium_payments")
