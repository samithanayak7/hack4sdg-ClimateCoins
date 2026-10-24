# ClimateCoins Admin Portal

A full-stack admin console prototype for the ClimateCoins farm-to-carbon-credit platform. It uses the same forest-green, sage, off-white visual language as the FPO portal.

## Features
- Admin login and role-checked API access
- Overview metrics and activity feed
- FPO management: search, filter and update organisation status
- Farmer registry: search and update eligibility
- Verification queue: approve, reject, request documents, or mark in review
- Buyer and data-centre onboarding management
- Carbon-credit inventory and status controls
- Transactions and audit trail
- CSV export for each list
- Responsive desktop/mobile layout

## Stack
- React 18 + Vite
- Express API + JWT
- JSON file data store for an easy-running prototype (no native database compilation)
- Lucide icons

## Run locally on Windows PowerShell

```powershell
npm install
Copy-Item .env.example .env
npm run seed
npm run dev
```

If `.env` already exists, do not overwrite it. The frontend runs at http://localhost:5174 and the API at http://localhost:4001.

Demo credentials:
- Email: `admin@climatecoins.local`
- Password: `Admin@12345`

API health check: http://localhost:4001/api/health

## Important deployment notes
This is a prototype data store. It writes to `server/data/store.json`. A JSON file on an ephemeral serverless filesystem is not a production database and may reset or not persist across instances. For a deployed environment, use a persistent disk or replace the JSON store with PostgreSQL. Keep `JWT_SECRET` private and set `CLIENT_ORIGIN` to the exact deployed frontend origin.

The admin portal is a standalone prototype and uses its own sample data store; it does not automatically share records with the existing FPO portal. To operate on the same live records, merge the admin API routes into the existing Express backend and use a shared database/schema.
