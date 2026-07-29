"""complete claim workflow

Revision ID: 20260728_0008
Revises: 20260728_0007
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260728_0008"
down_revision: str | None = "20260728_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    claim_verification = sa.Enum("PENDING", "VERIFIED", "REJECTED", name="claimverificationstatus")
    claim_verification.create(op.get_bind(), checkfirst=True)
    op.add_column("claims", sa.Column("verification_status", claim_verification, nullable=False, server_default="PENDING"))
    op.add_column("claims", sa.Column("assigned_agent_id", sa.Integer(), nullable=True))
    op.add_column("claims", sa.Column("review_notes", sa.String(length=1000), nullable=True))
    op.add_column("claims", sa.Column("settlement_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column("claims", sa.Column("settled_at", sa.DateTime(), nullable=True))
    op.add_column("claims", sa.Column("settlement_reference", sa.String(length=100), nullable=True))
    op.create_index(op.f("ix_claims_assigned_agent_id"), "claims", ["assigned_agent_id"], unique=False)
    op.create_foreign_key("fk_claims_assigned_agent_id_users", "claims", "users", ["assigned_agent_id"], ["id"])

    op.add_column("documents", sa.Column("claim_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_documents_claim_id"), "documents", ["claim_id"], unique=False)
    op.create_foreign_key("fk_documents_claim_id_claims", "documents", "claims", ["claim_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_documents_claim_id_claims", "documents", type_="foreignkey")
    op.drop_index(op.f("ix_documents_claim_id"), table_name="documents")
    op.drop_column("documents", "claim_id")
    op.drop_constraint("fk_claims_assigned_agent_id_users", "claims", type_="foreignkey")
    op.drop_index(op.f("ix_claims_assigned_agent_id"), table_name="claims")
    op.drop_column("claims", "settlement_reference")
    op.drop_column("claims", "settled_at")
    op.drop_column("claims", "settlement_amount")
    op.drop_column("claims", "review_notes")
    op.drop_column("claims", "assigned_agent_id")
    op.drop_column("claims", "verification_status")
    sa.Enum(name="claimverificationstatus").drop(op.get_bind(), checkfirst=True)
