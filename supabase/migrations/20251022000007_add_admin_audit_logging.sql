-- =============================================================================
-- P1 FIX: Add Comprehensive Admin Action Audit Logging
-- =============================================================================
-- Tracks all administrative actions for security and compliance
-- =============================================================================

-- Create admin actions audit table
CREATE TABLE IF NOT EXISTS public.admin_actions_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,  -- 'TENANT_PROVISION', 'TENANT_DELETE', 'CREDENTIAL_UPDATE', etc.
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  performed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  request_data jsonb,  -- Input parameters
  result_data jsonb,   -- Output/result
  success boolean NOT NULL,
  error_message text,
  correlation_id text,  -- Links to Edge Function correlation IDs
  duration_ms integer,  -- Operation duration in milliseconds
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_tenant ON public.admin_actions_audit(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON public.admin_actions_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_audit_timestamp ON public.admin_actions_audit(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action_type ON public.admin_actions_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_correlation_id ON public.admin_actions_audit(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_audit_success ON public.admin_actions_audit(success, performed_at DESC);

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_request_data ON public.admin_actions_audit USING gin(request_data);
CREATE INDEX IF NOT EXISTS idx_admin_audit_result_data ON public.admin_actions_audit USING gin(result_data);

-- Add comments
COMMENT ON TABLE public.admin_actions_audit IS 
'Comprehensive audit log of all administrative actions performed in the system. Used for security monitoring, compliance, and debugging.';

COMMENT ON COLUMN public.admin_actions_audit.action_type IS 
'Type of action: TENANT_PROVISION, TENANT_DELETE, TENANT_UPDATE, CREDENTIAL_UPDATE_EMAIL, CREDENTIAL_UPDATE_PASSWORD, FEATURE_TOGGLE, etc.';

COMMENT ON COLUMN public.admin_actions_audit.correlation_id IS 
'Correlation ID from Edge Functions for tracing across distributed systems';

-- Create helper function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type text,
  p_tenant_id uuid,
  p_performed_by uuid,
  p_request_data jsonb,
  p_result_data jsonb,
  p_success boolean,
  p_error_message text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO public.admin_actions_audit (
    action_type,
    tenant_id,
    performed_by,
    request_data,
    result_data,
    success,
    error_message,
    correlation_id,
    duration_ms,
    ip_address,
    user_agent
  ) VALUES (
    p_action_type,
    p_tenant_id,
    p_performed_by,
    p_request_data,
    p_result_data,
    p_success,
    p_error_message,
    p_correlation_id,
    p_duration_ms,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT ON public.admin_actions_audit TO service_role;
GRANT SELECT ON public.admin_actions_audit TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO service_role;

-- Add RLS policies
ALTER TABLE public.admin_actions_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.admin_actions_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND role IN ('ADMIN', 'SUPER_ADMIN')
    AND status = 'ACTIVE'
  )
);

-- Policy: Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON public.admin_actions_audit
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create view for recent admin activity
CREATE OR REPLACE VIEW admin_activity_summary AS
SELECT 
  a.id,
  a.action_type,
  t.name as tenant_name,
  t.slug as tenant_slug,
  p.email as performed_by_email,
  e.role as admin_role,
  a.performed_at,
  a.success,
  a.error_message,
  a.duration_ms,
  a.correlation_id
FROM admin_actions_audit a
LEFT JOIN tenants t ON a.tenant_id = t.id
LEFT JOIN profiles p ON a.performed_by = p.user_id
LEFT JOIN employees e ON a.performed_by = e.user_id AND e.status = 'ACTIVE'
ORDER BY a.performed_at DESC
LIMIT 100;

-- Grant view access to admins
GRANT SELECT ON admin_activity_summary TO authenticated;

-- Create policy for view
CREATE POLICY "Admins can view activity summary"
ON admin_activity_summary
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND role IN ('ADMIN', 'SUPER_ADMIN')
    AND status = 'ACTIVE'
  )
);

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_actions_audit'
) as table_exists;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'admin_actions_audit'
ORDER BY indexname;

-- Check function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'log_admin_action';

-- Check view exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_activity_summary'
) as view_exists;

-- =============================================================================
-- Usage Examples
-- =============================================================================

/*
-- Example 1: Log tenant provisioning
SELECT log_admin_action(
  'TENANT_PROVISION',
  'tenant-uuid-here',
  auth.uid(),
  '{"name": "New Restaurant", "slug": "new-restaurant"}',
  '{"tenant_id": "tenant-uuid", "slug": "new-restaurant"}',
  true,
  NULL,
  'correlation-id-from-edge-function',
  1234,
  '192.168.1.1'::inet,
  'Mozilla/5.0...'
);

-- Example 2: Log failed credential update
SELECT log_admin_action(
  'CREDENTIAL_UPDATE_EMAIL',
  'tenant-uuid-here',
  auth.uid(),
  '{"newEmail": "new@email.com"}',
  NULL,
  false,
  'Email already exists',
  'correlation-id',
  456
);

-- Example 3: Query recent tenant deletions
SELECT 
  performed_at,
  performed_by_email,
  tenant_name,
  success,
  error_message
FROM admin_activity_summary
WHERE action_type = 'TENANT_DELETE'
ORDER BY performed_at DESC
LIMIT 10;

-- Example 4: Find all actions by specific admin
SELECT 
  action_type,
  tenant_name,
  performed_at,
  success
FROM admin_activity_summary
WHERE performed_by_email = 'admin@example.com'
ORDER BY performed_at DESC;

-- Example 5: Get failure rate by action type
SELECT 
  action_type,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE success = false) as failures,
  ROUND(
    (COUNT(*) FILTER (WHERE success = false)::numeric / COUNT(*)::numeric) * 100, 
    2
  ) as failure_rate_percent
FROM admin_actions_audit
WHERE performed_at > NOW() - INTERVAL '7 days'
GROUP BY action_type
ORDER BY failure_rate_percent DESC;
*/

-- =============================================================================
-- Data Retention Policy (Recommended)
-- =============================================================================

-- Create function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Option 1: Delete logs older than 1 year
  DELETE FROM public.admin_actions_audit
  WHERE performed_at < NOW() - INTERVAL '1 year';
  
  -- Option 2: Move to archive table (implement as needed)
  -- INSERT INTO admin_actions_audit_archive
  -- SELECT * FROM admin_actions_audit
  -- WHERE performed_at < NOW() - INTERVAL '1 year';
  
  RAISE NOTICE 'Archived audit logs older than 1 year';
END;
$$;

/*
-- Set up monthly archival (using pg_cron)
SELECT cron.schedule(
  'archive-audit-logs',
  '0 0 1 * *',  -- Run on 1st of each month at midnight
  $$SELECT archive_old_audit_logs()$$
);
*/

-- =============================================================================
-- Alert Triggers (Optional - for suspicious activity)
-- =============================================================================

-- Function to detect suspicious patterns
CREATE OR REPLACE FUNCTION check_suspicious_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent_failures integer;
BEGIN
  -- Check for multiple failures in short time
  IF NOT NEW.success THEN
    SELECT COUNT(*) INTO v_recent_failures
    FROM admin_actions_audit
    WHERE performed_by = NEW.performed_by
    AND action_type = NEW.action_type
    AND success = false
    AND performed_at > NOW() - INTERVAL '5 minutes';
    
    IF v_recent_failures >= 5 THEN
      -- Log to security events or send notification
      RAISE WARNING 'Suspicious activity detected: User % has % failed % attempts', 
        NEW.performed_by, v_recent_failures, NEW.action_type;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_suspicious_activity
AFTER INSERT ON public.admin_actions_audit
FOR EACH ROW
EXECUTE FUNCTION check_suspicious_activity();

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- ✅ admin_actions_audit table created with comprehensive indexes
-- ✅ log_admin_action helper function created
-- ✅ admin_activity_summary view for easy querying
-- ✅ RLS policies for admin-only access
-- ✅ Suspicious activity detection trigger
-- ✅ Archive function for data retention
-- ✅ Ready for Edge Function integration
-- =============================================================================
