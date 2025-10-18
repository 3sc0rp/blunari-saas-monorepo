-- Fix remaining function search path warnings
-- First let's check what functions need fixing by looking at existing ones
-- Update functions that may not have search_path set

-- Check if we need to fix other functions from the existing codebase
ALTER FUNCTION public.provision_tenant(uuid, text, text, text, text, text, text, text, text, jsonb, uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_current_user_tenant_id() SET search_path TO 'public';
ALTER FUNCTION public.strict_tenant_access_check(uuid) SET search_path TO 'public';