-- Run this migration MANUALLY in the Supabase SQL editor BEFORE deploying new code.
-- Running after deploy will lock out all existing users (status defaults to 'pending').

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'inactive')),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

-- Backfill: mark all existing users as active
UPDATE users SET status = 'active';

CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
