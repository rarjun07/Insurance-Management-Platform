"""add user profile images

Revision ID: 20260729_0010
Revises: 20260728_0009
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260729_0010"
down_revision: str | None = "20260728_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_image_path")
