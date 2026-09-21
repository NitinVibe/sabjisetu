# SabziSetu

A vegetable trading & supply management dashboard: React + Tailwind + Recharts
on the frontend, Express + PostgreSQL on the backend.

## 1. Set up the database

Create a database (any name works, `sabzisetu` used below):

```bash
createdb sabzisetu
```

Then load the schema and starter data into it:

```bash
psql "postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/sabzisetu" -f server/schema.sql
```

(If you already have your own Postgres server — local install, Docker,
Neon, Supabase, RDS, etc. — just point the connection string above at
that instead.)

## 2. Configure the backend

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set `DATABASE_URL` to your real connection string:

```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/sabzisetu
PORT=4000
```

## 3. Install dependencies

From the project root (needs [Node.js](https://nodejs.org) 18+):

```bash
npm install
```

This installs both the frontend (React, Tailwind, Recharts) and backend
(Express, pg, cors, dotenv) dependencies — they share one `package.json`.

## 4. Run it

Run both the API server and the frontend together:

```bash
npm run dev:all
```

This starts:
- the API on **http://localhost:4000** (health check at `/api/health`)
- the frontend on **http://localhost:5173**

Open http://localhost:5173 — the app now loads and saves everything
through your Postgres database.

If you'd rather run them in two separate terminals:

```bash
npm run server   # backend only, port 4000
npm run dev      # frontend only, port 5173
```

## Project structure

```
sabzisetu/
├── server/                 → Express API
│   ├── index.js            → app entry, mounts all routes
│   ├── db.js                → Postgres connection pool
│   ├── schema.sql           → run this once to create tables + seed data
│   ├── .env.example         → copy to .env with your DATABASE_URL
│   └── routes/              → one file per resource (customers, sales, etc.)
├── src/                    → React frontend
│   ├── App.jsx              → the whole UI (all pages)
│   ├── api.js                → fetch client the UI uses to talk to the API
│   └── main.jsx / index.css
└── package.json            → scripts + dependencies for both sides
```

## Deploying

- **Frontend**: `npm run build` outputs static files to `dist/` — deploy
  to Vercel, Netlify, or any static host. Set `VITE_API_URL` (in a `.env`
  file at the project root) to your deployed API's URL before building,
  e.g. `VITE_API_URL=https://api.yoursite.com/api`.
- **Backend**: deploy `server/` to any Node host (Render, Railway, Fly.io,
  a VPS, etc.) and point `DATABASE_URL` at your production Postgres
  instance. Make sure the frontend's `VITE_API_URL` matches wherever
  this ends up living.

## Notes

- There's no authentication yet — anyone who can reach the API can read
  and write all the data. Add auth before putting this on the open internet.
- All monetary/quantity fields are stored as `NUMERIC` in Postgres and
  converted to JS numbers at the API boundary (see `server/routes/helpers.js`).


## Payment UI (Final)
- Sales / Supply: Paid -> Cash, UPI, Bank.
- UPI: Take Photo or Upload Screenshot.
- Bank: Transaction ID is required.
- Sales table: Method column; click UPI/Bank method to view proof or transaction ID.
- Payments & Due: same UPI camera/upload and Bank transaction ID options.

## Multi-item purchases and sales
The Mandi Purchase, Local Purchase, and Sales / Supply forms support multiple line items in one entry. The common date/vendor/customer and payment details are entered once, while each item has its own specification, quantity, unit, rate, and calculated line amount. Saving is atomic: if any line is invalid or a sale line lacks sufficient stock, the whole transaction is rolled back.
