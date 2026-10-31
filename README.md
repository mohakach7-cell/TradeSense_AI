# TradeSense AI

TradeSense AI is a web application for exploring market data and participating in simulated trading challenges. It combines a React dashboard with a Flask API and Supabase-backed accounts and challenge data.

## What the project includes

- Market dashboards and data views, including a Casablanca Stock Exchange data endpoint.
- User registration, sign-in, and profile pages powered by Supabase.
- Trading challenges, payment flows, and a leaderboard.
- Admin pages for reviewing challenge activity.
- English/French interface support and light/dark themes.

This is a portfolio project. It does not provide investment advice or execute real trades.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Python, Flask, Flask-CORS |
| Data and authentication | Supabase |
| Market data | Finnhub API and Casablanca Stock Exchange integration |
| Payments | Stripe integration |

## Repository structure

```text
src/                    React application, pages, components, and API client
public/                 Static assets
backend/app.py          Flask application entry point
backend/routes/         Market data, Casablanca Bourse, and payment routes
supabase/migrations/    Database migrations
```

## Run locally

### Prerequisites

- Node.js and npm
- Python 3 and pip
- A Supabase project
- API credentials for the services you want to use (for example, Finnhub or Stripe)

### 1. Frontend

Clone the repository and install the dependencies:

```bash
git clone https://github.com/mohakach7-cell/TradeSense_AI.git
cd TradeSense_AI
npm install
```

Create a local `.env` file in the project root with your own values:

```dotenv
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_API_URL=http://localhost:54321
```

Start the frontend:

```bash
npm run dev
```

### 2. Backend

In another terminal, install and start the Flask API:

```bash
cd backend
python -m venv .venv
# Activate the virtual environment for your shell, then:
pip install -r requirements.txt
python app.py
```

Copy `backend/.env.example` to `backend/.env` and replace the placeholders with your own values. The backend uses `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FINNHUB_API_KEY`, `STRIPE_SECRET_KEY`, and `PORT` where the corresponding features are enabled. The local API defaults to port `54321`; `GET /` returns a health response.

Apply the relevant files in `supabase/migrations/` to your Supabase project before using database-backed features. Supabase policies and service credentials should be configured for your own environment.

## Available scripts

```bash
npm run dev       # Start the Vite development server
npm run build     # Build the frontend
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

## Security

Do not commit real credentials or local `.env` files. Keep server-side keys, especially Supabase service-role and Stripe secret keys, on the backend only. If a credential was previously committed to a public repository, rotate it with its provider; deleting the file does not remove it from Git history.

## Author

Mohamed EL KACHOUDI — [GitHub](https://github.com/mohakach7-cell)

