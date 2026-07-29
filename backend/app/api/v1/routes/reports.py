from decimal import Decimal
from datetime import date
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.db.session import get_db
from app.models.claim import Claim, ClaimStatus
from app.models.customer import Customer
from app.models.policy import Policy, PolicyStatus
from app.models.premium_payment import PaymentStatus, PremiumPayment
from app.models.system_setting import SystemSetting
from app.models.user import User, UserRole
from app.api.v1.routes.policies import refresh_expired_policies
from app.api.v1.routes.premiums import refresh_overdue_premiums
from app.schemas.report import (
    ClaimReport,
    CustomerReport,
    DashboardReport,
    PolicyReport,
    PremiumReport,
    PublicPlatformSummary,
    MonthlyReportItem,
)


router = APIRouter()


AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


def build_customer_report(db: Session) -> CustomerReport:
    return CustomerReport(total_customers=db.query(Customer).count())


def build_policy_report(db: Session) -> PolicyReport:
    return PolicyReport(
        total_policies=db.query(Policy).count(),
        active_policies=db.query(Policy).filter(Policy.status == PolicyStatus.ACTIVE).count(),
        expired_policies=db.query(Policy).filter(Policy.status == PolicyStatus.EXPIRED).count(),
        cancelled_policies=db.query(Policy).filter(Policy.status == PolicyStatus.CANCELLED).count(),
    )


def build_claim_report(db: Session) -> ClaimReport:
    return ClaimReport(
        total_claims=db.query(Claim).count(),
        pending_claims=db.query(Claim).filter(Claim.status == ClaimStatus.PENDING).count(),
        approved_claims=db.query(Claim).filter(Claim.status == ClaimStatus.APPROVED).count(),
        rejected_claims=db.query(Claim).filter(Claim.status == ClaimStatus.REJECTED).count(),
    )


def build_premium_report(db: Session) -> PremiumReport:
    total_collected = (
        db.query(func.coalesce(func.sum(PremiumPayment.amount), 0))
        .filter(PremiumPayment.payment_status == PaymentStatus.PAID)
        .scalar()
    )

    return PremiumReport(
        total_premium_records=db.query(PremiumPayment).count(),
        paid_premiums=db.query(PremiumPayment).filter(PremiumPayment.payment_status == PaymentStatus.PAID).count(),
        pending_premiums=db.query(PremiumPayment).filter(PremiumPayment.payment_status == PaymentStatus.PENDING).count(),
        overdue_premiums=db.query(PremiumPayment).filter(PremiumPayment.payment_status == PaymentStatus.OVERDUE).count(),
        total_collected_amount=Decimal(total_collected),
    )


def month_key(value: date) -> str:
    return value.strftime("%Y-%m")


def last_months(count: int = 6) -> list[str]:
    today = date.today()
    months: list[str] = []
    year = today.year
    month = today.month
    for _ in range(count):
        months.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))

@router.get("/public-summary", response_model=PublicPlatformSummary)
def public_summary(db: Annotated[Session, Depends(get_db)]) -> PublicPlatformSummary:
    refresh_expired_policies(db)
    refresh_overdue_premiums(db)
    support = db.query(SystemSetting).filter(SystemSetting.key == "support_email").first()
    return PublicPlatformSummary(
        active_policies=db.query(Policy).filter(Policy.status == PolicyStatus.ACTIVE).count(),
        pending_claims=db.query(Claim).filter(Claim.status == ClaimStatus.PENDING).count(),
        total_collected_amount=build_premium_report(db).total_collected_amount,
        support_email=support.value if support else "support@healthinsure.com",
    )


@router.get("/summary", response_model=DashboardReport)
def reports_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> DashboardReport:
    refresh_expired_policies(db)
    refresh_overdue_premiums(db)
    return DashboardReport(
        customers=build_customer_report(db),
        policies=build_policy_report(db),
        claims=build_claim_report(db),
        premiums=build_premium_report(db),
    )


@router.get("/customers", response_model=CustomerReport)
def customer_growth_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> CustomerReport:
    return build_customer_report(db)


@router.get("/policies", response_model=PolicyReport)
def policies_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> PolicyReport:
    return build_policy_report(db)


@router.get("/claims", response_model=ClaimReport)
def claims_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> ClaimReport:
    return build_claim_report(db)


@router.get("/premiums", response_model=PremiumReport)
def premium_collection_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> PremiumReport:
    return build_premium_report(db)


@router.get("/monthly", response_model=list[MonthlyReportItem])
def monthly_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> list[MonthlyReportItem]:
    months = last_months()
    rows = {
        month: MonthlyReportItem(
            month=month,
            new_customers=0,
            new_policies=0,
            claims_submitted=0,
            premium_collected=Decimal("0.00"),
        )
        for month in months
    }

    for customer in db.query(Customer).all():
        key = month_key(customer.created_at)
        if key in rows:
            rows[key].new_customers += 1

    for policy in db.query(Policy).all():
        key = month_key(policy.start_date)
        if key in rows:
            rows[key].new_policies += 1

    for claim in db.query(Claim).all():
        key = month_key(claim.submission_date)
        if key in rows:
            rows[key].claims_submitted += 1

    paid_premiums = db.query(PremiumPayment).filter(PremiumPayment.payment_status == PaymentStatus.PAID).all()
    for payment in paid_premiums:
        key = month_key(payment.payment_date or payment.due_date)
        if key in rows:
            rows[key].premium_collected += payment.amount

    return list(rows.values())


@router.get("/export/pdf")
def export_business_report_pdf(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> StreamingResponse:
    refresh_expired_policies(db)
    refresh_overdue_premiums(db)
    summary = DashboardReport(
        customers=build_customer_report(db),
        policies=build_policy_report(db),
        claims=build_claim_report(db),
        premiums=build_premium_report(db),
    )

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    pdf.setTitle("Insurance Management Business Report")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(54, height - 60, "Insurance Management Business Report")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(54, height - 80, f"Generated on {date.today().isoformat()}")

    rows = [
        ("Total customers", summary.customers.total_customers),
        ("Total policies", summary.policies.total_policies),
        ("Active policies", summary.policies.active_policies),
        ("Expired policies", summary.policies.expired_policies),
        ("Total claims", summary.claims.total_claims),
        ("Pending claims", summary.claims.pending_claims),
        ("Approved claims", summary.claims.approved_claims),
        ("Premium records", summary.premiums.total_premium_records),
        ("Paid premiums", summary.premiums.paid_premiums),
        ("Overdue premiums", summary.premiums.overdue_premiums),
        ("Total premium collected", f"INR {summary.premiums.total_collected_amount:,.2f}"),
    ]
    y = height - 120
    for label, value in rows:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(64, y, label)
        pdf.setFont("Helvetica", 10)
        pdf.drawRightString(width - 64, y, str(value))
        pdf.line(64, y - 6, width - 64, y - 6)
        y -= 28

    pdf.setFont("Helvetica-Oblique", 9)
    pdf.drawString(54, 40, "Generated by the Insurance Management Platform")
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=insurance-business-report.pdf"},
    )
