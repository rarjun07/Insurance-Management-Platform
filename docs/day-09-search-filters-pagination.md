# Day 9 - Search, Filters, and Pagination

## Goal

Standardize search, filters, and pagination across list APIs.

## Standard Pagination Response

List APIs now return this structure:

```json
{
  "items": [],
  "total": 0,
  "skip": 0,
  "limit": 20
}
```

## Pagination Parameters

Supported on main list APIs:

- `skip`
- `limit`

Rules:

- `skip` must be `0` or greater
- `limit` must be between `1` and `100`

## Updated APIs

### Customers

`GET /api/v1/customers/`

Filters:

- `search`
- `skip`
- `limit`

Search checks:

- Name
- Email
- Phone

### Policies

`GET /api/v1/policies/`

Filters:

- `status`
- `customer_id`
- `search`
- `skip`
- `limit`

Search checks:

- Policy number
- Policy type

### Active Policies

`GET /api/v1/policies/active`

Filters:

- `skip`
- `limit`

### Premiums

`GET /api/v1/premiums/`

Filters:

- `policy_id`
- `status`
- `due_before`
- `due_after`
- `skip`
- `limit`

### Overdue Premiums

`GET /api/v1/premiums/overdue`

Filters:

- `skip`
- `limit`

### Claims

`GET /api/v1/claims/`

Filters:

- `status`
- `policy_id`
- `submitted_before`
- `submitted_after`
- `skip`
- `limit`

### Pending Claims

`GET /api/v1/claims/pending`

Filters:

- `skip`
- `limit`

### Documents

`GET /api/v1/documents/`

Filters:

- `customer_id`
- `policy_id`
- `document_type`
- `skip`
- `limit`

## Frontend Benefit

The frontend can now build consistent tables using:

- `items` for rows
- `total` for total record count
- `skip` and `limit` for pagination controls

## Day 10 Target

Day 10 should focus on Role-Based Authorization:

- Tighten customer vs admin/agent access rules
- Add role-specific route dependencies
- Ensure customers can only access their own data where required
- Document permissions by module
