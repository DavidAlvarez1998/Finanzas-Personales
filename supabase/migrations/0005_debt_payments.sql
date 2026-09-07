-- Migration: 0005_debt_payments
-- IMPORTANT: Run this migration manually in the Supabase Dashboard SQL Editor
-- (or via `supabase db push`) BEFORE deploying the updated application code.

-- New table for tracking partial debt payments

create table public.debt_payments (
  id         uuid primary key default gen_random_uuid(),
  debt_id    uuid not null references public.debts(id) on delete cascade,
  amount     numeric(14,2) not null check (amount > 0),
  paid_at    date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

create index on public.debt_payments (debt_id, paid_at desc);

alter table public.debt_payments enable row level security;

create policy dp_select on public.debt_payments
  for select using (
    exists (select 1 from public.debts where id = debt_id and user_id = auth.uid())
  );

create policy dp_insert on public.debt_payments
  for insert with check (
    exists (select 1 from public.debts where id = debt_id and user_id = auth.uid())
  );

create policy dp_delete on public.debt_payments
  for delete using (
    exists (select 1 from public.debts where id = debt_id and user_id = auth.uid())
  );
