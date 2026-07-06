# Auxo Frontend

This is the Next.js 15 App Router frontend application for **Auxo** — the AI Merchant Operating System. It provides an intuitive, responsive dashboard interface designed for modern merchants to manage customer interactions, invoices, transactions, inventory, and leverage an autonomous AI agent for operations.

## Features & Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript.
- **Authentication**: Managed via Clerk, bridged to the NestJS backend to issue custom JWT payloads.
- **State Management**: React Hooks and Contexts.
- **Styling**: TailwindCSS v4 with PostCSS.
- **Analytics**: PostHog telemetry integration.
- **Error Tracking**: Sentry monitoring setup.
- **Iconography**: Lucide React.

---

## Folder & Route Structure

The frontend code uses standard Next.js App Router structure in `src/app/`:

- `/` (Home): Landing page demonstrating merchant capabilities.
- `/onboarding`: Onboarding form for fresh users to setup their Business profile.
- `/dashboard`: Core dashboard screen aggregating recent sales charts, top customer list, inventory valuations, and notification banners.
- `/dashboard/chat`: Interactive chat terminal connected to the backend GPT-4o agentic loop. Supports triggers such as transfers confirmation and voice-to-text inputs.
- `/dashboard/transactions`: List of credits, debits, and transfers synchronized in real-time from the Nomba API.
- `/dashboard/invoices`: Interface to create client invoices, generate payment checkout URLs, and trigger reminder checks.
- `/dashboard/customers`: View and manage customer profiles, and review their Lifetime Value (LTV) rankings.
- `/dashboard/products`: Inventory catalog displaying category tags, product pricing, and current stock count with automatic warning indicators for low stock items.

---

## Local Development

### Prerequisites
- Node.js (v22+)
- Running NestJS backend instance (port 3001)

### Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env.local` file by copying `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk client publishable API key
   - `CLERK_SECRET_KEY`: Clerk backend secret key
   - `NEXT_PUBLIC_API_URL`: NestJS backend API endpoint (Defaults to `http://localhost:3001`)
   - `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` (Optional)

3. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   The application will run on `http://localhost:3000`.

4. **Production Build**:
   To compile and package the project for self-hosting or deployment:
   ```bash
   # Set DOCKER_BUILD=true if building standard docker standalone images
   npm run build
   npm run start
   ```
