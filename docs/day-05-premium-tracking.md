# Day 5 - Premium Tracking Module

## Goal

Build the first version of Premium Tracking for Health Insurance policies.

## Database Update

Added `due_date` to `premium_payments` for due date tracking and overdue premium alerts.

Migration:

```text
20260724_0002_add_premium_due_date.py
```

## APIs Added

### Record Premium Payment

`POST /api/v1/premiums/`

Creates a premium payment record for an existing policy.

Validation:

- Policy must exist
- Amount must be greater than zero
- Due date is required

Payment status is automatically calculated if not provided:

- `paid` if payment date exists
- `overdue` if due date is before today and no payment date exists
- `pending` if due date is today or future and no payment date exists

Access:

- Admin
- Insurance Agent

### List Premium Payments

`GET /api/v1/premiums/`

Lists premium payments with optional filters.

Query parameters:

- `policy_id`
- `status`
- `skip`
- `limit`

Access:

- Admin
- Insurance Agent

### List Overdue Premiums

`GET /api/v1/premiums/overdue`

Lists overdue premium payment records.

Access:

- Admin
- Insurance Agent

### View Premium Payment

`GET /api/v1/premiums/{payment_id}`

Returns one premium payment record by ID.

Access:

- Admin
- Insurance Agent

### Update Premium Payment

`PUT /api/v1/premiums/{payment_id}`

Updates amount, due date, payment date, or payment status.

Access:

- Admin
- Insurance Agent

### Mark Premium as Paid

`PATCH /api/v1/premiums/{payment_id}/mark-paid`

Sets payment date to today and status to paid.

Access:

- Admin
- Insurance Agent

### Policy Payment History

`GET /api/v1/premiums/policy/{policy_id}/history`

Returns all premium payments for a policy.

Access:

- Admin
- Insurance Agent

### Policy Payment Summary

`GET /api/v1/premiums/policy/{policy_id}/summary`

Returns:

- Total payments
- Paid payments
- Pending payments
- Overdue payments
- Total paid amount

Access:

- Admin
- Insurance Agent

## Day 6 Target

Day 6 should focus on Claim Management:

- Submit insurance claims
- Upload supporting documents reference
- Claim verification
- Approve or reject claims
- Claim history
