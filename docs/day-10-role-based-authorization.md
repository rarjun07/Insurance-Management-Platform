# Day 10 - Role-Based Authorization

## Goal

Strengthen API permissions for Admin, Insurance Agent, and Customer users.

## Database Update

Added optional `customer_id` to `users`.

This allows a customer-role login account to be linked to one customer record.

Migration:

```text
20260724_0004_add_user_customer_link.py
```

## Roles

### Admin

Can access and manage all modules.

### Insurance Agent

Can manage operational modules:

- Customers
- Policies
- Premiums
- Claims
- Documents

Cannot access admin-only reports.

### Customer

Can access only their own customer-related data.

## Permissions Matrix

| Module | Admin | Agent | Customer |
| --- | --- | --- | --- |
| Register user | Yes | Yes | Yes |
| List customers | Yes | Yes | No |
| View own customer profile | Yes | Yes | Own only |
| Create customer | Yes | Yes | No |
| Update customer | Yes | Yes | No |
| List policies | Yes | Yes | No |
| View policy | Yes | Yes | Own only |
| Create policy | Yes | Yes | No |
| Renew/cancel policy | Yes | Yes | No |
| List premiums | Yes | Yes | No |
| View premium | Yes | Yes | Own only |
| Premium history/summary | Yes | Yes | Own only |
| Submit claim | Yes | Yes | Own only |
| List claims | Yes | Yes | No |
| View claim | Yes | Yes | Own only |
| Approve/reject claim | Yes | Yes | No |
| Upload document | Yes | Yes | Own only |
| List documents | Yes | Yes | No |
| View/download document | Yes | Yes | Own only |
| Reports | Yes | No | No |

## Authorization Helpers Added

- `require_roles`
- `is_admin_or_agent`
- `ensure_customer_access`

## Customer Ownership Rule

Customer users must have `customer_id` linked in their user account.

If a customer tries to access data for another customer, the API returns:

```text
403 Forbidden
```

## Day 11 Target

Day 11 should focus on Validation and Error Handling:

- Improve consistent error messages
- Add centralized exception handling
- Add reusable validation helpers
- Review all API response codes
