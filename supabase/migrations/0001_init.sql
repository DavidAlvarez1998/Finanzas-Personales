-- Migration: 0001_init
-- Tables: transactions, debts
-- RLS: per-operation policies scoped to auth.uid() = user_id

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  description text not null,
  income      numeric(12,2),
  expense     numeric(12,2),
  created_at  timestamptz not null default now(),
  constraint check_income_or_expense check (
    (income is not null and expense is null) or
    (expense is not null and income is null)
  )
);

create index on public.transactions (user_id, date desc);

create table public.debts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount      numeric(14,2) not null,
  currency    text not null default 'ARS',
  created_at  timestamptz not null default now()
);

create index on public.debts (user_id, created_at desc);

-- Enable RLS
alter table public.transactions enable row level security;
alter table public.debts        enable row level security;

-- Transactions policies (per-operation, not a single "for all")
create policy tx_select on public.transactions
  for select using (auth.uid() = user_id);

create policy tx_insert on public.transactions
  for insert with check (auth.uid() = user_id);

create policy tx_update on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy tx_delete on public.transactions
  for delete using (auth.uid() = user_id);

-- Debts policies
create policy debts_select on public.debts
  for select using (auth.uid() = user_id);

create policy debts_insert on public.debts
  for insert with check (auth.uid() = user_id);

create policy debts_update on public.debts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy debts_delete on public.debts
  for delete using (auth.uid() = user_id);
