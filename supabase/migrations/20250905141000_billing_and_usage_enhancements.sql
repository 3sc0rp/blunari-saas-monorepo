-- Billing invoices cache + basic usage index improvements

CREATE TABLE IF NOT EXISTS tenant_invoices_cache (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_invoice_id text PRIMARY KEY,
  status text NOT NULL,
  amount_due numeric,
  amount_paid numeric,
  currency text,
  hosted_invoice_url text,
  pdf_url text,
  issued_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_cache_tenant ON tenant_invoices_cache(tenant_id, issued_at DESC);

-- Helpful index for bookings aggregation by tenant & time
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_time ON bookings(tenant_id, booking_time DESC);
