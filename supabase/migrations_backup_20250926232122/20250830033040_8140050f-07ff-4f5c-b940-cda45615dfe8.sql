-- Create a function to safely delete tenants with all related data
CREATE OR REPLACE FUNCTION public.delete_tenant_complete(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all related data in proper order
  DELETE FROM public.analytics_events WHERE tenant_id = p_tenant_id;
  DELETE FROM public.api_request_logs WHERE tenant_id = p_tenant_id;
  DELETE FROM public.business_metrics WHERE tenant_id = p_tenant_id;
  DELETE FROM public.booking_holds WHERE tenant_id = p_tenant_id;
  DELETE FROM public.booking_availability_cache WHERE tenant_id = p_tenant_id;
  DELETE FROM public.bookings WHERE tenant_id = p_tenant_id;
  DELETE FROM public.notification_queue WHERE tenant_id = p_tenant_id;
  DELETE FROM public.api_rate_limits WHERE tenant_id = p_tenant_id;
  DELETE FROM public.domain_analytics WHERE tenant_id = p_tenant_id;
  DELETE FROM public.domain_events WHERE tenant_id = p_tenant_id;
  DELETE FROM public.domain_health_checks WHERE tenant_id = p_tenant_id;
  DELETE FROM public.dns_records WHERE tenant_id = p_tenant_id;
  DELETE FROM public.domains WHERE tenant_id = p_tenant_id;
  DELETE FROM public.tenant_features WHERE tenant_id = p_tenant_id;
  DELETE FROM public.party_size_configs WHERE tenant_id = p_tenant_id;
  DELETE FROM public.business_hours WHERE tenant_id = p_tenant_id;
  DELETE FROM public.restaurant_tables WHERE tenant_id = p_tenant_id;
  
  -- Delete auto_provisioning records
  DELETE FROM public.auto_provisioning WHERE tenant_id = p_tenant_id;
  
  -- Finally delete the tenant
  DELETE FROM public.tenants WHERE id = p_tenant_id;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to delete tenant: %', SQLERRM;
END;
$$;