-- Enhance record_password_setup_link_event to return more metadata and remaining quotas
BEGIN;

CREATE OR REPLACE FUNCTION record_password_setup_link_event(p_tenant uuid, p_admin uuid, p_mode text)
RETURNS TABLE(
  tenant_count int,
  tenant_limit int,
  tenant_window_seconds int,
  tenant_remaining int,
  admin_count int,
  admin_limit int,
  admin_window_seconds int,
  admin_remaining int,
  last_event_at timestamptz,
  earliest_window_event_at timestamptz,
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
  v_last_event timestamptz;
  v_earliest_tenant timestamptz;
  v_earliest_admin timestamptz;
BEGIN
  INSERT INTO password_setup_link_events(tenant_id, admin_user_id, mode)
  VALUES (p_tenant, p_admin, p_mode);

  -- Tenant counts & window stats
  SELECT count(*), max(created_at), min(created_at) INTO v_tenant_count, v_last_event, v_earliest_tenant
  FROM password_setup_link_events
  WHERE tenant_id = p_tenant
    AND created_at >= v_now - v_tenant_window;

  -- Admin counts & earliest
  SELECT count(*), min(created_at) INTO v_admin_count, v_earliest_admin
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
    GREATEST(v_tenant_limit - v_tenant_count, 0),
    v_admin_count,
    v_admin_limit,
    extract(epoch from v_admin_window)::int,
    GREATEST(v_admin_limit - v_admin_count, 0),
    v_last_event,
    LEAST(COALESCE(v_earliest_tenant, v_now), COALESCE(v_earliest_admin, v_now)),
    v_limited,
    v_reason;
END;
$$;

-- Optional read-only function to inspect current rate state without recording
CREATE OR REPLACE FUNCTION get_password_setup_rate_state(p_tenant uuid, p_admin uuid)
RETURNS TABLE(
  tenant_count int,
  tenant_limit int,
  tenant_window_seconds int,
  tenant_remaining int,
  admin_count int,
  admin_limit int,
  admin_window_seconds int,
  admin_remaining int,
  last_event_at timestamptz,
  earliest_window_event_at timestamptz,
  limited boolean,
  limited_reason text
) LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_limit int := 3;
  v_tenant_window interval := interval '30 minutes';
  v_admin_limit int := 5;
  v_admin_window interval := interval '60 minutes';
  v_now timestamptz := now();
  v_tenant_count int;
  v_admin_count int;
  v_last_event timestamptz;
  v_earliest_tenant timestamptz;
  v_earliest_admin timestamptz;
  v_limited boolean := false;
  v_reason text := null;
BEGIN
  SELECT count(*), max(created_at), min(created_at) INTO v_tenant_count, v_last_event, v_earliest_tenant
  FROM password_setup_link_events
  WHERE tenant_id = p_tenant
    AND created_at >= v_now - v_tenant_window;

  SELECT count(*), min(created_at) INTO v_admin_count, v_earliest_admin
  FROM password_setup_link_events
  WHERE admin_user_id = p_admin
    AND created_at >= v_now - v_admin_window;

  IF v_tenant_count >= v_tenant_limit THEN
    v_limited := true; v_reason := 'Tenant limit exceeded';
  ELSIF v_admin_count >= v_admin_limit THEN
    v_limited := true; v_reason := 'Admin limit exceeded';
  END IF;

  RETURN QUERY SELECT
    v_tenant_count,
    v_tenant_limit,
    extract(epoch from v_tenant_window)::int,
    GREATEST(v_tenant_limit - v_tenant_count, 0),
    v_admin_count,
    v_admin_limit,
    extract(epoch from v_admin_window)::int,
    GREATEST(v_admin_limit - v_admin_count, 0),
    v_last_event,
    LEAST(COALESCE(v_earliest_tenant, v_now), COALESCE(v_earliest_admin, v_now)),
    v_limited,
    v_reason;
END;
$$;

COMMIT;
