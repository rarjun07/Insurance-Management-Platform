"""add document metadata

Revision ID: 20260724_0003
Revises: 20260724_0002
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260724_0003"
down_revision: Union[str, Sequence[str], None] = "20260724_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("policy_id", sa.Integer(), nullable=True))
    op.add_column(
        "documents",
        sa.Column("document_type", sa.String(length=50), server_default="identity", nullable=False),
    )
    op.create_foreign_key(
        "fk_documents_policy_id_policies",
        "documents",
        "policies",
        ["policy_id"],
        ["id"],
    )
    op.alter_column("documents", "document_type", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_documents_policy_id_policies", "documents", type_="foreignkey")
    op.drop_column("documents", "document_type")
    op.drop_column("documents", "policy_id")
