-- Migration: 0014_debt_due_date
-- IMPORTANT: Run manually in Supabase Dashboard SQL Editor (or via `supabase db push`)
-- BEFORE deploying the updated application code.

ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS due_date date;
