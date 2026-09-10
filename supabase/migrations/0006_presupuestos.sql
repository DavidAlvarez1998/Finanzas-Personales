-- 0006_presupuestos.sql
-- Add presupuestos + presupuesto_items tables (mirrors debts + debt_payments pattern)

create table if not exists public.presupuestos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  nombre      text not null,
  total       numeric(14,2) not null check (total > 0),
  currency    text not null default 'COP',
  created_at  timestamptz not null default now()
);

create index if not exists presupuestos_user_id_idx
  on public.presupuestos(user_id);

create index if not exists presupuestos_user_created_idx
  on public.presupuestos(user_id, created_at desc);

create table if not exists public.presupuesto_items (
  id              uuid primary key default gen_random_uuid(),
  presupuesto_id  uuid not null references public.presupuestos(id) on delete cascade,
  nombre          text not null,
  monto           numeric(14,2) not null check (monto > 0),
  created_at      timestamptz not null default now()
);

create index if not exists presupuesto_items_presupuesto_id_idx
  on public.presupuesto_items(presupuesto_id);
