# Day 7 - Document Upload Module

## Goal

Build the first version of Document Management for uploading, viewing, and downloading customer, policy, and claim-related files.

## Database Update

Added metadata to `documents`:

- `policy_id`
- `document_type`

Migration:

```text
20260724_0003_add_document_metadata.py
```

## Supported Document Types

- `identity`
- `policy`
- `claim`

## Supported File Types

- `.pdf`
- `.png`
- `.jpg`
- `.jpeg`

## APIs Added

### Upload Document

`POST /api/v1/documents/upload`

Uploads a document file and stores its metadata.

Form fields:

- `customer_id`
- `document_type`
- `file`
- `policy_id` optional

Validation:

- Customer must exist
- Policy must exist if provided
- Policy must belong to the customer if provided
- File extension must be allowed
- Document type must be allowed

Access:

- Authenticated users

### List Documents

`GET /api/v1/documents/`

Lists uploaded documents with optional filters.

Query parameters:

- `customer_id`
- `policy_id`
- `document_type`
- `skip`
- `limit`

Access:

- Admin
- Insurance Agent

### View Document Metadata

`GET /api/v1/documents/{document_id}`

Returns uploaded document metadata.

Access:

- Authenticated users

### Download Document

`GET /api/v1/documents/{document_id}/download`

Downloads the stored document file.

Access:

- Authenticated users

## Storage

Uploaded files are stored under:

```text
backend/uploads/
```

The original filename is preserved in the database, and the stored filename includes a unique ID to avoid collisions.

## Day 8 Target

Day 8 should focus on Reports Dashboard:

- Active policies report
- Expired policies report
- Claim statistics
- Premium collection summary
- Customer growth summary
