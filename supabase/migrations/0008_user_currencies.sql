ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS currencies text[] NOT NULL DEFAULT '{}';
