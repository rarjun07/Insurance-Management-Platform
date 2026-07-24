# Day 8 - Reports Dashboard Module

## Goal

Build backend APIs for the Reports Dashboard so the frontend can show business summaries and charts.

## Access

Reports are admin-only because they summarize platform-wide business data.

Allowed role:

- `admin`

## APIs Added

### Dashboard Summary

`GET /api/v1/reports/summary`

Returns all dashboard report data:

- Customer summary
- Policy summary
- Claim summary
- Premium collection summary

### Customer Report

`GET /api/v1/reports/customers`

Returns:

- Total customers

### Policy Report

`GET /api/v1/reports/policies`

Returns:

- Total policies
- Active policies
- Expired policies
- Cancelled policies

### Claim Report

`GET /api/v1/reports/claims`

Returns:

- Total claims
- Pending claims
- Approved claims
- Rejected claims

### Premium Report

`GET /api/v1/reports/premiums`

Returns:

- Total premium records
- Paid premiums
- Pending premiums
- Overdue premiums
- Total collected amount

## Frontend Dashboard Usage

These APIs can support:

- Summary cards
- Pie chart for claim status
- Bar chart for policy status
- Premium collection metric
- Customer count metric

## Day 9 Target

Day 9 should focus on Search, Filters, and Pagination:

- Improve existing list APIs
- Standardize pagination response format
- Add more search filters
- Add reusable pagination schema
