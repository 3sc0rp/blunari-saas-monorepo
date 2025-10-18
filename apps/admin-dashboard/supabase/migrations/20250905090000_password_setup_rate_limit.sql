-- Password setup link issuance rate limiting support
-- Creates a dedicated table and a function that atomically enforces limits

BEGIN;

CREATE TABLE IF NOT EXISTS password_setup_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode in ('invite','recovery')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful index for recent lookups
CREATE INDEX IF NOT EXISTS idx_password_setup_link_events_tenant_created ON password_setup_link_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_setup_link_events_admin_created ON password_setup_link_events(admin_user_id, created_at DESC);

-- Atomic function to record an event and return current counts + limit state
CREATE OR REPLACE FUNCTION record_password_setup_link_event(p_tenant uuid, p_admin uuid, p_mode text)
RETURNS TABLE(
  tenant_count int,
  tenant_limit int,
  tenant_window_seconds int,
  admin_count int,
  admin_limit int,
  admin_window_seconds int,
  limited boolean,
  limited_reason text
) LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_limit int := 3; -- per 30 minutes
  v_tenant_window interval := interval '30 minutes';
  v_admin_limit int := 5; -- per hour
  v_admin_window interval := interval '60 minutes';
  v_now timestamptz := now();
  v_tenant_count int;
  v_admin_count int;
  v_limited boolean := false;
  v_reason text := null;
BEGIN
  INSERT INTO password_setup_link_events(tenant_id, admin_user_id, mode)
  VALUES (p_tenant, p_admin, p_mode);

  SELECT count(*) INTO v_tenant_count
  FROM password_setup_link_events
  WHERE tenant_id = p_tenant
    AND created_at >= v_now - v_tenant_window;

  SELECT count(*) INTO v_admin_count
  FROM password_setup_link_events
  WHERE admin_user_id = p_admin
    AND created_at >= v_now - v_admin_window;

  IF v_tenant_count > v_tenant_limit THEN
    v_limited := true;
    v_reason := 'Tenant limit exceeded';
  ELSIF v_admin_count > v_admin_limit THEN
    v_limited := true;
    v_reason := 'Admin limit exceeded';
  END IF;

  RETURN QUERY SELECT
    v_tenant_count,
    v_tenant_limit,
    extract(epoch from v_tenant_window)::int,
    v_admin_count,
    v_admin_limit,
    extract(epoch from v_admin_window)::int,
    v_limited,
    v_reason;
END;
$$;

COMMENT ON TABLE password_setup_link_events IS 'Tracks issuance of password setup (invite/recovery) links for rate limiting';
COMMENT ON FUNCTION record_password_setup_link_event IS 'Atomically records a password setup link issuance and returns counts and limit status';

COMMIT;
