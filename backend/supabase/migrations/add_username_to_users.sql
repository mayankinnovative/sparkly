-- =============================================
-- Sparkly: Add username field to users table
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Add username column (nullable first)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Step 2: Populate existing users with usernames
UPDATE users SET username = 'admin_sparkly' WHERE email = 'admin@sparkly.ca';
UPDATE users SET username = 'marie_tremblay' WHERE email = 'owner@sparklyclean.ca';
UPDATE users SET username = 'sophie_tremblay' WHERE email = 'sophie@sparklyclean.ca';
UPDATE users SET username = 'marc_gagnon' WHERE email = 'marc@sparklyclean.ca';
UPDATE users SET username = 'james_wilson' WHERE email = 'owner@cleantracktoronto.ca';
UPDATE users SET username = 'emily_carter' WHERE email = 'emily@cleantracktoronto.ca';
UPDATE users SET username = 'noah_wilson' WHERE email = 'noah@cleantracktoronto.ca';

-- Fallback: assign username from email prefix for any users not covered above
UPDATE users SET username = REPLACE(SPLIT_PART(email, '@', 1), '.', '_') WHERE username IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Step 4: Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);
