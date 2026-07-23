# Day 4 - Policy Management Module

## Goal

Build the first version of Policy Management for Health Insurance policies.

## Scope

Version one only supports:

- Health Insurance

Other insurance types remain future scope and should be shown as coming soon in the frontend:

- Vehicle Insurance
- Life Insurance
- Travel Insurance
- Property Insurance

## APIs Added

### Create Policy

`POST /api/v1/policies/`

Creates a Health Insurance policy for an existing customer.

Validation:

- Customer must exist
- Policy number must be unique
- Premium amount must be greater than zero
- End date must be after start date
- Policy type must be `Health Insurance`

Access:

- Admin
- Insurance Agent

### List Policies

`GET /api/v1/policies/`

Lists policies with optional filters.

Query parameters:

- `status`
- `customer_id`
- `skip`
- `limit`

Access:

- Admin
- Insurance Agent

### List Active Policies

`GET /api/v1/policies/active`

Lists only active policies.

Access:

- Admin
- Insurance Agent

### View Policy

`GET /api/v1/policies/{policy_id}`

Returns one policy by ID.

Access:

- Admin
- Insurance Agent

### Update Policy

`PUT /api/v1/policies/{policy_id}`

Updates premium amount, dates, or status.

Access:

- Admin
- Insurance Agent

### Renew Policy

`PATCH /api/v1/policies/{policy_id}/renew`

Updates policy dates, optionally updates premium amount, and sets status to active.

Access:

- Admin
- Insurance Agent

### Cancel Policy

`PATCH /api/v1/policies/{policy_id}/cancel`

Sets policy status to cancelled.

Access:

- Admin
- Insurance Agent

## Day 5 Target

Day 5 should focus on Premium Tracking:

- Record premium payments
- View payment status
- Track due dates
- Show payment history
- Support overdue premium alerts
