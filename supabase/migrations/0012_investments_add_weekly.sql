-- Migration: 0012_investments_add_weekly
-- Adds 'weekly' to the periodo_retorno check constraint on investments.

alter table public.investments
  drop constraint investments_periodo_retorno_check;

alter table public.investments
  add constraint investments_periodo_retorno_check
  check (periodo_retorno in ('weekly','monthly','quarterly','annual','one_time','custom'));
