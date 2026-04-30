-- Sparkly — Migration: 2026-04-30
-- Purpose:
--   1. Add `is_active` column to `accounts` (FR-ADM-07).
--      Allows Super Admin to suspend an entire tenant account so that
--      both current and any future users of that account are blocked
--      at login until the tenant is reactivated.
--   2. Backfill `is_active = true` for all existing rows.
--
-- Idempotent: safe to re-run.

-- ─────────────────────────────────────────────
-- 1. accounts.is_active
-- ─────────────────────────────────────────────
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Defensive: ensure no existing row is left as NULL (in case the column
-- was added previously without a NOT NULL default in some other env).
UPDATE accounts SET is_active = TRUE WHERE is_active IS NULL;

-- ─────────────────────────────────────────────
-- 2. Note on FR-ADM-06 (Super Admin impersonation)
-- ─────────────────────────────────────────────
-- The previous build exposed a `POST /admin/users/:id/login-as` route
-- that minted an impersonation JWT. SRS v2 §FR-ADM-06 explicitly
-- forbids this. The route and its service method have been removed at
-- the application layer in this release. No DB change is required for
-- the removal itself, but for forensic clarity we record any historical
-- usage so it is preserved for audit purposes (no destructive cleanup).
--   SELECT * FROM admin_actions WHERE action = 'login_as';
