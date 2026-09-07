-- Migration: 0002
-- Add currency column to transactions (default COP for existing rows)

alter table public.transactions
  add column if not exists currency text not null default 'COP';
