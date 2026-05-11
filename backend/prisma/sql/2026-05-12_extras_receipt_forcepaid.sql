-- Migration: 2026-05-12
-- 1. Add extras JSONB column to jobs (cleaning extras checklist)
-- 2. Add receipt_image TEXT column to expenses (invoice/receipt photo as base64 or URL)
-- Both are idempotent (IF NOT EXISTS)

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS extras JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_image TEXT;
