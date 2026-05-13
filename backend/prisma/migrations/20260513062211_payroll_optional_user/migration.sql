-- Migration: allow payroll entries for employees who don't have a Sparkly user account.
-- 1. Make user_id nullable (was NOT NULL) so a payroll entry can exist without a linked user.
-- 2. Add employee_name column to store the person's display name when no account exists.

ALTER TABLE "payroll_entries"
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "payroll_entries"
  ADD COLUMN IF NOT EXISTS "employee_name" VARCHAR(255);
