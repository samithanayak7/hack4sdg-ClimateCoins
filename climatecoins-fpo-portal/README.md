# ClimateCoins FPO Portal

A runnable full-stack prototype for farmer onboarding and preliminary eligibility tracking. It uses React + Vite for the frontend, Express for the API, and SQLite for persistence. The visual direction is inspired by the earthy greens, editorial typography, and landscape storytelling of the Pachama Originals microsite reference. This is an original interface, not a pixel-for-pixel copy.

## Features
- FPO demo login with JWT authentication
- Dashboard summary and recent farmer activity
- Farmer directory with search and eligibility filters
- Farmer registration with farm, land, crop, practice, and consent fields
- Farmer profile details and preliminary eligibility status updates
- Supporting document upload (PDF/JPG/PNG, 8 MB limit), download, and status tracking
- SQLite schema created automatically on first API start
- Demo seed data
- API input validation and farmer/FPO record scoping

## Requirements
- Node.js 20 or later (Node 22/24 recommended)
- npm

## Run on Windows PowerShell or CMD
From the extracted `climatecoins-fpo-portal` directory:

```powershell
npm install
Copy-Item .env.example .env
npm run db:seed
npm run dev
```

For CMD, use `copy .env.example .env` instead of `Copy-Item`.

Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/api/health`.

### Demo login
- Email: `fpo@climatecoins.local`
- Password: `ChangeMe12345!`

The database is stored at `server/data/climatecoins.sqlite` by default and is generated automatically. To seed sample records again after deleting the database, stop the server and run `npm run db:seed`.

## Environment
See `.env.example`:
- `PORT`: API port (default 4000)
- `JWT_SECRET`: replace with a long random secret before any shared deployment
- `DATABASE_PATH`: SQLite file location
- `CLIENT_ORIGIN`: Vite origin allowed by CORS

## API routes
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/farmers?q=&status=`
- `POST /api/farmers`
- `GET /api/farmers/:id`
- `PUT /api/farmers/:id`
- `PATCH /api/farmers/:id/eligibility`
- `POST /api/farmers/:id/documents` (multipart form fields: `file`, `document_type`)
- `GET /api/documents/:id/download`
- `PATCH /api/documents/:id/status`
- `GET /api/activities`

## Important production notes
This is a hackathon/learning prototype, not a certified carbon registry or production-grade personal-data system. Initial eligibility status is not project approval or credit issuance. Before real deployment, add formal role/permission administration, CSRF and rate limiting where applicable, security headers, malware scanning for uploaded files, encrypted backups, retention and deletion workflows, consent versioning, stronger audit controls, tested migration/backup procedures, and independent security review. Verify the selected carbon methodology and local legal requirements before deciding what farmer documents are necessary. Do not collect Aadhaar, bank details, or other sensitive information unless strictly required and appropriately protected.
