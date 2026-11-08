ALTER TABLE public.presupuesto_items
  ADD COLUMN IF NOT EXISTS category text;
