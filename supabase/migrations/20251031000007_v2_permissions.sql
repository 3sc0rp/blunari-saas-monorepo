-- ============================================================================
-- PROFESSIONAL TENANT PROVISIONING V2 - PART 7: HELPER & PERMISSIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provisioning_status_v2(p_idempotency_key UUID)
RETURNS TABLE(
  status TEXT,
  tenant_id UUID,
  owner_id UUID,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.status, a.tenant_id, a.owner_id, a.error_code, a.error_message,
    a.created_at, a.completed_at, a.duration_ms
  FROM tenant_provisioning_audit_v2 a
  WHERE a.idempotency_key = p_idempotency_key
  ORDER BY a.created_at DESC
  LIMIT 1;
END;
$$;
