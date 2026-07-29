"""add customer created_at

Revision ID: 20260724_0005
Revises: 20260724_0004
Create Date: 2026-07-24 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260724_0005"
down_revision: str | None = "20260724_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "customers",
        sa.Column("created_at", sa.Date(), nullable=False, server_default=sa.func.current_date()),
    )
    op.alter_column("customers", "created_at", server_default=None)


def downgrade() -> None:
    op.drop_column("customers", "created_at")
