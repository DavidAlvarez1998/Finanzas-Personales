-- Migration: 0000_users
-- Custom users table (app uses its own auth, not Supabase Auth)

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
