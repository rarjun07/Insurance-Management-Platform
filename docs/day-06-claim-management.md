# Day 6 - Claim Management Module

## Goal

Build the first version of Claim Management for Health Insurance policies.

## APIs Added

### Submit Claim

`POST /api/v1/claims/`

Creates a claim for an existing policy.

Validation:

- Policy must exist
- Claim amount must be greater than zero
- Reason must be provided
- Claim status starts as `pending`

Access:

- Authenticated users

### List Claims

`GET /api/v1/claims/`

Lists claims with optional filters.

Query parameters:

- `status`
- `policy_id`
- `skip`
- `limit`

Access:

- Admin
- Insurance Agent

### List Pending Claims

`GET /api/v1/claims/pending`

Lists claims waiting for review.

Access:

- Admin
- Insurance Agent

### Policy Claim History

`GET /api/v1/claims/policy/{policy_id}/history`

Returns all claims for one policy.

Access:

- Authenticated users

### View Claim

`GET /api/v1/claims/{claim_id}`

Returns one claim by ID.

Access:

- Authenticated users

### Update Claim

`PUT /api/v1/claims/{claim_id}`

Updates claim amount, reason, or status.

Access:

- Admin
- Insurance Agent

### Claim Decision

`PATCH /api/v1/claims/{claim_id}/decision`

Approves or rejects a claim.

Access:

- Admin
- Insurance Agent

### Approve Claim

`PATCH /api/v1/claims/{claim_id}/approve`

Sets claim status to approved.

Access:

- Admin
- Insurance Agent

### Reject Claim

`PATCH /api/v1/claims/{claim_id}/reject`

Sets claim status to rejected.

Access:

- Admin
- Insurance Agent

## Claim Statuses

- `pending`
- `approved`
- `rejected`

## Day 7 Target

Day 7 should focus on Document Upload:

- Upload identity documents
- Upload policy documents
- Download documents
- View uploaded files
- Validate file types
