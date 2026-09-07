-- Migration: 0004_add_category_to_transactions
-- IMPORTANT: Run this migration manually in the Supabase Dashboard SQL Editor
-- (or via `supabase db push`) BEFORE deploying the updated application code.

-- Add optional category text column to transactions

alter table public.transactions
  add column if not exists category text;
