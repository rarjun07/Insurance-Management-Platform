from decimal import Decimal

from pydantic import BaseModel


class PolicyReport(BaseModel):
    total_policies: int
    active_policies: int
    expired_policies: int
    cancelled_policies: int


class ClaimReport(BaseModel):
    total_claims: int
    pending_claims: int
    approved_claims: int
    rejected_claims: int


class PremiumReport(BaseModel):
    total_premium_records: int
    paid_premiums: int
    pending_premiums: int
    overdue_premiums: int
    total_collected_amount: Decimal


class CustomerReport(BaseModel):
    total_customers: int


class DashboardReport(BaseModel):
    customers: CustomerReport
    policies: PolicyReport
    claims: ClaimReport
    premiums: PremiumReport
