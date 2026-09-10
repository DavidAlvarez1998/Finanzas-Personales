-- Migration: 0007_savings_goals
-- IMPORTANT: Run this migration manually in the Supabase Dashboard SQL Editor
-- (or via `supabase db push`) BEFORE deploying the updated application code.

-- savings_goals
create table public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  nombre         text not null,
  monto_objetivo numeric(14,2) not null check (monto_objetivo > 0),
  currency       text not null default 'COP',
  status         text not null default 'active'
                 check (status in ('active','completed','paused')),
  created_at     timestamptz not null default now()
);

create index on public.savings_goals (user_id, created_at desc);

-- savings_contributions
create table public.savings_contributions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.savings_goals(id) on delete cascade,
  monto      numeric(14,2) not null check (monto > 0),
  fecha      date not null default current_date,
  nota       text,
  created_at timestamptz not null default now()
);

create index on public.savings_contributions (goal_id, fecha desc);

-- RLS (defense-in-depth; service_role bypasses; app-layer enforces)
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;

create policy sg_select on public.savings_goals for select using (user_id = auth.uid());
create policy sg_insert on public.savings_goals for insert with check (user_id = auth.uid());
create policy sg_update on public.savings_goals for update using (user_id = auth.uid());
create policy sg_delete on public.savings_goals for delete using (user_id = auth.uid());

create policy sc_select on public.savings_contributions for select using (
  exists (select 1 from public.savings_goals where id = goal_id and user_id = auth.uid())
);
create policy sc_insert on public.savings_contributions for insert with check (
  exists (select 1 from public.savings_goals where id = goal_id and user_id = auth.uid())
);
create policy sc_delete on public.savings_contributions for delete using (
  exists (select 1 from public.savings_goals where id = goal_id and user_id = auth.uid())
);
