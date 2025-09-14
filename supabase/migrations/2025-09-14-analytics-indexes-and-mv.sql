-- Analytics performance indexes and materialized view

-- Safe create: only create if not exists (Postgres 9.6+ supports IF NOT EXISTS for some objects)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_bookings_tenant_created' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_bookings_tenant_created
      ON public.bookings (tenant_id, created_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_catering_orders_tenant_created' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_catering_orders_tenant_created
      ON public.catering_orders (tenant_id, created_at DESC);
  END IF;
END $$;

-- Daily rollups per tenant and widget type
CREATE TABLE IF NOT EXISTS public.widget_analytics_daily (
  tenant_id text NOT NULL,
  widget_type text NOT NULL CHECK (widget_type IN ('booking','catering')),
  day date NOT NULL,
  views integer NOT NULL,
  clicks integer NOT NULL,
  bookings integer NOT NULL,
  revenue numeric(12,2),
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, widget_type, day)
);

-- Optional: initial backfill (bounded by 30 days for safety)
-- Initial backfill intentionally omitted here to avoid coupling to widget_events schema.
-- A separate job or function can populate per-tenant daily rows as needed.


