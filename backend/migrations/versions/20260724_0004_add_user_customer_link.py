"""add user customer link

Revision ID: 20260724_0004
Revises: 20260724_0003
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260724_0004"
down_revision: Union[str, Sequence[str], None] = "20260724_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("customer_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_customer_id_customers",
        "users",
        "customers",
        ["customer_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_customer_id_customers", "users", type_="foreignkey")
    op.drop_column("users", "customer_id")
