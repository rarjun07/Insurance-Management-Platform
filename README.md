# Insurance Management Platform

Internship project for building an insurance operations platform with a FastAPI backend.

## Project Scope

The platform will support:

- Customer management
- Policy management
- Premium payment tracking
- Claim management
- Document uploads
- Reports and dashboards
- Role-based access for Admin, Insurance Agent, and Customer users

Version one will fully implement Health Insurance. Other insurance types will be shown as coming soon.

## Backend Decision

The provided project PDF suggested Flask, but the mentor approved FastAPI. This project uses FastAPI for the backend API.

## Database

This project uses PostgreSQL with SQLAlchemy and Alembic migrations.

## Current Progress

- Day 1: Requirements reviewed and backend structure created
- Day 2: Database models and authentication module added
- Day 3: Customer Management module added
- Day 4: Health Insurance Policy Management module added
- Day 5: Premium Tracking module added
- Day 6: Claim Management module added
- Day 7: Document Upload module added
- Day 8: Reports Dashboard APIs added
- Day 9: Search, filters, and pagination standardized
- Day 10: Role-Based Authorization strengthened
- Day 11: Validation and error handling standardized
- Day 12: Backend smoke tests added
- Day 13: Responsive frontend starter added
- Day 14: Employee management, backend policy applications, document verification, settings management, profile update, and project handoff docs completed
- Post-audit improvements: customer-only public signup, persisted application documents,
  complete claim assignment/verification/settlement workflow, automatic expiry and overdue
  refresh, PDF report export, and Render/Vercel deployment configuration

## Folders

- `backend/` - FastAPI backend
- `frontend/` - React frontend
- `docs/` - project notes and daily planning

## Delivery Notes

- Backend now supports `admin`, `agent`, and `customer` roles
- Customer policy purchase now creates backend reviewable applications
- Admin and agent can review applications and verify uploaded documents
- Admin can manage employees and editable system settings
- Customers can update their own profile
- Application and claim documents are stored and linked to their workflow records
- Claims support agent assignment, document verification, approval, and settlement
- Admins can download a generated PDF business report
- Frontend list screens include responsive pagination with filter-aware page resets

## Handoff Docs

- `docs/day-14-deployment-handoff.md`
- `backend/README.md`
