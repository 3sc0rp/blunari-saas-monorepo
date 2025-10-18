-- Fix function search path warnings by adding SET search_path
ALTER FUNCTION public.cleanup_expired_reset_codes() SET search_path TO 'public';
ALTER FUNCTION public.check_reset_rate_limit(TEXT, INET) SET search_path TO 'public';
ALTER FUNCTION public.hash_reset_code(TEXT, TEXT) SET search_path TO 'public';