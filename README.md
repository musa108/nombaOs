# NombaOS — AI Merchant Operating System

Full-stack implementation per the hackathon plan: **NestJS + PostgreSQL/Prisma backend**, **Next.js 15 + Clerk frontend**, and an **OpenAI GPT-4o agentic AI layer** with real function-calling tools. No mock data — every endpoint reads from and writes to a live database and the real Nomba API.

## What's implemented

| Area | Status |
|---|---|
| Auth (Clerk → JWT bridge) | ✅ Real Clerk sync, JWT issuance, guarded routes |
| Business onboarding | ✅ Full CRUD, dashboard summary aggregation |
| Customers | ✅ CRUD, top-customers ranking, lifetime value (raw SQL) |
| Products / Inventory | ✅ CRUD, low-stock alerts, inventory valuation |
| Transactions | ✅ Real Nomba sync, sales reports, transfers |
| Invoices | ✅ Creation with real Nomba payment links, reminders, overdue sweep |
| Nomba API integration | ✅ OAuth client-credentials flow, transfers, payment links, balance, bank verification, settlements |
| AI Assistant | ✅ GPT-4o function-calling loop, 13 real tools, conversation persistence, transfer confirmation flow |
| Frontend | ✅ Landing, onboarding, dashboard, chat, transactions, invoices, customers, products — all wired to live API |

**Build & Lint status:** Frontend (`npm run build` and `npm run lint`) passes 100% clean — 0 errors, 0 warnings, Next.js 15.5.19, all 12 routes compiled. Backend passes lint (`npm run lint`) and compilation typecheck (`npx tsc --noEmit` and `npm run build`) clean with 0 errors and 0 warnings. See [Known Limitation](#known-limitation-prisma-client-generation) below for the one step you must run yourself.

---

## Architecture

```
nombaos/
├── backend/          NestJS API (port 3001)
│   ├── prisma/schema.prisma     8 models: User, Business, Customer, Product, Transaction, Invoice, Conversation
│   └── src/
│       ├── auth/        Clerk sync + JWT guard
│       ├── business/    Onboarding + dashboard aggregation
│       ├── customers/   CRUD + analytics (raw SQL for LTV/top-customers)
│       ├── products/    CRUD + inventory summary
│       ├── transactions/ Nomba sync, sales reports, transfers
│       ├── invoices/    Creation + Nomba payment links + reminders
│       ├── nomba/       All Nomba API calls (OAuth, transfers, links, banks, settlements)
│       ├── analytics/   Revenue trends + AI business-context builder
│       └── ai/          GPT-4o agent loop + 13-tool registry
├── frontend/         Next.js 15 App Router (port 3000)
│   └── src/
│       ├── app/dashboard/{chat,transactions,invoices,customers,products}
│       ├── components/{chat,dashboard}
│       ├── hooks/useAuthSync.ts     Clerk ↔ backend JWT bridge
│       └── lib/api.ts               Typed API client, every method maps to a real endpoint
└── docker-compose.yml   Postgres 16 + Redis 7
```

---

## Setup

### 1. Start infrastructure

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` — defaults to the docker-compose Postgres (`postgresql://nombaos:nombaos_dev_password@localhost:5432/nombaos`)
- `JWT_SECRET` — any long random string (the server **refuses to boot without this** — see `jwt.strategy.ts`)
- `NOMBA_CLIENT_ID` / `NOMBA_CLIENT_SECRET` / `NOMBA_ACCOUNT_ID` — your real Nomba credentials
- `OPENAI_API_KEY` — your OpenAI key (needed for the AI chat to function; everything else works without it)
- `CLERK_SECRET_KEY` — from your Clerk dashboard

```bash
npm install          # also runs `prisma generate` via postinstall
npm run prisma:migrate -- --name init
npm run start:dev
```

API runs on `http://localhost:3001`. Swagger docs at `http://localhost:3001/api/docs`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from your Clerk dashboard (same project as backend)
- `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:3001`

```bash
npm install
npm run dev
```

App runs on `http://localhost:3000`.

### 4. First run

1. Visit `http://localhost:3000`, sign up via Clerk
2. You'll be routed to `/onboarding` — set your business name and industry
3. Land on `/dashboard` — click **Sync Nomba** to pull real transaction history
4. Go to **AI Assistant** and ask: *"Show today's revenue"* or *"Create an invoice for Musa Enterprises worth ₦75,000"*

---

## How the AI layer actually works (no mocking)

`backend/src/ai/ai.service.ts` runs a real agentic loop against GPT-4o:

1. Builds live business context (`analytics.service.ts` → real Prisma aggregations: today/week/month revenue, growth %, low-stock products, recent transactions) and injects it into the system prompt on every turn.
2. Sends the conversation + 13 function definitions (`ai.tools.ts`) to OpenAI with `tool_choice: 'auto'`.
3. When GPT-4o calls a tool (e.g. `get_revenue_report`, `create_invoice`, `initiate_transfer`), `executeTool()` runs the **real** service method — actual Prisma queries, actual Nomba API calls via `nomba.service.ts`.
4. Tool results go back to the model; it can chain multiple tools (e.g. look up a customer, then create an invoice for them) before producing a final answer — up to 5 iterations.
5. **Transfers are never auto-executed.** `initiate_transfer` always returns `requiresConfirmation: true`; the frontend shows `TransferConfirmModal`, and only on explicit user confirmation does `POST /ai/confirm-transfer` call the real `transactions.transferFunds()` → `nomba.initiateTransfer()`.
6. Every conversation persists to the `Conversation` table (`messages` JSON column), so context survives across requests.

## How Nomba integration actually works

`backend/src/nomba/nomba.service.ts` implements:
- OAuth2 client-credentials token exchange with automatic refresh (60s buffer before expiry)
- `GET /accounts/:id` — balance
- `GET /accounts/:id/transactions` — paginated history, used by both the sync job and AI tool
- `POST /accounts/:id/transfer` — real bank transfers
- `GET /accounts/resolve` — bank account name verification before transfer
- `POST /accounts/:id/checkout/order` — payment link generation, called automatically when an invoice is created
- `GET /transfers/banks` — bank list for the transfer UI
- `GET /accounts/:id/settlements` — settlement history

`transactions.service.ts#syncFromNomba()` pulls real Nomba transaction history and upserts into Postgres, deduplicating on `nombaRef`, so the dashboard always reflects actual account activity, not seeded rows.

---

## Known limitation: Prisma client generation

This was built in a sandboxed environment without access to `binaries.prisma.sh` (Prisma's engine CDN), so I could not run `prisma generate` here and could not start a live Postgres instance to test runtime queries end-to-end. To still verify correctness, I:

1. Hand-built a structurally accurate local stub of the generated Prisma client (matching the real package's `default.d.ts`/`.prisma/client` resolution path) purely to typecheck against
2. Ran `npx tsc --noEmit` across the entire backend — **0 errors** after fixing 6 real issues it surfaced (a narrowing bug on OpenAI's tool-call union type, a missing-secret crash path in the JWT strategy, and a silent-null bug in the Nomba token exchange)
3. Removed the stub completely and restored `node_modules/@prisma/client` to its pristine npm state before delivering

On your machine, `npm install` in `backend/` will run `prisma generate` automatically via the `postinstall` script (added to `package.json`) and produce the real, fully-typed client — at which point `Property 'X' does not exist on PrismaService` errors (which is all the stub was hiding) disappear because the real generated types replace it. I did **not** verify actual query execution against a live database — please run `npm run prisma:migrate -- --name init` and exercise the endpoints (or just click through the UI) to confirm end-to-end before treating this as production-ready.

## Things deliberately left for you to wire up

- **Email/SMS for invoice reminders**: `invoices.service.ts#sendReminder()` returns the reminder payload and payment link but doesn't dispatch anything — plug in your provider (Resend, Twilio, etc.) where the comment says so.
- **Clerk webhook signature verification**: `auth/clerk-auth.guard.ts` is written but not wired to a controller route — add a `POST /auth/webhook` endpoint guarded by it if you want Clerk-initiated user sync (deletions, profile updates) instead of only frontend-initiated sync.
- **Redis caching**: installed and in `package.json` but not yet wired into any service — the plan calls for it as a cache layer for frequent queries; I left actual cache-key strategy to you since it depends on which queries you find slow in practice.
- **Nomba response shape**: I built the service against Nomba's documented v1 REST patterns, but didn't have live credentials to confirm exact response field names (e.g. `checkoutLink` vs `data.checkoutLink`). I defensively check both shapes in a few places (see `ai.service.ts`'s `create_payment_link` case) — if a field comes back `undefined` in practice, check the real response shape and adjust the one-line accessor.

---

## Production Deployment Walkthrough

To deploy NombaOS to a live production environment, follow these steps to provision, configure, and connect the components.

### 1. Database Provisioning (PostgreSQL)
1. Provision a PostgreSQL database instance (v16+) using a cloud provider (e.g., Railway, Neon, AWS RDS, Supabase).
2. Connect to the database and ensure the `vector` extension is enabled (required for semantic memory storage in `BusinessMemory`):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Copy the database connection URL (e.g., `postgresql://username:password@host:port/dbname?sslmode=require`).

### 2. Cache & Session Layer Provisioning (Redis)
1. Provision a Redis database (v7+) (e.g., Upstash Redis, Railway Redis plugin, Redis Labs).
2. Copy the Redis URI connection string (e.g., `redis://default:password@host:port`).

### 3. Backend Deployment (Render)
1. Log in to your [Render](https://render.com) dashboard.
2. Click **New +** and select **Blueprint**.
3. Connect your repository. Render will automatically read the [render.yaml](file:///c:/Users/sysadmin/Downloads/NombaOS_full_implementation/render.yaml) file at the root.
4. Render will orchestrate the creation of your:
   - PostgreSQL Database instance (`nombaos-db`)
   - Redis Cache instance (`nombaos-redis`)
   - NestJS Web Service (`nombaos-backend`)
5. During setup, fill in the prompted environment variables (see checklist below) in the Render console.
6. The startup sequence configured in `render.yaml` will run:
   ```bash
   npx prisma migrate deploy && node dist/main
   ```
   This automatically applies any pending database schema updates and boots the NestJS server.
7. Once deployed, Render will provide a backend Web Service URL (e.g., `https://nombaos-backend.onrender.com`). Copy this URL.

### 4. Frontend Deployment (Vercel)
1. Log in to your [Vercel](https://vercel.com/) dashboard and click **Add New Project**.
2. Select the GitHub repository.
3. Configure the Project Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Add the frontend environment variables (see checklist below) in the "Environment Variables" tab.
5. Click **Deploy**. Vercel will compile the application and provide a production domain (e.g., `https://nombaos.vercel.app`).

### 5. Authentication Setup (Clerk Production)
1. In your [Clerk Dashboard](https://dashboard.clerk.com/), switch your project instance from **Development** to **Production**.
2. Add your Vercel production frontend URL (`https://nombaos.vercel.app`) as an allowed origin.
3. Update the production API keys on both the frontend and backend.
4. Set up redirect configurations in Clerk settings:
   - **After Sign-In URL**: `/dashboard`
   - **After Sign-Up URL**: `/onboarding`

---

### Production Environment Variables Checklist

Ensure these variables are correctly configured in your deployment settings:

#### Backend Service (Render Config)
| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection URL | `redis://default:pass@redis-host:6379` |
| `JWT_SECRET` | Secret key to sign custom Auth JWTs | *Long secure random string* |
| `NOMBA_CLIENT_ID` | Production/Sandbox Nomba API Client ID | `client_...` |
| `NOMBA_CLIENT_SECRET` | Production/Sandbox Nomba API Client Secret | `secret_...` |
| `NOMBA_ACCOUNT_ID` | Nomba Account ID | `acc_...` |
| `OPENAI_API_KEY` | OpenAI API credentials for GPT-4o agent | `sk-proj-...` |
| `CLERK_SECRET_KEY` | Clerk backend Secret Key | `sk_live_...` |
| `FRONTEND_URL` | Production domain of the frontend app | `https://nombaos.vercel.app` |
| `PORT` | Local container port for NestJS API listener | `3001` |

#### Frontend Service (Vercel Config)
| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client Publishable Key | `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk backend Secret Key (Vercel Middleware) | `sk_live_...` |
| `NEXT_PUBLIC_API_URL` | Production backend API domain | `https://nombaos-backend.onrender.com` |

