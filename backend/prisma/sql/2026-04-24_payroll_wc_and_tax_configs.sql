-- =====================================================================
-- Sparkly — Tax config + Payroll defaults migration
-- Date: 2026-04-24
-- Purpose:
--   1. Ensure payroll_entries has all columns required by the updated
--      Payroll/WC service (these may already exist on environments that
--      ran the latest Prisma migration; the IF NOT EXISTS guards make
--      this script safe to re-run).
--   2. Upsert 2026 tax_configs rows for QC and ON with the full bracket
--      structure expected by the tax engine (so it does not silently
--      fall back to hardcoded constants).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Defensive column adds for payroll_entries
-- ---------------------------------------------------------------------
ALTER TABLE payroll_entries
  ADD COLUMN IF NOT EXISTS flat_pay              numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus                 numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_benefits      numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacation_rate         numeric(5,4)  NOT NULL DEFAULT 0.04,
  ADD COLUMN IF NOT EXISTS holiday_pay           numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workers_comp_amount   numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_costs        numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_informational_only boolean       NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pay_type              varchar(20)   NOT NULL DEFAULT 'hourly';

-- ---------------------------------------------------------------------
-- 2. tax_configs — upsert 2026 brackets for QC and ON
--    Rates align with payroll/tax-engine.ts FALLBACK constants.
-- ---------------------------------------------------------------------

-- Quebec (QC) ----------------------------------------------------------
INSERT INTO tax_configs (id, province, tax_year, rates, updated_at)
VALUES (
  gen_random_uuid(),
  'QC',
  2026,
  '{
    "province": "QC",
    "year": 2026,
    "federalBrackets": [
      {"min": 0,      "max": 57375,  "rate": 0.15},
      {"min": 57375,  "max": 114750, "rate": 0.205},
      {"min": 114750, "max": 158468, "rate": 0.26},
      {"min": 158468, "max": 221708, "rate": 0.29},
      {"min": 221708, "max": null,   "rate": 0.33}
    ],
    "provincialBrackets": [
      {"min": 0,      "max": 51780,  "rate": 0.14},
      {"min": 51780,  "max": 103545, "rate": 0.19},
      {"min": 103545, "max": 126000, "rate": 0.24},
      {"min": 126000, "max": null,   "rate": 0.2575}
    ],
    "federalPersonalAmount":   16129,
    "provincialPersonalAmount": 18056,
    "cppRate": 0,
    "cppMaxContribution": 0,
    "cppExemption": 3500,
    "eiRate": 0.0132,
    "eiMaxInsurable": 65700,
    "qppRate": 0.064,
    "qppMaxContribution": 4160,
    "qpipEmployeeRate": 0.00494,
    "qpipMaxInsurable": 94000,
    "workersCompRate": 1.86
  }'::jsonb,
  NOW()
)
ON CONFLICT (province, tax_year) DO UPDATE
SET rates      = EXCLUDED.rates,
    updated_at = NOW();

-- Ontario (ON) ---------------------------------------------------------
INSERT INTO tax_configs (id, province, tax_year, rates, updated_at)
VALUES (
  gen_random_uuid(),
  'ON',
  2026,
  '{
    "province": "ON",
    "year": 2026,
    "federalBrackets": [
      {"min": 0,      "max": 57375,  "rate": 0.15},
      {"min": 57375,  "max": 114750, "rate": 0.205},
      {"min": 114750, "max": 158468, "rate": 0.26},
      {"min": 158468, "max": 221708, "rate": 0.29},
      {"min": 221708, "max": null,   "rate": 0.33}
    ],
    "provincialBrackets": [
      {"min": 0,      "max": 52886,  "rate": 0.0505},
      {"min": 52886,  "max": 105775, "rate": 0.0915},
      {"min": 105775, "max": 150000, "rate": 0.1116},
      {"min": 150000, "max": 220000, "rate": 0.1216},
      {"min": 220000, "max": null,   "rate": 0.1316}
    ],
    "federalPersonalAmount":   16129,
    "provincialPersonalAmount": 11865,
    "cppRate": 0.0595,
    "cppMaxContribution": 3867,
    "cppExemption": 3500,
    "eiRate": 0.0163,
    "eiMaxInsurable": 65700,
    "workersCompRate": 2.35
  }'::jsonb,
  NOW()
)
ON CONFLICT (province, tax_year) DO UPDATE
SET rates      = EXCLUDED.rates,
    updated_at = NOW();

COMMIT;
