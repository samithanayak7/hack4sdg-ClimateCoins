# ClimateCoins Data Centre Portal

A standalone full-stack data-centre buyer workspace using the same forest-green, sage and off-white visual theme as the ClimateCoins FPO portal.

## Features
- Buyer login
- Overview dashboard and featured projects
- Searchable carbon-credit marketplace with project details and sample evidence summaries
- Save/remove projects from a watchlist
- Simulated purchase requests with quantity and indicative price calculations
- Purchase history and CSV export
- Information requests to project owners (saved locally in prototype data)
- Activity history
- Responsive desktop and mobile UI

## Stack
React 18, Vite, Express, JWT, JSON file store and Lucide icons.

## Run locally (Windows PowerShell)
```powershell
npm install
Copy-Item .env.example .env
npm run seed
npm run dev
```
If `.env` already exists, do not overwrite it.

- Frontend: http://localhost:5175
- API health: http://localhost:4002/api/health

Demo credentials:
- Email: `buyer@datacentre.local`
- Password: `Buyer@12345`

## Important
This is a prototype. Orders do not process payments; project descriptions, evidence labels, prices and availability are sample data, not proof of real carbon credits. The JSON store is not suitable for production persistence. For a real deployment use PostgreSQL or another persistent database, secure account management, verified project registry integration, an auditable credit retirement process and a payment/settlement provider.

This standalone portal has its own demo store and does not yet share live records with the existing FPO/Admin portals. To make all portals operate on one source of truth, integrate the routes into a shared backend and database.
