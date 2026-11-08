ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS mes  smallint NOT NULL DEFAULT EXTRACT(MONTH FROM NOW())::smallint,
  ADD COLUMN IF NOT EXISTS anio smallint NOT NULL DEFAULT EXTRACT(YEAR  FROM NOW())::smallint;

ALTER TABLE public.presupuestos
  ADD CONSTRAINT presupuestos_mes_check CHECK (mes BETWEEN 1 AND 12);

CREATE INDEX IF NOT EXISTS presupuestos_user_periodo_idx
  ON public.presupuestos (user_id, anio, mes);
