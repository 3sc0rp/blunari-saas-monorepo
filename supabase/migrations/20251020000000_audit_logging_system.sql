-- Week 21-22: Audit Logging System - Database Schema
-- Purpose: Comprehensive audit trail for compliance (GDPR, SOC2, HIPAA)
-- Author: AI Agent
-- Date: October 20, 2025

-- =====================================================
-- PART 1: Core Audit Logs Table
-- =====================================================

-- Drop existing audit_logs table if it exists (for clean migration)
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Create audit_logs table with comprehensive activity tracking
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Activity details
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'view', 'export'
  resource_type TEXT NOT NULL, -- e.g., 'booking', 'user', 'payment', 'tenant'
  resource_id UUID, -- ID of the affected resource
  
  -- Change tracking
  old_values JSONB, -- Previous state before change
  new_values JSONB, -- New state after change
  changed_fields TEXT[], -- Array of field names that changed
  
  -- Request context
  ip_address INET, -- Client IP address
  user_agent TEXT, -- Browser/client user agent
  request_id UUID, -- For correlating related actions
  session_id TEXT, -- User session identifier
  
  -- Compliance & security
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')), -- Action severity
  status TEXT CHECK (status IN ('success', 'failure', 'pending')), -- Action result
  error_message TEXT, -- Error details if action failed
  
  -- Additional metadata
  metadata JSONB, -- Flexible field for additional context
  tags TEXT[], -- Tags for categorization (e.g., 'gdpr', 'payment', 'security')
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT audit_logs_action_check CHECK (char_length(action) <= 100),
  CONSTRAINT audit_logs_resource_type_check CHECK (char_length(resource_type) <= 100)
);

-- Add comments for documentation
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (create, update, delete, view, export, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource affected (booking, user, payment, etc.)';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Previous state of the resource before change (JSON)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'New state of the resource after change (JSON)';
COMMENT ON COLUMN public.audit_logs.changed_fields IS 'Array of field names that were modified';
COMMENT ON COLUMN public.audit_logs.severity IS 'Severity level: info, warning, error, critical';
COMMENT ON COLUMN public.audit_logs.status IS 'Action result: success, failure, pending';
COMMENT ON COLUMN public.audit_logs.tags IS 'Tags for categorization and compliance tracking';

-- =====================================================
-- PART 2: Indexes for Performance
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON public.audit_logs(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Time-based queries (most common access pattern)
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX idx_audit_logs_tenant_resource ON public.audit_logs(tenant_id, resource_type, resource_id);
CREATE INDEX idx_audit_logs_user_action ON public.audit_logs(user_id, action, created_at DESC) WHERE user_id IS NOT NULL;

-- Severity and status filtering
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity, created_at DESC) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_audit_logs_status ON public.audit_logs(status, created_at DESC) WHERE status = 'failure';

-- GIN indexes for JSONB and array searches
CREATE INDEX idx_audit_logs_metadata_gin ON public.audit_logs USING GIN(metadata);
CREATE INDEX idx_audit_logs_tags_gin ON public.audit_logs USING GIN(tags);

-- Session and request correlation
CREATE INDEX idx_audit_logs_session_id ON public.audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_audit_logs_request_id ON public.audit_logs(request_id) WHERE request_id IS NOT NULL;

-- =====================================================
-- PART 3: Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for their tenant
CREATE POLICY "Users can view their tenant audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.auto_provisioning
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- Policy: Only admins can insert audit logs (via Edge Functions with service role)
-- Note: Regular users should not directly insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true); -- Enforced by service role key

-- Policy: Audit logs are immutable (no updates or deletes except by service role)
CREATE POLICY "Audit logs are immutable"
  ON public.audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON public.audit_logs
  FOR DELETE
  USING (false);

-- =====================================================
-- PART 4: Helper Functions
-- =====================================================

-- Function: Log an activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_changed_fields TEXT[];
BEGIN
  -- Calculate changed fields if both old and new values provided
  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM (
      SELECT key FROM jsonb_each(p_new_values)
      WHERE p_old_values->key IS DISTINCT FROM p_new_values->key
    ) AS changed;
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    changed_fields,
    ip_address,
    user_agent,
    severity,
    status,
    error_message,
    metadata,
    tags
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    v_changed_fields,
    p_ip_address,
    p_user_agent,
    p_severity,
    p_status,
    p_error_message,
    p_metadata,
    p_tags
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_activity IS 'Log an activity to the audit trail with comprehensive context';

-- Function: Query audit logs with filters
CREATE OR REPLACE FUNCTION public.query_audit_logs(
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  user_id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  severity TEXT,
  status TEXT,
  error_message TEXT,
  metadata JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.tenant_id,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.old_values,
    al.new_values,
    al.changed_fields,
    al.ip_address,
    al.user_agent,
    al.severity,
    al.status,
    al.error_message,
    al.metadata,
    al.tags,
    al.created_at
  FROM public.audit_logs al
  WHERE al.tenant_id = p_tenant_id
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_resource_id IS NULL OR al.resource_id = p_resource_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_severity IS NULL OR al.severity = p_severity)
    AND (p_status IS NULL OR al.status = p_status)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_tags IS NULL OR al.tags && p_tags) -- Array overlap operator
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.query_audit_logs IS 'Query audit logs with comprehensive filters and pagination';

-- Function: Get audit statistics
CREATE OR REPLACE FUNCTION public.get_audit_stats(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  total_activities BIGINT,
  unique_users BIGINT,
  actions_by_type JSONB,
  activities_by_resource JSONB,
  severity_breakdown JSONB,
  status_breakdown JSONB,
  daily_activity JSONB,
  top_users JSONB,
  failed_actions BIGINT,
  critical_events BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total activities
    COUNT(*)::BIGINT AS total_activities,
    
    -- Unique users
    COUNT(DISTINCT al.user_id)::BIGINT AS unique_users,
    
    -- Actions by type
    (
      SELECT jsonb_object_agg(action, count)
      FROM (
        SELECT action, COUNT(*)::INT AS count
        FROM public.audit_logs
        WHERE tenant_id = p_tenant_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      ) actions
    ) AS actions_by_type,
    
    -- Activities by resource type
    (
      SELECT jsonb_object_agg(resource_type, count)
      FROM (
        SELECT resource_type, COUNT(*)::INT AS count
        FROM public.audit_logs
        WHERE tenant_id = p_tenant_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY resource_type
        ORDER BY count DESC
        LIMIT 10
      ) resources
    ) AS activities_by_resource,
    
    -- Severity breakdown
    (
      SELECT jsonb_object_agg(severity, count)
      FROM (
        SELECT 
          COALESCE(severity, 'info') AS severity,
          COUNT(*)::INT AS count
        FROM public.audit_logs
        WHERE tenant_id = p_tenant_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY severity
      ) severities
    ) AS severity_breakdown,
    
    -- Status breakdown
    (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT 
          COALESCE(status, 'success') AS status,
          COUNT(*)::INT AS count
        FROM public.audit_logs
        WHERE tenant_id = p_tenant_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY status
      ) statuses
    ) AS status_breakdown,
    
    -- Daily activity (last 30 days)
    (
      SELECT jsonb_object_agg(date, count)
      FROM (
        SELECT 
          DATE(created_at) AS date,
          COUNT(*)::INT AS count
        FROM public.audit_logs
        WHERE tenant_id = p_tenant_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      ) daily
    ) AS daily_activity,
    
    -- Top users by activity
    (
      SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'count', count))
      FROM (
        SELECT 
          user_id,
          COUNT(*)::INT AS count
        FROM public.audit_logs
        WHERE tenant_id = p_tenant_id
          AND created_at BETWEEN p_start_date AND p_end_date
          AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      ) users
    ) AS top_users,
    
    -- Failed actions count
    COUNT(*) FILTER (WHERE al.status = 'failure')::BIGINT AS failed_actions,
    
    -- Critical events count
    COUNT(*) FILTER (WHERE al.severity = 'critical')::BIGINT AS critical_events
    
  FROM public.audit_logs al
  WHERE al.tenant_id = p_tenant_id
    AND al.created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_audit_stats IS 'Get comprehensive audit statistics for a tenant';

-- Function: Get user activity timeline
CREATE OR REPLACE FUNCTION public.get_user_activity_timeline(
  p_tenant_id UUID,
  p_user_id UUID,
  p_limit INT DEFAULT 50
) RETURNS TABLE (
  id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  severity TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.severity,
    al.status,
    al.created_at,
    al.metadata
  FROM public.audit_logs al
  WHERE al.tenant_id = p_tenant_id
    AND al.user_id = p_user_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_activity_timeline IS 'Get activity timeline for a specific user';

-- Function: Get resource change history
CREATE OR REPLACE FUNCTION public.get_resource_history(
  p_tenant_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_limit INT DEFAULT 50
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  action TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    al.action,
    al.old_values,
    al.new_values,
    al.changed_fields,
    al.created_at
  FROM public.audit_logs al
  WHERE al.tenant_id = p_tenant_id
    AND al.resource_type = p_resource_type
    AND al.resource_id = p_resource_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_resource_history IS 'Get complete change history for a specific resource';

-- =====================================================
-- PART 5: Auto-Logging Triggers
-- =====================================================

-- Generic trigger function for auto-logging changes
CREATE OR REPLACE FUNCTION public.auto_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Get user ID from session
  v_user_id := auth.uid();
  
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_values := to_jsonb(NEW);
    -- Special case: for tenants table, use 'id' as tenant_id
    IF TG_TABLE_NAME = 'tenants' THEN
      v_tenant_id := (v_new_values->>'id')::UUID;
    ELSE
      v_tenant_id := (v_new_values->>'tenant_id')::UUID;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    -- Special case: for tenants table, use 'id' as tenant_id
    IF TG_TABLE_NAME = 'tenants' THEN
      v_tenant_id := (v_new_values->>'id')::UUID;
    ELSE
      v_tenant_id := (v_new_values->>'tenant_id')::UUID;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_values := to_jsonb(OLD);
    -- Special case: for tenants table, use 'id' as tenant_id
    IF TG_TABLE_NAME = 'tenants' THEN
      v_tenant_id := (v_old_values->>'id')::UUID;
    ELSE
      v_tenant_id := (v_old_values->>'tenant_id')::UUID;
    END IF;
  END IF;

  -- Log the activity (async via PERFORM to avoid blocking)
  PERFORM public.log_activity(
    p_tenant_id := v_tenant_id,
    p_user_id := v_user_id,
    p_action := v_action,
    p_resource_type := TG_TABLE_NAME,
    p_resource_id := COALESCE(
      (v_new_values->>'id')::UUID,
      (v_old_values->>'id')::UUID
    ),
    p_old_values := v_old_values,
    p_new_values := v_new_values
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_log_changes IS 'Generic trigger function to auto-log changes on critical tables';

-- Apply triggers to critical tables
-- Note: Add more tables as needed

-- Bookings
DROP TRIGGER IF EXISTS trigger_audit_bookings ON public.bookings;
CREATE TRIGGER trigger_audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_changes();

-- Employees
DROP TRIGGER IF EXISTS trigger_audit_employees ON public.employees;
CREATE TRIGGER trigger_audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_changes();

-- Tenants
DROP TRIGGER IF EXISTS trigger_audit_tenants ON public.tenants;
CREATE TRIGGER trigger_audit_tenants
  AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_changes();

-- Profiles
DROP TRIGGER IF EXISTS trigger_audit_profiles ON public.profiles;
CREATE TRIGGER trigger_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_changes();

-- Restaurants (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurants') THEN
    DROP TRIGGER IF EXISTS trigger_audit_restaurants ON public.restaurants;
    CREATE TRIGGER trigger_audit_restaurants
      AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_log_changes();
  END IF;
END $$;

-- Payments (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    DROP TRIGGER IF EXISTS trigger_audit_payments ON public.payments;
    CREATE TRIGGER trigger_audit_payments
      AFTER INSERT OR UPDATE OR DELETE ON public.payments
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_log_changes();
  END IF;
END $$;

-- RBAC Tables
DROP TRIGGER IF EXISTS trigger_audit_roles ON public.roles;
CREATE TRIGGER trigger_audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_changes();

DROP TRIGGER IF EXISTS trigger_audit_user_roles ON public.user_roles;
CREATE TRIGGER trigger_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_changes();

DROP TRIGGER IF EXISTS trigger_audit_role_permissions ON public.role_permissions;
CREATE TRIGGER trigger_audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_changes();

-- =====================================================
-- PART 6: Retention Policy & Cleanup
-- =====================================================

-- Function: Clean up old audit logs (for GDPR compliance)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  p_retention_days INT DEFAULT 365
) RETURNS BIGINT AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- Delete audit logs older than retention period
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 'Clean up audit logs older than specified retention period';

-- =====================================================
-- PART 7: Compliance Views
-- =====================================================

-- View: GDPR compliance - User data access log
CREATE OR REPLACE VIEW public.gdpr_user_data_access AS
SELECT
  al.tenant_id,
  al.user_id,
  al.action,
  al.resource_type,
  al.resource_id,
  al.ip_address,
  al.created_at,
  CASE
    WHEN al.action IN ('view', 'export') THEN 'data_access'
    WHEN al.action IN ('create', 'update') THEN 'data_modification'
    WHEN al.action = 'delete' THEN 'data_deletion'
    ELSE 'other'
  END AS gdpr_category
FROM public.audit_logs al
WHERE al.tags && ARRAY['gdpr']
  OR al.action IN ('view', 'export', 'delete');

COMMENT ON VIEW public.gdpr_user_data_access IS 'GDPR compliance view for user data access tracking';

-- View: Security events
-- Drop the old table if it exists (from previous migrations)
DROP TABLE IF EXISTS public.security_events CASCADE;

CREATE OR REPLACE VIEW public.security_events AS
SELECT
  al.id,
  al.tenant_id,
  al.user_id,
  al.action,
  al.resource_type,
  al.severity,
  al.status,
  al.ip_address,
  al.created_at,
  al.metadata
FROM public.audit_logs al
WHERE al.severity IN ('error', 'critical')
  OR al.tags && ARRAY['security']
  OR al.status = 'failure';

COMMENT ON VIEW public.security_events IS 'View of security-related events for compliance monitoring';

-- View: Failed login attempts (requires auth tracking)
CREATE OR REPLACE VIEW public.failed_authentication_attempts AS
SELECT
  al.tenant_id,
  al.user_id,
  al.ip_address,
  al.user_agent,
  al.created_at,
  al.error_message,
  al.metadata
FROM public.audit_logs al
WHERE al.action = 'login'
  AND al.status = 'failure';

COMMENT ON VIEW public.failed_authentication_attempts IS 'Track failed authentication attempts for security monitoring';

-- =====================================================
-- PART 8: Performance Optimization
-- =====================================================

-- Partitioning setup (for future scalability)
-- Note: Enable if audit logs grow > 10M records
-- This is commented out for initial deployment but can be enabled later

/*
-- Create parent table for partitioning
CREATE TABLE public.audit_logs_partitioned (
  LIKE public.audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (example for 2025)
CREATE TABLE public.audit_logs_2025_10 PARTITION OF public.audit_logs_partitioned
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE public.audit_logs_2025_11 PARTITION OF public.audit_logs_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Auto-create partitions with pg_partman extension
CREATE EXTENSION IF NOT EXISTS pg_partman;
*/

-- =====================================================
-- PART 9: Grant Permissions
-- =====================================================

-- Grant permissions to authenticated users (via RLS)
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.gdpr_user_data_access TO authenticated;
GRANT SELECT ON public.security_events TO authenticated;
GRANT SELECT ON public.failed_authentication_attempts TO authenticated;

-- Service role gets full access (for Edge Functions)
GRANT ALL ON public.audit_logs TO service_role;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Insert initial audit log entry
DO $$
DECLARE
  v_system_tenant_id UUID;
BEGIN
  -- Get or create system tenant for migration logs
  SELECT id INTO v_system_tenant_id FROM public.tenants LIMIT 1;
  
  IF v_system_tenant_id IS NOT NULL THEN
    PERFORM public.log_activity(
      p_tenant_id := v_system_tenant_id,
      p_user_id := NULL,
      p_action := 'migration',
      p_resource_type := 'system',
      p_resource_id := NULL,
      p_severity := 'info',
      p_status := 'success',
      p_metadata := jsonb_build_object(
        'migration', '20251020000000_audit_logging_system',
        'description', 'Audit logging system initialized',
        'features', jsonb_build_array(
          'audit_logs table with comprehensive tracking',
          'auto-logging triggers on critical tables',
          'helper functions for querying and statistics',
          'GDPR compliance views',
          'security event monitoring'
        )
      ),
      p_tags := ARRAY['system', 'migration', 'audit']
    );
  END IF;
END $$;
