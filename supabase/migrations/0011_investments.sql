-- Migration: 0011_investments
-- IMPORTANT: Run this migration manually in the Supabase Dashboard SQL Editor
-- (or via `supabase db push`) BEFORE deploying the updated application code.

-- investments
create table public.investments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  nombre            text not null,
  descripcion       text,
  principal         numeric(14,2) not null check (principal > 0),
  currency          text not null default 'COP',
  fecha_inicio      date not null default current_date,
  fecha_vencimiento date,
  tasa_esperada     numeric(6,4),
  periodo_retorno   text not null default 'monthly'
                    check (periodo_retorno in ('monthly','quarterly','annual','one_time','custom')),
  status            text not null default 'active'
                    check (status in ('active','completed','withdrawn')),
  created_at        timestamptz not null default now()
);

create index on public.investments (user_id, created_at desc);

-- investment_returns
create table public.investment_returns (
  id            uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments(id) on delete cascade,
  monto         numeric(14,2) not null check (monto > 0),
  fecha         date not null default current_date,
  nota          text,
  created_at    timestamptz not null default now()
);

create index on public.investment_returns (investment_id, fecha desc);

-- RLS (defense-in-depth; service_role bypasses; app-layer enforces)
alter table public.investments enable row level security;
alter table public.investment_returns enable row level security;

create policy inv_select on public.investments for select using (user_id = auth.uid());
create policy inv_insert on public.investments for insert with check (user_id = auth.uid());
create policy inv_update on public.investments for update using (user_id = auth.uid());
create policy inv_delete on public.investments for delete using (user_id = auth.uid());

create policy ir_select on public.investment_returns for select using (
  exists (select 1 from public.investments where id = investment_id and user_id = auth.uid())
);
create policy ir_insert on public.investment_returns for insert with check (
  exists (select 1 from public.investments where id = investment_id and user_id = auth.uid())
);
create policy ir_delete on public.investment_returns for delete using (
  exists (select 1 from public.investments where id = investment_id and user_id = auth.uid())
);
