# Day 3 - Customer Management Module

## Goal

Build the first version of the Customer Management module using FastAPI, PostgreSQL, SQLAlchemy, and Pydantic.

## APIs Added

### Create Customer

`POST /api/v1/customers/`

Creates a new customer.

Access:

- Admin
- Insurance Agent

### List Customers

`GET /api/v1/customers/`

Lists customers with pagination.

Query parameters:

- `search`
- `skip`
- `limit`

Search checks:

- Customer name
- Customer email
- Customer phone

Access:

- Admin
- Insurance Agent

### View Customer

`GET /api/v1/customers/{customer_id}`

Returns one customer by ID.

Access:

- Admin
- Insurance Agent

### Update Customer

`PUT /api/v1/customers/{customer_id}`

Updates customer profile data.

Access:

- Admin
- Insurance Agent

### Customer History

`GET /api/v1/customers/{customer_id}/history`

Returns customer profile with:

- Total policies
- Total uploaded documents

Access:

- Admin
- Insurance Agent

## Validation Added

- Name length validation
- Phone length validation
- Address length validation
- Email format validation
- Duplicate customer email prevention

## Authorization

Customer Management APIs are protected. Only users with these roles can access them:

- `admin`
- `agent`

## Manual Testing Order

1. Start PostgreSQL.
2. Create the `insurance_management` database.
3. Run `alembic upgrade head`.
4. Register an admin or agent user.
5. Login and copy the bearer token.
6. Use the token in `/docs`.
7. Test customer create, list, detail, update, and history APIs.

## Day 4 Target

Day 4 should focus on the Policy Management module:

- Create Health Insurance policies
- List active policies
- View policy details
- Renew policies
- Cancel policies
