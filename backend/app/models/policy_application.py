import enum
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class PolicyApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PolicyApplication(Base):
    __tablename__ = "policy_applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("insurance_plans.id"), nullable=True, index=True)
    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    policy_type: Mapped[str] = mapped_column(String(100), nullable=False, default="Health Insurance")
    premium_amount: Mapped[str] = mapped_column(String(50), nullable=False)
    coverage_amount: Mapped[str] = mapped_column(String(50), nullable=False)
    applicant_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    marital_status: Mapped[str] = mapped_column(String(30), nullable=False)
    occupation: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    nominee_name: Mapped[str] = mapped_column(String(100), nullable=False)
    nominee_relation: Mapped[str] = mapped_column(String(50), nullable=False)
    nominee_age: Mapped[int] = mapped_column(nullable=False)
    height_cm: Mapped[str] = mapped_column(String(20), nullable=False)
    weight_kg: Mapped[str] = mapped_column(String(20), nullable=False)
    smoking: Mapped[str] = mapped_column(String(10), nullable=False)
    alcohol: Mapped[str] = mapped_column(String(10), nullable=False)
    previous_disease: Mapped[str] = mapped_column(Text, nullable=False, default="")
    current_medication: Mapped[str] = mapped_column(Text, nullable=False, default="")
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    document_names: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[PolicyApplicationStatus] = mapped_column(
        Enum(PolicyApplicationStatus),
        default=PolicyApplicationStatus.PENDING,
        nullable=False,
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    generated_policy_id: Mapped[int | None] = mapped_column(ForeignKey("policies.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="applications")
    plan = relationship("InsurancePlan", back_populates="applications")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    generated_policy = relationship("Policy", foreign_keys=[generated_policy_id])
    documents = relationship("Document", back_populates="application")
