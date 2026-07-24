# Day 12 - Testing and Bug Fixes

## Goal

Add backend smoke tests and verify the main FastAPI foundation works correctly.

## Test Setup

Added `pytest` to backend dependencies.

Tests use an isolated in-memory SQLite database only during test execution. The actual project database remains PostgreSQL.

## Tests Added

### Health Check

File:

```text
backend/tests/test_health.py
```

Verifies:

- `GET /health` returns `200`
- Response body is `{"status": "ok"}`

### Authentication Flow

File:

```text
backend/tests/test_auth.py
```

Verifies:

- User registration works
- User login returns a JWT token
- `/api/v1/auth/me` returns the current user
- Validation errors use the standard error format

### Route Loading

File:

```text
backend/tests/test_routes.py
```

Verifies:

- OpenAPI generates successfully
- Core module routes are registered

## Test Command

Run from the backend folder:

```bash
pytest -q
```

## Result

Current result:

```text
4 passed
```

## Day 13 Target

Day 13 should focus on UI Improvements and Responsive Design. Since the frontend is not implemented yet, the backend-focused equivalent will be:

- Improve API documentation
- Add sample request payloads
- Clean README setup steps
- Prepare frontend integration notes
