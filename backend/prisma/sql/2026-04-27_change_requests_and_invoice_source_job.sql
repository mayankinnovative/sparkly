-- ────────────────────────────────────────────────────────────────────────────
-- Migration: 2026-04-27
-- Purpose:
--   1. Add `source_job_id` to invoices (with unique partial index) so the same
--      Job cannot generate duplicate invoices when "Mark Complete" is clicked
--      multiple times.
--   2. Create `change_requests` table — non-admin users (account owners) can
--      submit requests (e.g. province change) for Super Admin to review.
--   3. Seed default `trial_days` PlatformSetting (30 days) so the Super Admin
--      can edit it via the admin UI.
--
-- Idempotent — safe to re-run.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Invoices.source_job_id (FK-less; we just want a unique reference)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS source_job_id UUID;

-- Unique index that allows multiple NULLs but enforces uniqueness when set.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_source_job_id_key
  ON invoices (source_job_id)
  WHERE source_job_id IS NOT NULL;

-- 2. change_requests table
CREATE TABLE IF NOT EXISTS change_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL,
  requested_by    UUID NOT NULL,
  request_type    VARCHAR(50) NOT NULL,           -- e.g. "province_change"
  current_value   VARCHAR(100),
  requested_value VARCHAR(100) NOT NULL,
  reason          TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS change_requests_status_created_idx
  ON change_requests (status, created_at);

CREATE INDEX IF NOT EXISTS change_requests_account_idx
  ON change_requests (account_id);

-- 3. Seed default trial_days setting (30 days)
INSERT INTO platform_settings (id, key, value, updated_at)
VALUES (gen_random_uuid(), 'trial_days', '30'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
