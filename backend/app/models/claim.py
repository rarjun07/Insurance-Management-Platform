import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ClaimStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ClaimVerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(ForeignKey("policies.id"), nullable=False)
    claim_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ClaimStatus] = mapped_column(Enum(ClaimStatus), default=ClaimStatus.PENDING, nullable=False)
    verification_status: Mapped[ClaimVerificationStatus] = mapped_column(
        Enum(ClaimVerificationStatus),
        default=ClaimVerificationStatus.PENDING,
        nullable=False,
    )
    assigned_agent_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    review_notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    settlement_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    settled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    settlement_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    submission_date: Mapped[date] = mapped_column(nullable=False)

    policy = relationship("Policy", back_populates="claims")
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])
    documents = relationship("Document", back_populates="claim")
