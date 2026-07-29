"""add agent role, policy applications, settings, and document verification

Revision ID: 20260727_0006
Revises: 20260724_0005
Create Date: 2026-07-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260727_0006"
down_revision: str | None = "20260724_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    document_verification_status = sa.Enum(
        "PENDING",
        "VERIFIED",
        "REJECTED",
        name="documentverificationstatus",
    )

    if dialect == "postgresql":
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'AGENT'")
        document_verification_status.create(bind, checkfirst=True)

    op.create_table(
        "policy_applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("plan_name", sa.String(length=100), nullable=False),
        sa.Column("policy_type", sa.String(length=100), nullable=False),
        sa.Column("premium_amount", sa.String(length=50), nullable=False),
        sa.Column("coverage_amount", sa.String(length=50), nullable=False),
        sa.Column("applicant_name", sa.String(length=100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(length=20), nullable=False),
        sa.Column("marital_status", sa.String(length=30), nullable=False),
        sa.Column("occupation", sa.String(length=100), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("nominee_name", sa.String(length=100), nullable=False),
        sa.Column("nominee_relation", sa.String(length=50), nullable=False),
        sa.Column("nominee_age", sa.Integer(), nullable=False),
        sa.Column("height_cm", sa.String(length=20), nullable=False),
        sa.Column("weight_kg", sa.String(length=20), nullable=False),
        sa.Column("smoking", sa.String(length=10), nullable=False),
        sa.Column("alcohol", sa.String(length=10), nullable=False),
        sa.Column("previous_disease", sa.Text(), nullable=False),
        sa.Column("current_medication", sa.Text(), nullable=False),
        sa.Column("payment_method", sa.String(length=30), nullable=False),
        sa.Column("document_names", sa.JSON(), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "APPROVED", "REJECTED", name="policyapplicationstatus"), nullable=False),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.Column("generated_policy_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.ForeignKeyConstraint(["generated_policy_id"], ["policies.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_policy_applications_customer_id"), "policy_applications", ["customer_id"], unique=False)
    op.create_index(op.f("ix_policy_applications_id"), "policy_applications", ["id"], unique=False)

    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_system_settings_id"), "system_settings", ["id"], unique=False)
    op.create_index(op.f("ix_system_settings_key"), "system_settings", ["key"], unique=True)

    op.add_column(
        "documents",
        sa.Column(
            "verification_status",
            document_verification_status,
            nullable=False,
            server_default="PENDING",
        ),
    )
    op.add_column("documents", sa.Column("verification_notes", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("verified_at", sa.DateTime(), nullable=True))
    op.add_column("documents", sa.Column("verified_by", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_documents_verified_by_users",
        "documents",
        "users",
        ["verified_by"],
        ["id"],
    )
    op.alter_column("documents", "verification_status", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_constraint("fk_documents_verified_by_users", "documents", type_="foreignkey")
    op.drop_column("documents", "verified_by")
    op.drop_column("documents", "verified_at")
    op.drop_column("documents", "verification_notes")
    op.drop_column("documents", "verification_status")
    if bind.dialect.name == "postgresql":
        sa.Enum(name="documentverificationstatus").drop(bind, checkfirst=True)

    op.drop_index(op.f("ix_system_settings_key"), table_name="system_settings")
    op.drop_index(op.f("ix_system_settings_id"), table_name="system_settings")
    op.drop_table("system_settings")

    op.drop_index(op.f("ix_policy_applications_id"), table_name="policy_applications")
    op.drop_index(op.f("ix_policy_applications_customer_id"), table_name="policy_applications")
    op.drop_table("policy_applications")
