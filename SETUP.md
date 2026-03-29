# Sparkly CleanTrack — Setup Guide

## Prerequisites

- **Node.js** 20 LTS
- **npm** 10+
- A **Supabase** account (free tier works for development)
- A **Stripe** account (test mode) for payment features

---

## 1. Supabase Setup

### Create a Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project** → choose your organization → name it (e.g., `sparkly`).
3. Set a **database password** — save it somewhere safe.
4. Choose a region close to you (e.g., `ca-central-1` for Canada).
5. Wait for the project to provision.

### Get Connection Strings

Go to **Project Settings → Database → Connection string**.

You need **two** URLs:

| Variable | Where to find | Format |
|---|---|---|
| `DATABASE_URL` | **Connection string → URI** (Transaction / Session mode — uses **port 6543**) | `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | **Connection string → URI** (Direct connection — uses **port 5432**) | `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres` |

> **Why two URLs?** Prisma uses the pooled connection (`DATABASE_URL`) for queries and the direct connection (`DIRECT_URL`) for migrations. This is configured in `prisma/schema.prisma`.

### Supabase Dashboard — Disable Email Confirmation (Optional)

Since we handle auth ourselves with JWT (not Supabase Auth), you don't need to configure Supabase Auth. The database is all we use.

---

## 2. Stripe Setup

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com).
2. Toggle to **Test mode**.
3. Go to **Developers → API Keys** and copy:
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`
4. For webhooks:
   - Go to **Developers → Webhooks → Add endpoint**.
   - URL: `https://your-domain.com/api/v1/invoices/webhook` (use `stripe listen --forward-to localhost:4000/api/v1/invoices/webhook` for local dev).
   - Select event: `checkout.session.completed`.
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

---

## 3. Environment Variables

Copy the example and fill in your values:

```bash
cd sparkly/backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
NODE_ENV=development

# Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# JWT
JWT_SECRET=your-strong-random-secret-min-32-chars
JWT_REFRESH_SECRET=another-strong-random-secret-min-32-chars

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Frontend
FRONTEND_URL=http://localhost:5173
```

> Generate JWT secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## 4. Install Dependencies

From the project root:

```bash
cd sparkly
npm install
```

This installs both backend and frontend dependencies (monorepo).

If you prefer installing separately:

```bash
cd sparkly/backend && npm install
cd ../frontend && npm install
```

---

## 5. Database Migration & Seed

```bash
# Generate Prisma client + run migrations
cd sparkly/backend
npx prisma migrate dev --name init

# Seed the database with demo data
npx prisma db seed
```

### What the seed creates:

| Data | Details |
|---|---|
| **Super Admin** | `admin@sparkly.io` / `Admin123!` |
| **Tax Configs** | QC 2026 + ON 2026 rates (QPP, CPP, EI, QPIP, brackets) |
| **Demo Account 1** | Nettoyage Éclat (QC, pro plan) — owner: `marie@eclat.ca` / `Test123!` |
| **Demo Account 2** | CleanPro Toronto (ON, business plan) — owner: `james@cleanpro.ca` / `Test123!` |
| **Staff Users** | 4 staff/accountant users across both accounts |
| **Customers** | 7 customers across both accounts |
| **Jobs** | 4 sample jobs |
| **Expenses** | 4 sample expenses |
| **Recurring Jobs** | 3 recurring job templates (weekly, biweekly, monthly) |
| **Invoices** | 3 invoices with 3 payment links |
| **Payroll** | 4 payroll entries |

### Explore the database:

```bash
npx prisma studio
```

This opens a web-based database browser at `http://localhost:5555`.

---

## 6. Run the Project

### Development (from root):

```bash
cd sparkly
npm run dev:backend    # Starts backend on port 4000
npm run dev:frontend   # Starts frontend on port 5173
```

Or run both together by opening two terminal windows.

### Access:

| URL | What |
|---|---|
| `http://localhost:5173` | Frontend (Vite dev server) |
| `http://localhost:4000/api/v1/health` | Backend health check |
| `http://localhost:5555` | Prisma Studio (after `npx prisma studio`) |

---

## 7. Stripe Webhook (Local Dev)

Install the Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

```bash
stripe listen --forward-to localhost:4000/api/v1/invoices/webhook
```

Copy the webhook signing secret it prints and set it as `STRIPE_WEBHOOK_SECRET` in `.env`.

---

## 8. Project Structure

```
sparkly/
├── package.json              # Root monorepo scripts
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma     # 13 models, all enums, relations
│   │   └── seed.ts           # Demo data seeder
│   └── src/
│       ├── index.ts           # Express server entry point
│       ├── config/            # DB, logger, env config
│       ├── types/             # TypeScript types
│       ├── utils/             # Response helpers, AppError
│       ├── middleware/        # Auth, RBAC, plan gate, tenant scope, validation, error handler
│       └── modules/
│           ├── auth/          # Register, login, refresh, logout
│           ├── users/         # CRUD with plan-based limits
│           ├── customers/     # CRUD with soft delete
│           ├── jobs/          # CRUD, mark complete
│           ├── recurring-jobs/# CRUD, cron processor
│           ├── payroll/       # Tax engine (QC/ON), pay stubs
│           ├── invoices/      # CRUD, Stripe payment links, webhook
│           ├── expenses/      # CRUD, category summaries
│           ├── dashboard/     # Overview, stats, charts data
│           └── admin/         # Super admin: accounts, audit, stats
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Router with protected/guest routes
│       ├── index.css          # Tailwind + custom utilities
│       ├── lib/               # API client, i18n (EN/FR), utils
│       ├── store/             # Zustand auth store
│       ├── types/             # Frontend TypeScript interfaces
│       ├── components/
│       │   ├── ui/            # Button, Card, Input, Badge, Label
│       │   └── layout/        # Sidebar, TopBar, AppLayout
│       └── pages/
│           ├── LandingPage.tsx
│           ├── LoginPage.tsx
│           ├── RegisterPage.tsx
│           └── app/           # All authenticated pages
│               ├── DashboardPage.tsx
│               ├── LogJobPage.tsx
│               ├── AllJobsPage.tsx
│               ├── RecurringJobsPage.tsx
│               ├── LogExpensePage.tsx
│               ├── CustomersPage.tsx
│               ├── InvoicesPage.tsx
│               ├── PaymentLinksPage.tsx
│               ├── PayrollPage.tsx
│               ├── TaxFilingPage.tsx
│               ├── RevenueReportPage.tsx
│               ├── PricingPage.tsx
│               └── SettingsPage.tsx
```

---

## 9. Key Features by Plan

| Feature | Solo ($29) | Pro ($49) | Business ($99) |
|---|:---:|:---:|:---:|
| Users | 1 | 5 | Unlimited |
| Job Management | ✅ | ✅ | ✅ |
| Customer CRM | ✅ | ✅ | ✅ |
| Invoicing | ✅ | ✅ | ✅ |
| Expenses | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Recurring Jobs | ❌ | ✅ | ✅ |
| Staff Management | ❌ | ✅ | ✅ |
| Payroll & Tax | ❌ | ❌ | ✅ |
| Accountant Role | ❌ | ❌ | ✅ |

---

## 10. Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + Radix UI + CVA |
| Charts | Recharts |
| State | Zustand (persisted) |
| HTTP | Axios with auto refresh |
| i18n | Custom EN/FR |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | Supabase PostgreSQL |
| Auth | JWT (access + refresh rotation) |
| Payments | Stripe Checkout Sessions |
| Validation | Zod |
| Scheduler | node-cron |
| Security | Helmet, CORS, rate-limit |
