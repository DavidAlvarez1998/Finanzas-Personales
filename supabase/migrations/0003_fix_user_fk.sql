-- Migration: 0003_fix_user_fk
-- Fix user_id FK: was referencing auth.users (Supabase Auth),
-- must reference public.users (app's custom users table).

-- transactions
alter table public.transactions
  drop constraint if exists transactions_user_id_fkey;

alter table public.transactions
  add constraint transactions_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;

-- debts
alter table public.debts
  drop constraint if exists debts_user_id_fkey;

alter table public.debts
  add constraint debts_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;
