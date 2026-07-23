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

## Authentication Endpoints

- Register: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login`
- Current user: `GET /api/v1/auth/me`
