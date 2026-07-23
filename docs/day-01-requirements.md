# Day 1 - Requirements and Setup

## Project Goal

Build a web-based Insurance Management Platform that helps admins, insurance agents, and customers manage insurance operations from one place.

## Approved Backend Framework

The original PDF suggests Flask, but the mentor approved FastAPI. The backend will use FastAPI because it provides automatic API documentation, strong request validation with Pydantic, and clean modular routing.

## Core Modules

1. Authentication and role-based authorization
2. Customer management
3. Policy management
4. Premium payment tracking
5. Claim management
6. Document upload and download
7. Reports dashboard

## User Roles

### Administrator

- Manage employees
- Manage customers
- Create insurance policies
- Assign claims
- Generate reports
- Manage system settings

### Insurance Agent

- Register customers
- Create policies
- Verify customer documents
- Review claims
- Approve or reject claims
- Update policy information

### Customer

- Register and log in
- View policies
- Download policy documents
- Pay premiums
- Upload claim documents
- Submit claims
- Track claim status

## Initial Database Tables

- `users`
- `customers`
- `policies`
- `claims`
- `premium_payments`
- `documents`

## FastAPI Backend Structure

```text
backend/
  app/
    api/v1/routes/
    core/
    db/
    models/
    schemas/
    services/
    utils/
  uploads/
  reports/
  requirements.txt
  .env.example
```

## Day 2 Target

Day 2 should focus on database models and authentication:

- Create SQLAlchemy models
- Configure Alembic migrations
- Add password hashing
- Add JWT login/register endpoints
- Add role enum for Admin, Agent, and Customer
