"""add database-backed plans and repair legacy workflow links

Revision ID: 20260728_0009
Revises: 20260728_0008
"""

from collections.abc import Sequence
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision: str = "20260728_0009"
down_revision: str | None = "20260728_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    plans = op.create_table(
        "insurance_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("policy_type", sa.String(length=100), nullable=False),
        sa.Column("premium_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("coverage_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("tag", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("services", sa.JSON(), nullable=False),
        sa.Column("benefits", sa.JSON(), nullable=False),
        sa.Column("required_documents", sa.JSON(), nullable=False),
        sa.Column("exclusions", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_insurance_plans_id"), "insurance_plans", ["id"], unique=False)
    op.create_index(op.f("ix_insurance_plans_name"), "insurance_plans", ["name"], unique=True)

    now = datetime.utcnow()
    op.bulk_insert(
        plans,
        [
            {
                "name": "Silver Health",
                "policy_type": "Health Insurance",
                "premium_amount": 8000,
                "coverage_amount": 500000,
                "tag": "Starter",
                "description": "Essential hospitalization cover at an affordable yearly premium.",
                "services": ["Cashless hospitalization", "Pre and post hospitalization support", "Day-care procedures", "Emergency ambulance"],
                "benefits": ["Room rent support", "Annual health checkup", "No claim bonus", "Section 80D tax benefit"],
                "required_documents": ["Aadhaar Card", "PAN Card", "Passport size photo", "Address proof"],
                "exclusions": ["Initial waiting period", "Cosmetic treatment", "Non-prescribed treatment"],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "Gold Health",
                "policy_type": "Health Insurance",
                "premium_amount": 12000,
                "coverage_amount": 1000000,
                "tag": "Popular",
                "description": "Balanced family protection with higher coverage and stronger claim support.",
                "services": ["Wide cashless hospital network", "Hospital daily cash", "Specialist consultation", "Medical report verification"],
                "benefits": ["Higher room rent limit", "No claim bonus", "Family floater option", "Faster claim assistance"],
                "required_documents": ["Aadhaar Card", "PAN Card", "Passport size photo", "Address proof", "Medical reports if required"],
                "exclusions": ["Pre-existing disease waiting period", "Unapproved admission", "Experimental treatments"],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "Premium Health",
                "policy_type": "Health Insurance",
                "premium_amount": 18000,
                "coverage_amount": 2000000,
                "tag": "Family",
                "description": "High family coverage with premium hospital access and dedicated claim support.",
                "services": ["Priority cashless approval", "Premium hospital network", "Advanced diagnostics", "Dedicated claim assistance"],
                "benefits": ["Private room eligibility", "Higher no claim bonus", "Family floater coverage", "Preventive care package"],
                "required_documents": ["Aadhaar Card", "PAN Card", "Family member details", "Address proof", "Medical history"],
                "exclusions": ["Listed disease waiting period", "Self-inflicted injuries", "Non-medical hospital expenses"],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    op.add_column("policy_applications", sa.Column("plan_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_policy_applications_plan_id"), "policy_applications", ["plan_id"], unique=False)
    op.create_foreign_key(
        "fk_policy_applications_plan_id_insurance_plans",
        "policy_applications",
        "insurance_plans",
        ["plan_id"],
        ["id"],
    )
    op.add_column("policies", sa.Column("plan_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_policies_plan_id"), "policies", ["plan_id"], unique=False)
    op.create_foreign_key(
        "fk_policies_plan_id_insurance_plans",
        "policies",
        "insurance_plans",
        ["plan_id"],
        ["id"],
    )

    op.execute(
        "UPDATE policy_applications SET plan_id = insurance_plans.id "
        "FROM insurance_plans WHERE policy_applications.plan_name = insurance_plans.name"
    )
    op.execute(
        "UPDATE policies SET plan_id = insurance_plans.id "
        "FROM insurance_plans WHERE policies.premium_amount = insurance_plans.premium_amount"
    )
    op.execute(
        "UPDATE documents SET claim_id = claims.id FROM claims "
        "WHERE documents.document_type = 'claim' AND documents.claim_id IS NULL "
        "AND documents.policy_id = claims.policy_id"
    )
    op.execute(
        "UPDATE documents SET document_type = 'identity' "
        "WHERE document_type = 'policy' AND policy_id IS NULL AND application_id IS NULL"
    )
    op.execute("UPDATE claims SET verification_status = 'VERIFIED' WHERE status = 'APPROVED'")
    op.execute("UPDATE claims SET verification_status = 'REJECTED' WHERE status = 'REJECTED'")
    op.execute(
        "UPDATE claims SET assigned_agent_id = (SELECT id FROM users WHERE role = 'AGENT' ORDER BY id LIMIT 1) "
        "WHERE assigned_agent_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'AGENT')"
    )
    op.execute(
        "UPDATE system_settings SET description = 'Whether customers can self-register from the frontend.' "
        "WHERE key = 'allow_public_registration'"
    )

    op.create_check_constraint(
        "ck_documents_policy_link",
        "documents",
        "document_type != 'policy' OR policy_id IS NOT NULL OR application_id IS NOT NULL",
    )
    op.create_check_constraint(
        "ck_documents_claim_link",
        "documents",
        "document_type != 'claim' OR claim_id IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_constraint("ck_documents_claim_link", "documents", type_="check")
    op.drop_constraint("ck_documents_policy_link", "documents", type_="check")
    op.drop_constraint("fk_policies_plan_id_insurance_plans", "policies", type_="foreignkey")
    op.drop_index(op.f("ix_policies_plan_id"), table_name="policies")
    op.drop_column("policies", "plan_id")
    op.drop_constraint("fk_policy_applications_plan_id_insurance_plans", "policy_applications", type_="foreignkey")
    op.drop_index(op.f("ix_policy_applications_plan_id"), table_name="policy_applications")
    op.drop_column("policy_applications", "plan_id")
    op.drop_index(op.f("ix_insurance_plans_name"), table_name="insurance_plans")
    op.drop_index(op.f("ix_insurance_plans_id"), table_name="insurance_plans")
    op.drop_table("insurance_plans")
