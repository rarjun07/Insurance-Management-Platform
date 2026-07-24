"""add premium payment due date

Revision ID: 20260724_0002
Revises: 20260723_0001
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260724_0002"
down_revision: Union[str, Sequence[str], None] = "20260723_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("premium_payments", sa.Column("due_date", sa.Date(), nullable=False))


def downgrade() -> None:
    op.drop_column("premium_payments", "due_date")
