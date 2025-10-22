-- =============================================================================
-- FIX: Comprehensive delete_tenant_complete function
-- =============================================================================
-- This function bypasses RLS and deletes ALL tenant-related data
-- =============================================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS public.delete_tenant_complete(uuid);

-- Recreate with improved implementation
CREATE OR REPLACE FUNCTION public.delete_tenant_complete(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this session
  -- This allows SECURITY DEFINER function to bypass RLS policies
  SET LOCAL session_replication_role = replica;
  
  -- Delete analytics_events
  DELETE FROM public.analytics_events WHERE tenant_id = p_tenant_id;

  -- Delete api_request_logs
  DELETE FROM public.api_request_logs WHERE tenant_id = p_tenant_id;

  -- Delete business_metrics
  DELETE FROM public.business_metrics WHERE tenant_id = p_tenant_id;

  -- Delete booking_holds
  DELETE FROM public.booking_holds WHERE tenant_id = p_tenant_id;

  -- Delete booking_availability_cache
  DELETE FROM public.booking_availability_cache WHERE tenant_id = p_tenant_id;

  -- Delete bookings
  DELETE FROM public.bookings WHERE tenant_id = p_tenant_id;

  -- Delete notification_queue
  DELETE FROM public.notification_queue WHERE tenant_id = p_tenant_id;

  -- Delete api_rate_limits
  DELETE FROM public.api_rate_limits WHERE tenant_id = p_tenant_id;

  -- Delete domain_analytics
  DELETE FROM public.domain_analytics WHERE tenant_id = p_tenant_id;

  -- Delete domain_events
  DELETE FROM public.domain_events WHERE tenant_id = p_tenant_id;

  -- Delete domain_health_checks
  DELETE FROM public.domain_health_checks WHERE tenant_id = p_tenant_id;

  -- Delete dns_records
  DELETE FROM public.dns_records WHERE tenant_id = p_tenant_id;

  -- Delete domains
  DELETE FROM public.domains WHERE tenant_id = p_tenant_id;

  -- Delete tenant_features
  DELETE FROM public.tenant_features WHERE tenant_id = p_tenant_id;

  -- Delete party_size_configs
  DELETE FROM public.party_size_configs WHERE tenant_id = p_tenant_id;

  -- Delete business_hours
  DELETE FROM public.business_hours WHERE tenant_id = p_tenant_id;

  -- Delete restaurant_tables
  DELETE FROM public.restaurant_tables WHERE tenant_id = p_tenant_id;

  -- Delete catering_order_drafts (if exists)
  BEGIN
    DELETE FROM public.catering_order_drafts WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Delete audit_logs for this tenant (if exists)
  BEGIN
    DELETE FROM public.audit_logs WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Delete auto_provisioning records
  DELETE FROM public.auto_provisioning WHERE tenant_id = p_tenant_id;

  -- Finally delete the tenant itself
  DELETE FROM public.tenants WHERE id = p_tenant_id;
  
  RETURN true;

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to delete tenant: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_tenant_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant_complete(uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.delete_tenant_complete(uuid) IS 
'Safely deletes a tenant and all related data. Bypasses RLS using SECURITY DEFINER and session_replication_role.';
