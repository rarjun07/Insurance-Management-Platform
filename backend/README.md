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
- Employee Management APIs
- Health Insurance Policy Management APIs
- Policy Application Review APIs
- Premium Tracking APIs
- Claim Management APIs
- Document Upload APIs
- Document Verification APIs
- Application document persistence and approval safeguards
- Claim assignment, document verification, approval, and settlement APIs
- Reports Dashboard APIs
- Downloadable PDF business reports
- Profile Update API
- System Settings APIs
- Standard pagination responses for list APIs
- Role-based authorization with customer ownership checks
- Centralized validation and error responses

## Error Format

API errors use:

```json
{
  "error": {
    "status_code": 400,
    "message": "Error message",
    "details": null
  }
}
```

## Run Locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

## Run Tests

```bash
cd backend
source .venv/bin/activate
pytest -q
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

Seeded login accounts:

- Admin: `admin@healthinsure.com` / `password123`
- Agent: `agent@healthinsure.com` / `password123`
- Customer: `customer@healthinsure.com` / `password123`

## API Modules

- Authentication: `/api/v1/auth`
- Users / Employees: `/api/v1/users`
- Customers: `/api/v1/customers`
- Policies: `/api/v1/policies`
- Applications: `/api/v1/applications`
- Premiums: `/api/v1/premiums`
- Claims: `/api/v1/claims`
- Documents: `/api/v1/documents`
- Reports: `/api/v1/reports`
- Settings: `/api/v1/settings`

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

The frontend follows the API pagination metadata until all available records are loaded, then
presents responsive paginated views for employees, customers, applications, policies,
premiums, claims, and documents.

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
- List expiring policies: `GET /api/v1/policies/expiring`
- Customer own policies: `GET /api/v1/policies/mine`
- View policy: `GET /api/v1/policies/{policy_id}`
- Update policy: `PUT /api/v1/policies/{policy_id}`
- Renew policy: `PATCH /api/v1/policies/{policy_id}/renew`
- Cancel policy: `PATCH /api/v1/policies/{policy_id}/cancel`

## Premium Endpoints

- Record premium: `POST /api/v1/premiums/`
- List/filter premiums: `GET /api/v1/premiums/`
- List overdue premiums: `GET /api/v1/premiums/overdue`
- Customer own premiums: `GET /api/v1/premiums/mine`
- View premium: `GET /api/v1/premiums/{payment_id}`
- Update premium: `PUT /api/v1/premiums/{payment_id}`
- Mark premium paid: `PATCH /api/v1/premiums/{payment_id}/mark-paid`
- Policy payment history: `GET /api/v1/premiums/policy/{policy_id}/history`
- Policy payment summary: `GET /api/v1/premiums/policy/{policy_id}/summary`

## Claim Endpoints

- Submit claim: `POST /api/v1/claims/`
- List/filter claims: `GET /api/v1/claims/`
- List pending claims: `GET /api/v1/claims/pending`
- Customer own claims: `GET /api/v1/claims/mine`
- Policy claim history: `GET /api/v1/claims/policy/{policy_id}/history`
- View claim: `GET /api/v1/claims/{claim_id}`
- Update claim: `PUT /api/v1/claims/{claim_id}`
- Decide claim: `PATCH /api/v1/claims/{claim_id}/decision`
- Assign claim to agent: `PATCH /api/v1/claims/{claim_id}/assign`
- Verify claim documents: `PATCH /api/v1/claims/{claim_id}/verify`
- Record claim settlement: `PATCH /api/v1/claims/{claim_id}/settle`
- Approve claim: `PATCH /api/v1/claims/{claim_id}/approve`
- Reject claim: `PATCH /api/v1/claims/{claim_id}/reject`

## Document Endpoints

- Upload document: `POST /api/v1/documents/upload`
- List/filter documents: `GET /api/v1/documents/`
- Customer own documents: `GET /api/v1/documents/mine`
- View document metadata: `GET /api/v1/documents/{document_id}`
- Download document: `GET /api/v1/documents/{document_id}/download`

Documents can be linked to a policy application with `application_id` or to a claim with
`claim_id`. Applications cannot be approved, and claims cannot be verified, until their
stored documents have been verified.

## Report Endpoints

- Dashboard summary: `GET /api/v1/reports/summary`
- Customer report: `GET /api/v1/reports/customers`
- Policy report: `GET /api/v1/reports/policies`
- Claim report: `GET /api/v1/reports/claims`
- Premium report: `GET /api/v1/reports/premiums`
- Monthly report: `GET /api/v1/reports/monthly`
- Download PDF business report: `GET /api/v1/reports/export/pdf`

## Authentication Endpoints

- Register: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login`
- Current user: `GET /api/v1/auth/me`
- Update current user profile: `PATCH /api/v1/auth/me`

## Employee Endpoints

- List employees: `GET /api/v1/users/`
- Create employee: `POST /api/v1/users/`
- Update employee: `PUT /api/v1/users/{user_id}`

## Application Endpoints

- Submit policy application: `POST /api/v1/applications/`
- List policy applications: `GET /api/v1/applications/`
- Customer own applications: `GET /api/v1/applications/mine`
- Review policy application: `PATCH /api/v1/applications/{application_id}/review`

## Settings Endpoints

- List settings: `GET /api/v1/settings/`
- Update setting: `PUT /api/v1/settings/{key}`

## Deployment

- Render Blueprint: `../render.yaml`
- Vercel configuration: `../frontend/vercel.json`
- Set `CORS_ORIGINS` on Render to the deployed frontend URL.
- Set `VITE_API_BASE_URL` on Vercel to the deployed backend URL.
