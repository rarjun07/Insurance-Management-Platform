"""link documents to policy applications

Revision ID: 20260728_0007
Revises: 20260727_0006
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260728_0007"
down_revision: str | None = "20260727_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("application_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_documents_application_id"), "documents", ["application_id"], unique=False)
    op.create_foreign_key(
        "fk_documents_application_id_policy_applications",
        "documents",
        "policy_applications",
        ["application_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_documents_application_id_policy_applications",
        "documents",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_documents_application_id"), table_name="documents")
    op.drop_column("documents", "application_id")
