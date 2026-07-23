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

## Authentication Endpoints

- Register: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login`
- Current user: `GET /api/v1/auth/me`
