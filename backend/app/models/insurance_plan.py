from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, Boolean, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class InsurancePlan(Base):
    __tablename__ = "insurance_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    policy_type: Mapped[str] = mapped_column(String(100), nullable=False, default="Health Insurance")
    premium_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    coverage_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tag: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    services: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    benefits: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    required_documents: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    exclusions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    applications = relationship("PolicyApplication", back_populates="plan")
    policies = relationship("Policy", back_populates="plan")
