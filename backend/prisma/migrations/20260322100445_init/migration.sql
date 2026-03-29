-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('solo', 'pro', 'business');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'account_owner', 'staff', 'accountant');

-- CreateEnum
CREATE TYPE "Province" AS ENUM ('QC', 'ON');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'past_due', 'trialing');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "RecurringJobStatus" AS ENUM ('draft', 'active', 'paused');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'failed', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentLinkStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('supplies', 'equipment', 'fuel', 'wages', 'insurance', 'marketing', 'storage', 'training', 'software', 'other');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "province" "Province" NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'solo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "scheduler_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recurring_job_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduler_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "province" "Province" NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "rates" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_account_id_idx" ON "users"("account_id");

-- CreateIndex
CREATE INDEX "customers_account_id_idx" ON "customers"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_account_id_email_key" ON "customers"("account_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_account_id_key" ON "subscriptions"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "jobs_account_id_status_idx" ON "jobs"("account_id", "status");

-- CreateIndex
CREATE INDEX "jobs_account_id_scheduled_date_idx" ON "jobs"("account_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "jobs_account_id_customer_id_idx" ON "jobs"("account_id", "customer_id");

-- CreateIndex
CREATE INDEX "recurring_jobs_status_next_run_idx" ON "recurring_jobs"("status", "next_run");

-- CreateIndex
CREATE INDEX "payroll_entries_account_id_pay_period_start_idx" ON "payroll_entries"("account_id", "pay_period_start");

-- CreateIndex
CREATE INDEX "invoices_account_id_status_idx" ON "invoices"("account_id", "status");

-- CreateIndex
CREATE INDEX "invoices_account_id_issued_date_idx" ON "invoices"("account_id", "issued_date");

-- CreateIndex
CREATE INDEX "invoices_account_id_customer_id_idx" ON "invoices"("account_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_links_invoice_id_key" ON "payment_links"("invoice_id");

-- CreateIndex
CREATE INDEX "expenses_account_id_date_idx" ON "expenses"("account_id", "date");

-- CreateIndex
CREATE INDEX "audit_logs_account_id_timestamp_idx" ON "audit_logs"("account_id", "timestamp");

-- CreateIndex
CREATE INDEX "scheduler_logs_recurring_job_id_executed_at_idx" ON "scheduler_logs"("recurring_job_id", "executed_at");

-- CreateIndex
CREATE UNIQUE INDEX "tax_configs_province_tax_year_key" ON "tax_configs"("province", "tax_year");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_jobs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_logs" ADD CONSTRAINT "scheduler_logs_recurring_job_id_fkey" FOREIGN KEY ("recurring_job_id") REFERENCES "recurring_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
