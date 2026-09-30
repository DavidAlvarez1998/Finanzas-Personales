-- Migration: add password reset columns to users
-- Run manually in Supabase SQL editor before deploying the password-reset feature.
-- Safe to run before code deploy: columns are nullable and additive.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_reset_token_idx
  ON users (reset_token)
  WHERE reset_token IS NOT NULL;
