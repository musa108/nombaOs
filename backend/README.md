# NombaOS Backend

This is the progressive NestJS backend API that powers **NombaOS** — the AI Merchant Operating System. It coordinates data flows between the PostgreSQL database (via Prisma), Clerk authentication, Sentry error tracking, PostHog analytics, the **Nomba API**, and an autonomous agentic AI layer using **OpenAI GPT-4o**.

## Project Architecture

The backend codebase is modular, built with the following component directories in `src/`:

- `auth/`: Handles JWT sync from Clerk. Validates incoming requests using a guard that decodes and validates Clerk-issued session tokens.
- `business/`: Manages merchant profiles, industry categorization, and aggregates dashboard metrics (today/week/month revenue, margins, and growth trend).
- `customers/`: CRUD endpoints for customers with advanced analytical queries (LTV calculation and top-customers ranking using raw PostgreSQL SQL).
- `products/`: CRUD endpoints for inventory, stock levels, and valuations.
- `transactions/`: Synchronizes transaction history from Nomba API and persists details locally in PostgreSQL.
- `invoices/`: Creates invoices, generates Nomba checkout orders (payment links), and runs daily sweeps to check and mark overdue invoices.
- `nomba/`: Integrates with Nomba SDK/endpoints (OAuth2 client-credentials flow, balance queries, bank list retrieval, bank account resolution, bank transfers, and settlement history).
- `analytics/`: Computes operational metrics, sales trends, and constructs structured context for the AI prompt.
- `ai/`: Built around an autonomous function-calling loop with **OpenAI GPT-4o**. Integrates 13 system tools for interactive merchant operations.

## Database Schema (Prisma)

The application uses PostgreSQL with the following entities (defined in [schema.prisma](file:///c:/Users/sysadmin/Downloads/NombaOS_full_implementation/backend/prisma/schema.prisma)):

1. **User**: Clerk authentication attributes, email, and conversation threads.
2. **Business**: Merchant name, industry, and optional Nomba Account ID mapping.
3. **Customer**: General contact details, associated with transactions and invoices.
4. **Product**: Pricing (using high-precision `Decimal` scale), category, and inventory levels.
5. **Transaction**: Credits, debits, references, and status (synchronized from the Nomba API).
6. **Invoice**: Invoice number, line items, status (PENDING, PAID, OVERDUE, CANCELLED), and Nomba payment checkout link.
7. **Conversation**: Persistence layer storing agentic loops and chat history in JSON arrays.
8. **BusinessMemory**: Vector database mapping (powered by `pgvector` raw queries) storing custom facts and preferences.
9. **Notification**: Automated triggers for low stock, overdue invoices, and sales anomalies.

---

## AI Agent Tools

The backend registers 13 function-calling tools with the OpenAI GPT-4o model:
* `get_revenue_report`: Detailed sales and revenue summaries.
* `get_top_customers`: Lists highest spending client metrics.
* `get_low_stock_products`: Identifies products near/at zero count.
* `create_invoice`: Automates invoice assembly and Nomba payment link generation.
* `send_invoice_reminder`: Triggers payment reminder workflows.
* `initiate_transfer`: Creates draft fund transfers (requires strict security confirmation).
* `execute_confirmed_transfer`: Dispatches real bank transfers.
* `get_nomba_balance`: Fetches active Nomba balance.
* `verify_bank_account`: Validates account numbers and bank codes.
* `list_banks`: Retrieves list of valid financial institutions.
* `get_settlements`: Obtains settlement logs.
* `get_notifications`: Retrieves unread merchant alerts.
* `analyze_business_health`: Triggers advanced LLM analysis of revenue patterns.

---

## Running Locally

### Prerequisites
- Node.js (v22+)
- Docker (for PostgreSQL & Redis)

### Step 1: Start Databases
```bash
docker-compose up -d
```

### Step 2: Environment Variables
Create `.env` using `.env.example` as a template and provide:
- `DATABASE_URL` (Defaults to local PostgreSQL docker container)
- `JWT_SECRET` (For verifying and signing sessions)
- `NOMBA_CLIENT_ID` / `NOMBA_CLIENT_SECRET` / `NOMBA_ACCOUNT_ID` (Credentials for the Nomba sandbox or production API)
- `OPENAI_API_KEY` (Required for the AI agent)
- `CLERK_SECRET_KEY`

### Step 3: Run Database Migrations
```bash
npm run prisma:migrate -- --name init
```

### Step 4: Run Application
```bash
# Development (watch mode)
npm run start:dev

# Linting
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start:prod
```

API documentation is accessible at `http://localhost:3001/api/docs` using Swagger.
