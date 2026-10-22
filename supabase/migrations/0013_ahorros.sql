-- Migration: 0013_ahorros
-- IMPORTANT: Run manually in Supabase Dashboard SQL Editor (or via `supabase db push`)
-- BEFORE deploying the updated application code.

-- ahorro_accounts
create table public.ahorro_accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  nombre     text not null,
  currency   text not null default 'COP',
  status     text not null default 'active'
             check (status in ('active','archived')),
  created_at timestamptz not null default now()
);

create index on public.ahorro_accounts (user_id, created_at desc);

-- ahorro_movimientos
-- NOTE: positive monto = depósito, negative monto = retiro.
-- There is NO check (monto > 0) — negatives are valid and required.
create table public.ahorro_movimientos (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ahorro_accounts(id) on delete cascade,
  monto      numeric(14,2) not null,
  fecha      date not null default current_date,
  nota       text,
  created_at timestamptz not null default now()
);

create index on public.ahorro_movimientos (account_id, fecha desc);

-- RLS (defense-in-depth; service_role bypasses; app-layer enforces)
alter table public.ahorro_accounts enable row level security;
alter table public.ahorro_movimientos enable row level security;

create policy aa_select on public.ahorro_accounts for select using (user_id = auth.uid());
create policy aa_insert on public.ahorro_accounts for insert with check (user_id = auth.uid());
create policy aa_update on public.ahorro_accounts for update using (user_id = auth.uid());
create policy aa_delete on public.ahorro_accounts for delete using (user_id = auth.uid());

create policy am_select on public.ahorro_movimientos for select using (
  exists (select 1 from public.ahorro_accounts where id = account_id and user_id = auth.uid())
);
create policy am_insert on public.ahorro_movimientos for insert with check (
  exists (select 1 from public.ahorro_accounts where id = account_id and user_id = auth.uid())
);
create policy am_delete on public.ahorro_movimientos for delete using (
  exists (select 1 from public.ahorro_accounts where id = account_id and user_id = auth.uid())
);
