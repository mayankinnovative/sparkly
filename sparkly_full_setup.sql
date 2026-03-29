-- ============================================================================
-- SPARKLY CleanTrack — Complete Database Setup + Demo Data
-- Run this entire file in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║                     PART 1 — DROP EXISTING (SAFETY)                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

DROP TABLE IF EXISTS scheduler_logs CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payment_links CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS payroll_entries CASCADE;
DROP TABLE IF EXISTS recurring_jobs CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS tax_configs CASCADE;
DROP TABLE IF EXISTS _prisma_migrations CASCADE;

DROP TYPE IF EXISTS "Plan" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "Province" CASCADE;
DROP TYPE IF EXISTS "SubscriptionStatus" CASCADE;
DROP TYPE IF EXISTS "JobStatus" CASCADE;
DROP TYPE IF EXISTS "RecurringFrequency" CASCADE;
DROP TYPE IF EXISTS "RecurringJobStatus" CASCADE;
DROP TYPE IF EXISTS "InvoiceStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentLinkStatus" CASCADE;
DROP TYPE IF EXISTS "ExpenseCategory" CASCADE;

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║                     PART 2 — ENUM TYPES                            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE TYPE "Plan" AS ENUM ('solo', 'pro', 'business');
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'account_owner', 'staff', 'accountant');
CREATE TYPE "Province" AS ENUM ('QC', 'ON');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
CREATE TYPE "JobStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE "RecurringJobStatus" AS ENUM ('draft', 'active', 'paused');
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'failed', 'overdue', 'cancelled');
CREATE TYPE "PaymentLinkStatus" AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE "ExpenseCategory" AS ENUM ('supplies', 'equipment', 'fuel', 'wages', 'insurance', 'marketing', 'storage', 'training', 'software', 'other');

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║                     PART 3 — CREATE TABLES                         ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- accounts
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "province" "Province" NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'solo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- customers
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "province" VARCHAR(50),
    "postal_code" VARCHAR(20),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- subscriptions
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- jobs
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "customer_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "job_type" VARCHAR(100) NOT NULL DEFAULT 'Residential',
    "assigned_to" UUID,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "duration" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "supplies" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "staff_count" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- recurring_jobs
CREATE TABLE "recurring_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "customer_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "job_type" VARCHAR(100) NOT NULL DEFAULT 'Recurring',
    "assigned_to" UUID,
    "frequency" "RecurringFrequency" NOT NULL,
    "next_run" TIMESTAMP(3) NOT NULL,
    "status" "RecurringJobStatus" NOT NULL DEFAULT 'draft',
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "duration" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "supplies" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "staff_count" INTEGER NOT NULL DEFAULT 1,
    "delivery" VARCHAR(50) NOT NULL DEFAULT 'Email',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recurring_jobs_pkey" PRIMARY KEY ("id")
);

-- payroll_entries
CREATE TABLE "payroll_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL,
    "hourly_rate" DECIMAL(10,2) NOT NULL,
    "flat_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable_benefits" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vacation_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.04,
    "holiday_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gross_pay" DECIMAL(12,2) NOT NULL,
    "deduction_breakdown" JSONB NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "province" "Province" NOT NULL,
    "workers_comp_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employer_costs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_informational_only" BOOLEAN NOT NULL DEFAULT true,
    "pay_type" VARCHAR(20) NOT NULL DEFAULT 'hourly',
    "pay_period_start" DATE NOT NULL,
    "pay_period_end" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- invoices
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "line_items" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "invoice_no" VARCHAR(50) NOT NULL,
    "issued_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- payment_links
CREATE TABLE "payment_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "stripe_session_id" VARCHAR(255),
    "url" VARCHAR(2048),
    "status" "PaymentLinkStatus" NOT NULL DEFAULT 'pending',
    "method" VARCHAR(20) NOT NULL DEFAULT 'Email',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

-- expenses
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- audit_logs
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- admin_actions
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_entity" VARCHAR(100) NOT NULL,
    "target_id" UUID,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- scheduler_logs
CREATE TABLE "scheduler_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recurring_job_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduler_logs_pkey" PRIMARY KEY ("id")
);

-- tax_configs
CREATE TABLE "tax_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "province" "Province" NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "rates" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_configs_pkey" PRIMARY KEY ("id")
);

-- Prisma migrations tracking table (so Prisma knows migrations are applied)
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3) WITH TIME ZONE,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3) WITH TIME ZONE,
    "started_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║                     PART 4 — INDEXES                               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_account_id_idx" ON "users"("account_id");
CREATE INDEX "customers_account_id_idx" ON "customers"("account_id");
CREATE UNIQUE INDEX "customers_account_id_email_key" ON "customers"("account_id", "email");
CREATE UNIQUE INDEX "subscriptions_account_id_key" ON "subscriptions"("account_id");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "jobs_account_id_status_idx" ON "jobs"("account_id", "status");
CREATE INDEX "jobs_account_id_scheduled_date_idx" ON "jobs"("account_id", "scheduled_date");
CREATE INDEX "jobs_account_id_customer_id_idx" ON "jobs"("account_id", "customer_id");
CREATE INDEX "recurring_jobs_status_next_run_idx" ON "recurring_jobs"("status", "next_run");
CREATE INDEX "payroll_entries_account_id_pay_period_start_idx" ON "payroll_entries"("account_id", "pay_period_start");
CREATE INDEX "invoices_account_id_status_idx" ON "invoices"("account_id", "status");
CREATE INDEX "invoices_account_id_issued_date_idx" ON "invoices"("account_id", "issued_date");
CREATE INDEX "invoices_account_id_customer_id_idx" ON "invoices"("account_id", "customer_id");
CREATE UNIQUE INDEX "payment_links_invoice_id_key" ON "payment_links"("invoice_id");
CREATE INDEX "expenses_account_id_date_idx" ON "expenses"("account_id", "date");
CREATE INDEX "audit_logs_account_id_timestamp_idx" ON "audit_logs"("account_id", "timestamp");
CREATE INDEX "scheduler_logs_recurring_job_id_executed_at_idx" ON "scheduler_logs"("recurring_job_id", "executed_at");
CREATE UNIQUE INDEX "tax_configs_province_tax_year_key" ON "tax_configs"("province", "tax_year");

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║                     PART 5 — FOREIGN KEYS                          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

ALTER TABLE "users" ADD CONSTRAINT "users_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customers" ADD CONSTRAINT "customers_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_jobs_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_jobs_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scheduler_logs" ADD CONSTRAINT "scheduler_logs_recurring_job_id_fkey"
    FOREIGN KEY ("recurring_job_id") REFERENCES "recurring_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║                     PART 6 — SEED DATA                             ║
-- ║  Passwords:                                                        ║
-- ║    Admin@123456  → super admin                                     ║
-- ║    Demo@123456   → account owners                                  ║
-- ║    Staff@123456  → staff users                                     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ─── 6a. Prisma Migration Record ────────────────────────────────────────
-- This tells Prisma the migration has already been applied
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
    'sparkly-supabase-init-001',
    'manual_supabase_setup',
    NOW(),
    '20260322100445_init',
    NULL,
    NULL,
    NOW(),
    1
);

-- ─── 6b. Accounts ──────────────────────────────────────────────────────
INSERT INTO "accounts" ("id", "name", "province", "plan", "created_at", "updated_at")
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Sparkly Clean Montréal', 'QC', 'pro', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', 'CleanTrack Toronto', 'ON', 'business', NOW(), NOW());

-- ─── 6c. Users ─────────────────────────────────────────────────────────
-- Super Admin (no account)
INSERT INTO "users" ("id", "account_id", "email", "password_hash", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'admin@sparkly.ca',
    '$2a$10$NeW2/oVbOh09gULNQZYS2uE7UcCHIHf77QEpMOpx8uBB9/gMRlOmC',
    'Super', 'Admin', 'super_admin', NOW(), NOW()
);

-- QC Account Owner
INSERT INTO "users" ("id", "account_id", "email", "password_hash", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'owner@sparklyclean.ca',
    '$2a$10$GrJNiEOZFxQK1b9SImA3T.keXXEJYx4yIx2Y0NUw0UWvna/Y0f37u',
    'Marie', 'Tremblay', 'account_owner', NOW(), NOW()
);

-- QC Staff 1 — Sophie
INSERT INTO "users" ("id", "account_id", "email", "password_hash", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'sophie@sparklyclean.ca',
    '$2a$10$x2TOeUdGyVfEnlTbLSBLZefF8BNs6AFiSwknX8DojJL5YXuWN5bee',
    'Sophie', 'Tremblay', 'staff', NOW(), NOW()
);

-- QC Staff 2 — Marc
INSERT INTO "users" ("id", "account_id", "email", "password_hash", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'marc@sparklyclean.ca',
    '$2a$10$x2TOeUdGyVfEnlTbLSBLZefF8BNs6AFiSwknX8DojJL5YXuWN5bee',
    'Marc', 'Gagnon', 'staff', NOW(), NOW()
);

-- ON Account Owner
INSERT INTO "users" ("id", "account_id", "email", "password_hash", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000002',
    'owner@cleantracktoronto.ca',
    '$2a$10$GrJNiEOZFxQK1b9SImA3T.keXXEJYx4yIx2Y0NUw0UWvna/Y0f37u',
    'James', 'Wilson', 'account_owner', NOW(), NOW()
);

-- ON Staff 1 — Emily
INSERT INTO "users" ("id", "account_id", "email", "password_hash", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
    '10000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000002',
    'emily@cleantracktoronto.ca',
    '$2a$10$x2TOeUdGyVfEnlTbLSBLZefF8BNs6AFiSwknX8DojJL5YXuWN5bee',
    'Emily', 'Carter', 'staff', NOW(), NOW()
);

-- ON Staff 2 — Noah
INSERT INTO "users" ("id", "account_id", "email", "password_hash", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
    '10000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000002',
    'noah@cleantracktoronto.ca',
    '$2a$10$x2TOeUdGyVfEnlTbLSBLZefF8BNs6AFiSwknX8DojJL5YXuWN5bee',
    'Noah', 'Wilson', 'staff', NOW(), NOW()
);

-- ─── 6d. Subscriptions ────────────────────────────────────────────────
INSERT INTO "subscriptions" ("account_id", "plan", "status", "start_date", "trial_ends_at", "created_at", "updated_at")
VALUES
    ('00000000-0000-0000-0000-000000000001', 'pro', 'trialing', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', 'business', 'trialing', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW());

-- ─── 6e. Customers (QC) ──────────────────────────────────────────────
INSERT INTO "customers" ("id", "account_id", "name", "email", "phone", "address", "city", "province", "postal_code", "created_at", "updated_at")
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
     'Maple Dental', 'contact@mapledental.ca', '514-555-0101',
     '1234 Sherbrooke St W', 'Montréal', 'QC', 'H3A 1H6', NOW(), NOW()),

    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
     'Lévesque Residence', 'levesque@gmail.com', '514-555-0202',
     '456 Laurier Ave', 'Montréal', 'QC', 'H2V 2K7', NOW(), NOW()),

    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
     'Northview Offices', 'admin@northview.ca', '514-555-0303',
     '789 René-Lévesque Blvd', 'Montréal', 'QC', 'H3B 4W8', NOW(), NOW()),

    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
     'Parkside Move-Out', 'parkside@mail.com', '514-555-0404',
     '321 Saint-Denis St', 'Montréal', 'QC', 'H2X 3L3', NOW(), NOW());

-- ─── 6f. Customers (ON) ──────────────────────────────────────────────
INSERT INTO "customers" ("id", "account_id", "name", "email", "phone", "address", "city", "province", "postal_code", "created_at", "updated_at")
VALUES
    ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
     'Bay Street Tower', 'facilities@bayst.ca', '416-555-0101',
     '100 King Street W', 'Toronto', 'ON', 'M5X 1A9', NOW(), NOW()),

    ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
     'Yorkville Condos', 'mgmt@yorkvillecondos.ca', '416-555-0202',
     '200 Bloor St W', 'Toronto', 'ON', 'M5S 1T8', NOW(), NOW()),

    ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002',
     'Scarborough Medical', 'ops@scarmed.ca', '416-555-0303',
     '300 Lawrence Ave E', 'Scarborough', 'ON', 'M1P 2P9', NOW(), NOW());

-- ─── 6g. Jobs (QC Account) ───────────────────────────────────────────
INSERT INTO "jobs" ("account_id", "customer_id", "title", "job_type", "price", "duration", "supplies", "staff_count", "notes", "status", "scheduled_date", "assigned_to", "created_at", "updated_at")
VALUES
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     'Maple Dental Evening Cleaning', 'Commercial', 840, 5, 42, 2,
     'Evening office cleaning', 'completed', '2026-03-03', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),

    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
     'Lévesque Deep Clean', 'Deep Clean', 420, 4, 30, 1,
     'Kitchen and bathrooms', 'completed', '2026-03-05', '10000000-0000-0000-0000-000000000004', NOW(), NOW()),

    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
     'Northview Weekly Service', 'Recurring', 690, 4, 28, 2,
     'Weekly service', 'completed', '2026-03-06', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),

    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004',
     'Parkside Move-Out Clean', 'Move-Out', 510, 6, 35, 2,
     'Full turnover clean', 'pending', '2026-03-09', NULL, NOW(), NOW());

-- ─── 6h. Expenses (QC Account) ───────────────────────────────────────
INSERT INTO "expenses" ("account_id", "category", "amount", "description", "date", "created_at", "updated_at")
VALUES
    ('00000000-0000-0000-0000-000000000001', 'supplies',  185, 'Bulk chemicals',       '2026-03-02', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000001', 'fuel',       96, 'Weekly routes',         '2026-03-04', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000001', 'software',   49, 'Scheduling software',   '2026-03-07', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000001', 'wages',     420, 'Part-time helper',      '2026-03-08', NOW(), NOW());

-- ─── 6i. Recurring Jobs (QC Account) ─────────────────────────────────
INSERT INTO "recurring_jobs" ("id", "account_id", "customer_id", "title", "job_type", "frequency", "next_run", "status", "price", "duration", "supplies", "staff_count", "delivery", "created_at", "updated_at")
VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
     'Northview Weekly Cleaning', 'Recurring', 'weekly', '2026-03-18', 'active',
     690, 4, 28, 2, 'Email + SMS', NOW(), NOW()),

    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     'Maple Dental Bi-weekly Service', 'Commercial', 'weekly', '2026-03-20', 'active',
     840, 5, 42, 2, 'Email', NOW(), NOW()),

    ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
     'Lévesque Monthly Cleaning', 'Residential', 'monthly', '2026-04-01', 'draft',
     280, 3, 15, 1, 'SMS', NOW(), NOW());

-- ─── 6j. Invoices (QC Account) ───────────────────────────────────────
-- Invoice 1 — Northview (paid)
INSERT INTO "invoices" ("id", "account_id", "customer_id", "line_items", "subtotal", "tax_amount", "total", "status", "invoice_no", "issued_date", "due_date", "language", "created_at", "updated_at")
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '[{"description": "Commercial cleaning — Northview Offices", "qty": 1, "rate": 690, "amount": 690}]'::jsonb,
    690.00,
    103.33,    -- 690 * (0.05 + 0.09975)
    793.33,    -- 690 * 1.14975
    'paid',
    'CT-2026-0310-001',
    '2026-03-10',
    '2026-03-25',
    'en',
    NOW(), NOW()
);

-- Invoice 2 — Maple Dental (sent)
INSERT INTO "invoices" ("id", "account_id", "customer_id", "line_items", "subtotal", "tax_amount", "total", "status", "invoice_no", "issued_date", "due_date", "language", "created_at", "updated_at")
VALUES (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '[{"description": "Evening office cleaning — Maple Dental", "qty": 1, "rate": 840, "amount": 840}]'::jsonb,
    840.00,
    125.79,    -- 840 * 0.14975
    965.79,    -- 840 * 1.14975
    'sent',
    'CT-2026-0311-002',
    '2026-03-11',
    '2026-03-26',
    'en',
    NOW(), NOW()
);

-- Invoice 3 — Parkside (sent)
INSERT INTO "invoices" ("id", "account_id", "customer_id", "line_items", "subtotal", "tax_amount", "total", "status", "invoice_no", "issued_date", "due_date", "language", "created_at", "updated_at")
VALUES (
    '40000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '[{"description": "Move-out cleaning — Parkside", "qty": 1, "rate": 510, "amount": 510}]'::jsonb,
    510.00,
    76.37,     -- 510 * 0.14975
    586.37,    -- 510 * 1.14975
    'sent',
    'CT-2026-0312-003',
    '2026-03-12',
    '2026-03-27',
    'en',
    NOW(), NOW()
);

-- ─── 6k. Payment Links ──────────────────────────────────────────────
INSERT INTO "payment_links" ("invoice_id", "method", "status", "sent_at", "url", "created_at")
VALUES
    ('40000000-0000-0000-0000-000000000001', 'Email', 'completed', '2026-03-10',
     'https://checkout.stripe.com/demo/40000000-0000-0000-0000-000000000001', NOW()),
    ('40000000-0000-0000-0000-000000000002', 'SMS', 'pending', '2026-03-11',
     'https://checkout.stripe.com/demo/40000000-0000-0000-0000-000000000002', NOW()),
    ('40000000-0000-0000-0000-000000000003', 'Email', 'pending', '2026-03-12',
     'https://checkout.stripe.com/demo/40000000-0000-0000-0000-000000000003', NOW());

-- ─── 6l. Payroll Entries (QC) ────────────────────────────────────────
-- Staff QC1 — Sophie (hourly)
INSERT INTO "payroll_entries" ("account_id", "user_id", "hours", "hourly_rate", "flat_pay", "bonus", "taxable_benefits", "vacation_rate", "holiday_pay", "gross_pay", "deduction_breakdown", "total_deductions", "net_pay", "province", "workers_comp_amount", "employer_costs", "pay_type", "pay_period_start", "pay_period_end", "created_at")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    34, 23, 0, 40, 0, 0.04, 58,
    920.32,    -- 34*23 + 40 + (34*23+40)*0.04 + 58
    '{"qpp": 86.42, "qpip": 15.98, "incomeTax": 121.50, "employerHsf": 24.14, "labourStandards": 0.06}'::jsonb,
    223.90,    -- 86.42 + 15.98 + 121.50
    696.42,    -- 920.32 - 223.90
    'QC',
    12.04,     -- 34 * 0.0154 * 23
    31.96,     -- 24.14 + 920.32 * 0.0085
    'hourly',
    '2026-03-01',
    '2026-03-15',
    NOW()
);

-- Staff QC2 — Marc (flat_job)
INSERT INTO "payroll_entries" ("account_id", "user_id", "hours", "hourly_rate", "flat_pay", "bonus", "taxable_benefits", "vacation_rate", "holiday_pay", "gross_pay", "deduction_breakdown", "total_deductions", "net_pay", "province", "workers_comp_amount", "employer_costs", "pay_type", "pay_period_start", "pay_period_end", "created_at")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    26, 0, 690, 0, 25, 0.04, 42,
    785.60,    -- 690 + 25 + (690+25)*0.04 + 42
    '{"qpp": 52.64, "qpip": 10.21, "incomeTax": 76.30, "employerHsf": 15.63, "labourStandards": 0.06}'::jsonb,
    139.15,    -- 52.64 + 10.21 + 76.30
    646.45,    -- 785.60 - 139.15
    'QC',
    10.63,     -- 26 * 0.0154 * 26.54
    22.31,     -- 15.63 + 785.60 * 0.0085
    'flat_job',
    '2026-03-01',
    '2026-03-15',
    NOW()
);

-- ─── 6m. Payroll Entries (ON) ────────────────────────────────────────
-- Staff ON1 — Emily (hourly)
INSERT INTO "payroll_entries" ("account_id", "user_id", "hours", "hourly_rate", "flat_pay", "bonus", "taxable_benefits", "vacation_rate", "holiday_pay", "gross_pay", "deduction_breakdown", "total_deductions", "net_pay", "province", "workers_comp_amount", "employer_costs", "pay_type", "pay_period_start", "pay_period_end", "created_at")
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000006',
    38, 22, 0, 35, 0, 0.04, 61,
    965.48,    -- 38*22 + 35 + (38*22+35)*0.04 + 61
    '{"cpp": 52.18, "ei": 13.76, "incomeTax": 118.90, "eht": 0, "wsibInsurable": 932}'::jsonb,
    184.84,    -- 52.18 + 13.76 + 118.90
    780.64,    -- 965.48 - 184.84
    'ON',
    20.50,     -- 932 * 0.022
    33.55,     -- 932 * 0.014 + 932 * 0.022
    'hourly',
    '2026-03-01',
    '2026-03-15',
    NOW()
);

-- Staff ON2 — Noah (flat_job)
INSERT INTO "payroll_entries" ("account_id", "user_id", "hours", "hourly_rate", "flat_pay", "bonus", "taxable_benefits", "vacation_rate", "holiday_pay", "gross_pay", "deduction_breakdown", "total_deductions", "net_pay", "province", "workers_comp_amount", "employer_costs", "pay_type", "pay_period_start", "pay_period_end", "created_at")
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000007',
    21, 0, 540, 20, 18, 0.04, 35,
    636.12,    -- 540 + 20 + 18 + (540+20+18)*0.04 + 35
    '{"cpp": 34.44, "ei": 9.32, "incomeTax": 61.80, "eht": 0, "wsibInsurable": 613}'::jsonb,
    105.56,    -- 34.44 + 9.32 + 61.80
    530.56,    -- 636.12 - 105.56
    'ON',
    13.49,     -- 613 * 0.022
    22.07,     -- 613 * 0.014 + 613 * 0.022
    'flat_job',
    '2026-03-01',
    '2026-03-15',
    NOW()
);

-- ─── 6n. Tax Configs (QC & ON for 2026) ─────────────────────────────
INSERT INTO "tax_configs" ("province", "tax_year", "rates", "updated_at")
VALUES
(
    'QC', 2026,
    '{
        "gst": 0.05,
        "pst": 0.09975,
        "taxName": { "en": "GST + QST", "fr": "TPS + TVQ" },
        "label": { "en": "Québec · GST + QST · CNESST", "fr": "Québec · TPS + TVQ · CNESST" },
        "wc": "CNESST",
        "payroll": {
            "qpp_rate": 0.064,
            "qpp_max_annual": 4038.40,
            "qpip_rate": 0.00494,
            "qpip_max_annual": 462.79,
            "qpip_employer_rate": 0.00692,
            "ei_rate": 0.0132,
            "ei_max_annual": 1049.12,
            "ei_employer_multiplier": 1.4,
            "hsf_rate": 0.04260,
            "labour_standards_rate": 0.0006,
            "cnesst_rate": 0.0154,
            "federal_basic_personal": 16129,
            "provincial_basic_personal": 18056,
            "federal_brackets": [
                { "min": 0, "max": 57375, "rate": 0.15 },
                { "min": 57375, "max": 114750, "rate": 0.205 },
                { "min": 114750, "max": 158468, "rate": 0.26 },
                { "min": 158468, "max": 223210, "rate": 0.29 },
                { "min": 223210, "max": 999999999, "rate": 0.33 }
            ],
            "provincial_brackets": [
                { "min": 0, "max": 51780, "rate": 0.14 },
                { "min": 51780, "max": 103545, "rate": 0.19 },
                { "min": 103545, "max": 126000, "rate": 0.24 },
                { "min": 126000, "max": 999999999, "rate": 0.2575 }
            ]
        }
    }'::jsonb,
    NOW()
),
(
    'ON', 2026,
    '{
        "gst": 0.13,
        "pst": 0,
        "taxName": { "en": "HST", "fr": "TVH" },
        "label": { "en": "Ontario · HST · WSIB", "fr": "Ontario · TVH · WSIB" },
        "wc": "WSIB",
        "payroll": {
            "cpp_rate": 0.0595,
            "cpp_max_annual": 3867.50,
            "cpp2_rate": 0.04,
            "cpp2_additional_max": 396.00,
            "ei_rate": 0.0166,
            "ei_max_annual": 1049.12,
            "ei_employer_multiplier": 1.4,
            "eht_threshold": 1000000,
            "eht_rate": 0.0195,
            "wsib_rate": 0.022,
            "federal_basic_personal": 16129,
            "provincial_basic_personal": 11865,
            "federal_brackets": [
                { "min": 0, "max": 57375, "rate": 0.15 },
                { "min": 57375, "max": 114750, "rate": 0.205 },
                { "min": 114750, "max": 158468, "rate": 0.26 },
                { "min": 158468, "max": 223210, "rate": 0.29 },
                { "min": 223210, "max": 999999999, "rate": 0.33 }
            ],
            "provincial_brackets": [
                { "min": 0, "max": 51446, "rate": 0.0505 },
                { "min": 51446, "max": 102894, "rate": 0.0915 },
                { "min": 102894, "max": 150000, "rate": 0.1116 },
                { "min": 150000, "max": 220000, "rate": 0.1216 },
                { "min": 220000, "max": 999999999, "rate": 0.1316 }
            ]
        }
    }'::jsonb,
    NOW()
);

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║                     DONE! ✅                                       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- 📋 Demo Credentials:
-- ┌──────────────────────────────────────────────────────────────────┐
-- │  Super Admin:  admin@sparkly.ca          / Admin@123456         │
-- │  QC Owner:     owner@sparklyclean.ca     / Demo@123456          │
-- │  ON Owner:     owner@cleantracktoronto.ca / Demo@123456         │
-- │  QC Staff:     sophie@sparklyclean.ca    / Staff@123456         │
-- │  QC Staff:     marc@sparklyclean.ca      / Staff@123456         │
-- │  ON Staff:     emily@cleantracktoronto.ca / Staff@123456        │
-- │  ON Staff:     noah@cleantracktoronto.ca / Staff@123456         │
-- └──────────────────────────────────────────────────────────────────┘
