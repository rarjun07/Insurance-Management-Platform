# Insurance Management Platform Backend

FastAPI backend for the internship Insurance Management Platform project.

## Current Status

Day 1 and Day 2 setup is complete:

- FastAPI app entry point
- Versioned API routing
- Placeholder modules for all project areas
- Environment-based configuration
- SQLAlchemy database session setup
- SQLAlchemy models for users, customers, policies, claims, premium payments, and documents
- JWT authentication endpoints
- Password hashing
- Alembic migration scaffolding
- Customer Management APIs
- Health Insurance Policy Management APIs
- Premium Tracking APIs
- Claim Management APIs
- Document Upload APIs
- Reports Dashboard APIs
- Standard pagination responses for list APIs

## Run Locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## PostgreSQL Setup

Create the local PostgreSQL database before running migrations:

```bash
createdb insurance_management
```

Default database URL:

```text
postgresql+psycopg://postgres:postgres@localhost:5432/insurance_management
```

If your PostgreSQL username, password, host, or port is different, update `DATABASE_URL` in `.env`.

Open:

- API health check: `http://127.0.0.1:8000/health`
- API docs: `http://127.0.0.1:8000/docs`

## API Modules

- Authentication: `/api/v1/auth`
- Customers: `/api/v1/customers`
- Policies: `/api/v1/policies`
- Premiums: `/api/v1/premiums`
- Claims: `/api/v1/claims`
- Documents: `/api/v1/documents`
- Reports: `/api/v1/reports`

## Pagination Format

Main list APIs return:

```json
{
  "items": [],
  "total": 0,
  "skip": 0,
  "limit": 20
}
```

## Customer Endpoints

- Create customer: `POST /api/v1/customers/`
- List/search customers: `GET /api/v1/customers/`
- View customer: `GET /api/v1/customers/{customer_id}`
- Update customer: `PUT /api/v1/customers/{customer_id}`
- Customer history: `GET /api/v1/customers/{customer_id}/history`

## Policy Endpoints

- Create policy: `POST /api/v1/policies/`
- List/filter policies: `GET /api/v1/policies/`
- List active policies: `GET /api/v1/policies/active`
- View policy: `GET /api/v1/policies/{policy_id}`
- Update policy: `PUT /api/v1/policies/{policy_id}`
- Renew policy: `PATCH /api/v1/policies/{policy_id}/renew`
- Cancel policy: `PATCH /api/v1/policies/{policy_id}/cancel`

## Premium Endpoints

- Record premium: `POST /api/v1/premiums/`
- List/filter premiums: `GET /api/v1/premiums/`
- List overdue premiums: `GET /api/v1/premiums/overdue`
- View premium: `GET /api/v1/premiums/{payment_id}`
- Update premium: `PUT /api/v1/premiums/{payment_id}`
- Mark premium paid: `PATCH /api/v1/premiums/{payment_id}/mark-paid`
- Policy payment history: `GET /api/v1/premiums/policy/{policy_id}/history`
- Policy payment summary: `GET /api/v1/premiums/policy/{policy_id}/summary`

## Claim Endpoints

- Submit claim: `POST /api/v1/claims/`
- List/filter claims: `GET /api/v1/claims/`
- List pending claims: `GET /api/v1/claims/pending`
- Policy claim history: `GET /api/v1/claims/policy/{policy_id}/history`
- View claim: `GET /api/v1/claims/{claim_id}`
- Update claim: `PUT /api/v1/claims/{claim_id}`
- Decide claim: `PATCH /api/v1/claims/{claim_id}/decision`
- Approve claim: `PATCH /api/v1/claims/{claim_id}/approve`
- Reject claim: `PATCH /api/v1/claims/{claim_id}/reject`

## Document Endpoints

- Upload document: `POST /api/v1/documents/upload`
- List/filter documents: `GET /api/v1/documents/`
- View document metadata: `GET /api/v1/documents/{document_id}`
- Download document: `GET /api/v1/documents/{document_id}/download`

## Report Endpoints

- Dashboard summary: `GET /api/v1/reports/summary`
- Customer report: `GET /api/v1/reports/customers`
- Policy report: `GET /api/v1/reports/policies`
- Claim report: `GET /api/v1/reports/claims`
- Premium report: `GET /api/v1/reports/premiums`

## Authentication Endpoints

- Register: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login`
- Current user: `GET /api/v1/auth/me`
