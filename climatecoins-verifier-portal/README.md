# ClimateCoins Verifier Portal

A standalone verifier-workspace prototype using the same ClimateCoins visual language as the FPO portal: forest green, sage green, off-white, clean cards, restrained Lucide icons, and responsive layouts.

## Included workflows
- Verifier demo login and JWT-protected API routes.
- Dashboard with review queue counts and recent activity.
- Search/filter project submissions by status and priority.
- Review detail with evidence checklist and project summary.
- Add findings with category, severity and rationale.
- Findings register with open/resolved states.
- Record an internal review decision with a required rationale.
- Export activity history to CSV.
- JSON-based seeded demo records.

> **Prototype disclaimer:** project records, evidence statuses, findings and decisions are synthetic demo data. This portal does not itself provide independent validation, certify a project, issue carbon credits, or connect to a carbon registry. “Approved for next stage” is only an internal workflow status.

## Stack
- React 18 + Vite
- Express API
- JWT demo authentication
- JSON file store
- Lucide React icons
- Shared ClimateCoins CSS theme adapted from the buyer portal's forest/sage/off-white design system

## Requirements
Use a current Node.js LTS release and npm. Node 20 or 22 LTS is recommended for predictable dependency support.

## Windows / VS Code setup
Open a terminal at the project root (the folder containing `package.json`):

```powershell
npm install
Copy-Item .env.example .env
npm run seed
npm run dev
```

If `.env` already exists, do not overwrite it. Review the values instead.

- Frontend: http://localhost:5176
- API health: http://localhost:4003/api/health

### Demo login
- Email: `verifier@climatecoins.local`
- Password: `Verify@12345`

These are demo-only credentials. Do not use them in a public production system.

## Environment variables
`.env.example`:

```env
PORT=4003
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5176
DATA_FILE=./server/data/store.json
```

Set a strong random `JWT_SECRET` in any hosted environment. Never commit `.env` or secrets.

## API endpoints
All routes except health and login require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | API health check |
| POST | `/api/auth/login` | Sign in to demo verifier workspace |
| GET | `/api/auth/me` | Current token identity |
| GET | `/api/dashboard` | Summary counts, priority projects, recent activity |
| GET | `/api/projects?q=&status=&priority=` | Search/filter submissions |
| GET | `/api/projects/:id` | Project detail and findings |
| POST | `/api/projects/:id/findings` | Add a review finding |
| PATCH | `/api/findings/:id/resolve` | Resolve/reopen a finding (API support) |
| GET | `/api/findings` | Findings register |
| POST | `/api/projects/:id/decision` | Save internal review decision and rationale |
| GET | `/api/activities` | Activity history |

Example finding payload:

```json
{
  "category": "Monitoring",
  "severity": "Major",
  "note": "Please provide the sampling frequency and explain the stratification approach."
}
```

Example decision payload:

```json
{
  "decision": "Changes requested",
  "note": "The evidence package does not yet establish the monitoring approach. Please address the listed finding before the next review."
}
```

## Review workflow
1. Sign in with the demo verifier account.
2. Open **Project reviews** and search/filter the submissions.
3. Open a project and review the project summary and evidence checklist.
4. Open **Findings** to record evidence gaps or observations. Add a category, severity, and clear request/rationale.
5. Open **Record decision** and choose `In review`, `Changes requested`, `Approved for next stage`, or `Rejected`. Provide a rationale.
6. Revisit the Findings Register and Activity History to see the records.

## Status definitions
- `Submitted`: submitted for assessment and awaiting review.
- `In review`: verifier is assessing evidence.
- `Changes requested`: further evidence or corrections are needed.
- `Approved for next stage`: internal review gate passed; **not** registry issuance or a public certification claim.
- `Rejected`: internal review rejected the submission within this demo workflow.

Finding severities are `Minor`, `Major`, and `Critical`. A critical open finding blocks the `Approved for next stage` decision in the demo API.

## Repository layout

```text
climatecoins-verifier-portal/
├── package.json
├── .env.example
├── README.md
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
└── server/
    ├── data/                 # generated store.json (ignored by Git)
    └── src/
        ├── index.js           # Express API, auth and review routes
        └── seed.js            # synthetic demo records
```

## Reset demo data

```powershell
npm run seed
```

**Warning:** seeding resets the JSON store to its original synthetic data and discards changes made during the demo.

## Build frontend

```powershell
npm run build
```

The production frontend output is `client/dist`.

## Current limitations and production work
- Demo user password is stored as plain text in the JSON seed store; replace with a strong password hash or managed identity before production.
- The fallback JWT secret is for local development only.
- JSON storage is not transaction-safe and should be replaced by PostgreSQL or another durable database.
- No real evidence file upload/storage is implemented; evidence entries are metadata placeholders.
- No registry connection, digital signature, external verifier accreditation, payment, credit issuance, or retirement is implemented.
- Add a real authorisation model, audit log protections, request rate limits, schema validation, database migrations, tests, backups, and secure document access before handling live data.
- The portal should share one backend/database with the FPO, Admin and Data Centre portals in the integrated product. This standalone demo has its own seeded data and does not sync with the other portal folders.

## Team integration guidance
Before integrating portals, agree on a shared project ID, organisation/FPO IDs, evidence metadata model, allowed status transitions, role permissions, API error format, and audit-event schema. Keep `verification status`, `registry issuance status`, `inventory status`, `order status`, `payment status`, and `retirement status` separate. Use synthetic data until privacy and consent requirements are satisfied.
