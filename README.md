# HealthInsure — Insurance Management Platform

<p align="center">
  A full-stack health insurance operations platform for customers, insurance agents, and administrators.
</p>

<p align="center">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.116-009688?logo=fastapi&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0f172a">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-SQLAlchemy-4169E1?logo=postgresql&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Tests" src="https://img.shields.io/badge/backend_tests-18_passing-22c55e">
</p>

## Project Overview

HealthInsure is an internship full-stack project for managing the complete lifecycle of health insurance operations.

The platform connects customer registration, insurance plan applications, document verification, policy generation, premium tracking, claims, settlements, reports, and administrative controls in one role-based workspace.

The original project guide suggested Flask. FastAPI was selected with mentor approval for typed request validation, automatic API documentation, and a clean modular backend architecture.

## Project Objective

The objective is to build a database-backed insurance management platform where:

- Customers can register, explore plans, apply for health insurance, upload documents, pay premiums, submit claims, and track progress.
- Insurance Agents can manage customers and operational workflows, verify documents, and process assigned claims.
- Administrators can manage the complete platform, including employees, plans, applications, policies, premiums, claims, reports, and settings.

Version one fully implements **Health Insurance**. Vehicle, Life, Travel, and Property Insurance are displayed as coming-soon products.

## User Roles

| Role | Main permissions |
|---|---|
| Customer | Register, manage own profile, view plans, submit applications, access own policies, pay premiums, upload documents, and raise claims |
| Insurance Agent | View customers, manage policies and premiums, review applications, verify documents, and process assigned claims |
| Administrator | Full operational access plus employee management, plan management, reports, settlements, and system settings |

Public registration is restricted to customers. Agent and administrator accounts are created securely through Employee Management by an administrator.

## Core Features

### Authentication and Profiles

- Customer-only public registration
- Profile-image upload with preview
- JPG, PNG, and WebP validation with a 5 MB limit
- JWT authentication and protected API routes
- Eight-hour authenticated sessions
- Role-based navigation and permissions
- Profile, contact information, and password updates

### Customer Management

- Create, search, view, and update customers
- View each customer's applications, policies, premiums, claims, and documents
- Secure customer-to-login account linking by email
- Customer-specific data access controls

### Insurance Plans and Applications

- Database-managed Silver, Gold, and Premium health plans
- Admin plan creation and editing
- Customer plan comparison and application workflow
- Personal, nominee, medical, payment, and document information
- Admin or agent approval and rejection
- Automatic policy generation after successful verification

### Policy Management

- Create and view health policies
- Search and filter policy records
- Renew or cancel policies
- Track active, expired, and cancelled policies
- Detect policies approaching expiry
- Link generated policies to customers and insurance plans

### Premium Tracking

- Record premium obligations
- View customer payment history
- Pay or mark premiums as paid
- Track pending, paid, and overdue payments
- Automatically refresh overdue status
- Display collection totals on dashboards and reports

### Claims Workflow

- Customer claim submission
- Claim assignment to an insurance agent
- Supporting-document verification
- Approve or reject claim decisions
- Record settlement amount and reference
- Track pending, approved, rejected, verified, and settled states

### Document Management

- Upload identity, application, policy, and claim documents
- Secure generated storage filenames
- Link documents to customers, applications, policies, and claims
- Admin and agent verification or rejection
- Protected document download endpoint
- Approval safeguards when required documents are not verified

### Reports and Administration

- Live dashboard summaries from PostgreSQL
- Customer, policy, premium, and claim reports
- Six-month premium and claim trends
- PDF business report export
- Employee account management
- System settings for registration and support information
- Search, filters, responsive pagination, and mobile layouts

## Main Workflows

### Customer Policy Application

```text
Choose Plan
    ↓
Enter Applicant and Nominee Details
    ↓
Upload Required Documents
    ↓
Submit Application
    ↓
Admin or Agent Verification
    ↓
Approve Application
    ↓
Generate and Activate Policy
```

### Claim Processing

```text
Customer Submits Claim
    ↓
Admin Assigns Agent
    ↓
Agent Verifies Documents
    ↓
Approve or Reject Claim
    ↓
Admin Records Settlement
```

## Technology Stack

### Backend

- Python
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Alembic migrations
- Pydantic validation
- JWT authentication
- ReportLab PDF generation
- Pytest

### Frontend

- React 19
- TypeScript
- Vite
- CSS3
- Lucide React icons
- Fetch API

### Deployment

- Render Blueprint for FastAPI, PostgreSQL, and persistent uploads
- Vercel configuration for the React/Vite frontend

## Application Architecture

```text
React + TypeScript Frontend
            │
            │ REST API / JWT
            ▼
      FastAPI Backend
            │
     ┌──────┴────────┐
     ▼               ▼
 PostgreSQL     Persistent Uploads
```

## Project Structure

```text
Insurance-Management-Platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/       # Authentication and business APIs
│   │   ├── core/                # Configuration, security, error handling
│   │   ├── db/                  # SQLAlchemy engine and sessions
│   │   ├── models/              # Database models
│   │   ├── schemas/             # Request and response schemas
│   │   ├── main.py              # FastAPI application
│   │   └── seed.py              # Demo database records
│   ├── migrations/              # Alembic database migrations
│   ├── tests/                   # Backend workflow and access tests
│   ├── uploads/                 # Local uploaded files
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Shared UI components
│   │   ├── layouts/             # Role-based application shell
│   │   ├── pages/               # Public and authenticated pages
│   │   ├── services/            # Backend API client
│   │   ├── App.tsx              # Application routes and workflows
│   │   ├── styles.css           # Responsive design system
│   │   └── types.ts             # TypeScript domain types
│   ├── vercel.json
│   └── package.json
├── docs/                        # Daily project notes and handoff guide
├── render.yaml                  # Render backend/database configuration
└── README.md
```

## Database Tables

- `users`
- `customers`
- `insurance_plans`
- `policy_applications`
- `policies`
- `premium_payments`
- `claims`
- `documents`
- `system_settings`

## API Modules

All business endpoints use the `/api/v1` prefix.

| Module | Base endpoint | Purpose |
|---|---|---|
| Authentication | `/api/v1/auth` | Registration, login, current user, profile updates |
| Employees | `/api/v1/users` | Admin-managed staff accounts |
| Customers | `/api/v1/customers` | Customer records and insurance history |
| Plans | `/api/v1/plans` | Public plan catalog and admin plan management |
| Applications | `/api/v1/applications` | Customer applications and staff review |
| Policies | `/api/v1/policies` | Policy creation, listing, renewal, and cancellation |
| Premiums | `/api/v1/premiums` | Payment tracking and history |
| Claims | `/api/v1/claims` | Claim assignment, verification, decisions, settlements |
| Documents | `/api/v1/documents` | Upload, verification, metadata, and downloads |
| Reports | `/api/v1/reports` | Dashboard data, business reports, and PDF export |
| Settings | `/api/v1/settings` | Admin-managed platform settings |

Interactive API documentation is available at `http://127.0.0.1:8000/docs` while the backend is running.

## Environment Variables

### Backend

Create `backend/.env` from the included example:

```bash
cd backend
cp .env.example .env
```

Important values:

```env
DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/insurance_management"
SECRET_KEY="replace-with-a-secure-random-secret"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=480
ACTIVE_POLICY_TYPE="Health Insurance"
UPLOAD_DIR="uploads"
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

### Frontend

Create `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Running Locally

### Prerequisites

- Python 3.11 or newer
- PostgreSQL
- Node.js 20 or newer
- npm

### 1. Create the PostgreSQL Database

```bash
createdb insurance_management
```

### 2. Start the Backend

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

Backend URLs:

- API: `http://127.0.0.1:8000`
- Swagger documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 3. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL:

- `http://localhost:5173`

## Demo Accounts

Run `python -m app.seed` before using these accounts.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@healthinsure.com` | `password123` |
| Insurance Agent | `agent@healthinsure.com` | `password123` |
| Customer | `customer@healthinsure.com` | `password123` |

> These credentials are for local demonstration only. Replace them before sharing a public deployment.

## Testing

### Backend

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Current result: **18 tests passing**.

The test suite covers authentication, role access, customer ownership, employee management, plan applications, document verification, policies, premiums, claims, settlements, reports, and profile-image registration.

### Frontend

```bash
cd frontend
npm run build
```

The build command performs TypeScript checking before generating the production bundle.

## Deployment

### Backend and Database — Render

The root [`render.yaml`](render.yaml) provisions:

- FastAPI web service
- PostgreSQL database
- Persistent upload disk
- Database migrations and seed command

Set `CORS_ORIGINS` to the deployed frontend URL.

### Frontend — Vercel

Use `frontend` as the Vercel project root. The included [`frontend/vercel.json`](frontend/vercel.json) configures the Vite build and single-page application rewrites.

Set:

```env
VITE_API_BASE_URL=https://your-render-backend-url
```

See [`docs/day-14-deployment-handoff.md`](docs/day-14-deployment-handoff.md) for the complete handoff and deployment checklist.

## Current Progress

### Day 1 — Requirements and Project Setup

- Reviewed mentor requirements
- Created FastAPI backend structure
- Added initial API and wireframes

### Day 2 — Database and Authentication

- Added PostgreSQL and SQLAlchemy
- Created initial database models
- Implemented JWT registration and login
- Added Alembic migrations

### Day 3 — Customer Management

- Added customer create, list, search, details, and update APIs
- Added customer ownership controls

### Day 4 — Health Policy Management

- Added health policy models and APIs
- Added policy status, renewal, cancellation, and expiry tracking

### Day 5 — Premium Tracking

- Added premium records and payment history
- Added paid, pending, and overdue status handling

### Day 6 — Claim Management

- Added claim submission and review APIs
- Added approval and rejection workflow

### Day 7 — Document Upload

- Added file uploads and metadata
- Added protected document access

### Day 8 — Reports and Dashboards

- Added database-backed dashboard summaries
- Added customer, policy, premium, and claim reports

### Day 9 — Search, Filters, and Pagination

- Standardized searchable list APIs
- Added pagination responses and frontend controls

### Day 10 — Role-Based Authorization

- Strengthened Admin, Agent, and Customer permissions
- Added customer record ownership enforcement

### Day 11 — Validation and Error Handling

- Standardized validation
- Added consistent API error responses
- Improved frontend feedback

### Day 12 — Testing and Bug Fixes

- Added backend smoke and role-access tests
- Verified core insurance workflows

### Day 13 — Responsive Frontend

- Added responsive application shell and navigation
- Added public home, login, registration, and profile pages
- Added role-based dashboards and responsive records

### Day 14 — Complete Workflows and Deployment Handoff

- Added Employee, Plan, Application, and System Settings management
- Connected customer plan purchases to database applications
- Completed document verification and policy generation
- Completed claim assignment, verification, decisions, and settlement
- Added profile images, business report export, and persistent uploads
- Added Render and Vercel deployment configuration
- Completed backend tests and deployment documentation

## Project Status

The Health Insurance version is feature-complete for the internship scope:

- Backend tests: **18 passing**
- Frontend production build: **passing**
- Database migrations: **up to date**
- Render and Vercel configuration: **included**

## Documentation

- [`backend/README.md`](backend/README.md) — detailed backend endpoints and local setup
- [`docs/project-scope.md`](docs/project-scope.md) — insurance scope decision
- [`docs/day-14-deployment-handoff.md`](docs/day-14-deployment-handoff.md) — deployment and mentor demo checklist

## Author

**Arjun Singh**

Internship Project — Insurance Management Platform
