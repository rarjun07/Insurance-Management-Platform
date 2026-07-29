# Day 13 - UI Improvements and Responsive Design

## Goal

Create a responsive, real-world frontend experience for the Insurance Management Platform.

## Frontend Stack

- React
- TypeScript
- Vite
- CSS responsive layout

## Frontend Folder

Created:

```text
frontend/
```

Main files:

- `frontend/src/App.tsx`
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/StatCard.tsx`
- `frontend/src/components/ComingSoonCard.tsx`
- `frontend/src/styles.css`

## UI Pages Added

The frontend now includes working navigation for:

- Public home page
- Login
- Register
- Dashboard
- Customers
- Policies
- Premiums
- Claims
- Documents
- Reports
- Settings
- Profile

## Working UI Features

The frontend includes:

- Login page connected to FastAPI JWT authentication
- Register page connected to FastAPI user creation
- Customer registration creates and links a customer profile automatically
- Public landing page before authentication
- Sticky home navbar
- Separate login page
- Separate register page
- Profile section
- Profile dropdown with My Account, Update Profile, Settings, and Logout actions
- Logout action moved inside profile menu
- Role-based navigation
- Customer role own-data view behavior from backend `/mine` endpoints
- Piston-style authentication pages with role selector cards
- Sidebar page navigation
- Reference-style left sidebar with workspace card
- Bottom sidebar account area
- Bottom sidebar logout button
- Dashboard summary cards
- Customer search
- Add customer API form
- Edit customer API form
- Create health policy API form
- Record premium API form
- Submit claim API form
- Upload document API form
- Authenticated document download action
- Health policy renew/cancel API actions
- Premium mark-paid API action
- Claim approve/reject API actions
- Document table from backend data
- Reports summary from backend data
- Policy expiry alerts
- Monthly business report section
- Settings summary

## Role-Based UI

The frontend now supports three demo roles:

- Admin
- Insurance Agent
- Customer

Role behavior:

- Admin can see all modules, including Reports and Settings.
- Insurance Agent can see operational modules, but not admin reports/settings.
- Customer can see their own policies, premiums, claims, documents, and profile.

## Health Insurance Scope

The UI shows:

- Health Insurance as available
- Vehicle Insurance as coming soon
- Life Insurance as coming soon
- Travel Insurance as coming soon
- Property Insurance as coming soon

## Responsive Design

The layout supports:

- Desktop sidebar layout
- Tablet two-column layout
- Mobile single-column layout

## Build Verification

Frontend production build was verified with:

```bash
npm run build
```

## API Integration

Created:

```text
frontend/src/services/api.ts
```

The frontend uses token storage and defaults to:

```text
http://127.0.0.1:8000
```

Backend seed accounts:

- `admin@healthinsure.com`
- `agent@healthinsure.com`
- `customer@healthinsure.com`

Default password:

```text
password123
```

## Day 14 Target

Day 14 should focus on Deployment, Documentation, and Final Presentation:

- Final README cleanup
- Deployment notes
- Environment variables
- Final project summary
- Mentor submission checklist
