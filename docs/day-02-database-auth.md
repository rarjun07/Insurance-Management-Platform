# Day 2 - Database Design and Authentication

## Goal

Create the first backend database design and authentication module using FastAPI, SQLAlchemy, Pydantic, password hashing, and JWT tokens.

## Database Tables Added

### Users

- `id`
- `name`
- `email`
- `hashed_password`
- `role`

Roles:

- `admin`
- `agent`
- `customer`

### Customers

- `id`
- `name`
- `dob`
- `phone`
- `address`
- `email`

### Policies

- `id`
- `customer_id`
- `policy_type`
- `policy_number`
- `premium_amount`
- `start_date`
- `end_date`
- `status`

Statuses:

- `active`
- `expired`
- `cancelled`

### Claims

- `id`
- `policy_id`
- `claim_amount`
- `reason`
- `status`
- `submission_date`

Statuses:

- `pending`
- `approved`
- `rejected`

### Premium Payments

- `id`
- `policy_id`
- `payment_date`
- `amount`
- `payment_status`

Statuses:

- `paid`
- `pending`
- `overdue`

### Documents

- `id`
- `customer_id`
- `file_name`
- `file_path`
- `uploaded_at`

## Authentication APIs

### Register

`POST /api/v1/auth/register`

Creates a user with a hashed password.

### Login

`POST /api/v1/auth/login`

Accepts email and password using OAuth2 form fields:

- `username`
- `password`

Returns:

- `access_token`
- `token_type`

### Current User

`GET /api/v1/auth/me`

Returns the currently authenticated user from the JWT token.

## Security Added

- Passwords are stored as hashes, not plain text.
- JWT access tokens include user email and role.
- Protected route dependency validates bearer tokens.
- Role authorization helper is available for future modules.
- Alembic migration setup is available for database version control.

## Verification

The following checks passed:

- Health route returns `200`
- User registration returns `201`
- Duplicate email returns `409`
- Login returns JWT token
- `/api/v1/auth/me` returns authenticated user details

## Day 3 Target

Day 3 should focus on the Customer Management module:

- Customer create API
- Customer list API
- Customer detail API
- Customer update API
- Customer search API
