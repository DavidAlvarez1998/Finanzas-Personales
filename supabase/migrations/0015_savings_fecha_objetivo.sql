-- Migration: 0015_savings_fecha_objetivo
-- IMPORTANT: Run manually in Supabase Dashboard SQL Editor (or via `supabase db push`)
-- BEFORE deploying the updated application code.

ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS fecha_objetivo date;
