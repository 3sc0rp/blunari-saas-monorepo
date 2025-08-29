-- Fix remaining function search_path issues
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.get_user_tenant(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_current_user_tenant_id() SET search_path TO 'public';
ALTER FUNCTION public.user_has_tenant_access(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_current_employee() SET search_path TO 'public';
ALTER FUNCTION public.has_employee_role(employee_role) SET search_path TO 'public';
ALTER FUNCTION public.log_employee_activity(text, text, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.record_system_metric(text, numeric, text, text, text, integer, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.check_alert_conditions(text, numeric) SET search_path TO 'public';
ALTER FUNCTION public.aggregate_performance_trends() SET search_path TO 'public';
ALTER FUNCTION public.check_service_health(uuid) SET search_path TO 'public';
ALTER FUNCTION public.verify_domain(uuid, boolean) SET search_path TO 'public';
ALTER FUNCTION public.create_health_incident(uuid, text, integer) SET search_path TO 'public';
ALTER FUNCTION public.calculate_sla_metrics(uuid, timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.process_pos_event(uuid, text, jsonb, text) SET search_path TO 'public';
ALTER FUNCTION public.update_pos_integration_health(uuid, text, text) SET search_path TO 'public';
ALTER FUNCTION public.sync_pos_menu_item(uuid, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.add_domain(uuid, text, domain_type) SET search_path TO 'public';
ALTER FUNCTION public.update_ssl_certificate(uuid, text, timestamp with time zone, ssl_status) SET search_path TO 'public';
ALTER FUNCTION public.check_ssl_expiration() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path TO 'public';
ALTER FUNCTION public.hash_api_key(text) SET search_path TO 'public';
ALTER FUNCTION public.update_api_keys_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.generate_ticket_number() SET search_path TO 'public';
ALTER FUNCTION public.set_ticket_number() SET search_path TO 'public';
ALTER FUNCTION public.log_role_change() SET search_path TO 'public';
ALTER FUNCTION public.validate_role_assignment(employee_role, employee_role) SET search_path TO 'public';

-- Set search_path for newly created functions
ALTER FUNCTION public.validate_role_change() SET search_path TO 'public';
ALTER FUNCTION public.validate_profile_update() SET search_path TO 'public';
ALTER FUNCTION public.validate_tenant_access(uuid) SET search_path TO 'public';
ALTER FUNCTION public.audit_sensitive_operations() SET search_path TO 'public';