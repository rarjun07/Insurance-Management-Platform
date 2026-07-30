# Day 14 - Deployment, Documentation, and Handoff

## Completed Scope

- Admin, agent, and customer roles are supported
- Employee management is available to admins
- Customer policy purchase creates backend policy applications
- Admin and agent can approve or reject policy applications
- Admin and agent can verify uploaded documents
- Admin can update system settings
- Users can update their own profile details
- Application PDFs are persisted and must be verified before approval
- Claims support agent assignment, supporting documents, verification, and settlement
- Policy and premium statuses refresh automatically when records expire
- Admin business reports can be downloaded as PDF

## Backend Run Steps

1. `cd backend`
2. `source .venv/bin/activate`
3. `alembic upgrade head`
4. `python -m app.seed`
5. `uvicorn app.main:app --reload`

## Frontend Run Steps

1. `cd frontend`
2. `npm install`
3. `npm run dev`

Frontend default URL:

- `http://127.0.0.1:5173`

Backend default URL:

- `http://127.0.0.1:8000`

## Environment Variables

Backend `.env` values:

- `DATABASE_URL`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `API_V1_PREFIX`
- `ACTIVE_POLICY_TYPE`
- `UPLOAD_DIR`

Frontend optional `.env` value:

- `VITE_API_BASE_URL`

Production configuration:

- Root `render.yaml` provisions the free demo backend on Render
- `DATABASE_URL` connects the backend to an external PostgreSQL service such as Neon
- `frontend/vercel.json` configures the Vite frontend and SPA rewrites
- Set backend `CORS_ORIGINS` to the deployed Vercel URL
- Set frontend `VITE_API_BASE_URL` to the deployed Render URL

Free demo limitations:

- Uploaded documents and profile images use temporary service storage and can be removed
  after a restart or redeploy.
- Upgrade the Render web service and attach a persistent disk for long-term file storage.
- The external free PostgreSQL database is intended only for a mentor demonstration.

## Seed Accounts

- Admin: `admin@healthinsure.com` / `password123`
- Agent: `agent@healthinsure.com` / `password123`
- Customer: `customer@healthinsure.com` / `password123`

## Mentor Demo Checklist

- Login as admin and show reports, settings, employee management
- Login as agent and show customer, policy, premium, claim, and document workflows
- Login as customer and submit a policy application
- Review the same application from admin or agent account
- Upload a document as customer and verify it from admin or agent account
- Update customer profile details and confirm the changes persist

## Submission Checklist

- Backend migrations applied
- Seed data loaded
- Backend tests passing
- Frontend production build passing
- README files updated
- Screenshots or demo recording prepared
