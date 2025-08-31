-- Fix the remaining functions that don't have search_path set
ALTER FUNCTION public.get_user_admin_role() SET search_path TO 'public';
ALTER FUNCTION public.has_admin_access() SET search_path TO 'public';
ALTER FUNCTION public.log_security_event(text, text, uuid, inet, text, jsonb) SET search_path TO 'public';