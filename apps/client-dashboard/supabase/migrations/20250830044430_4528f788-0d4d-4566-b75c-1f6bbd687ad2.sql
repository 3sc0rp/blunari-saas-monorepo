-- Fix remaining function search path warnings
-- These are likely related to functions we've created but haven't set search_path on yet

-- Find and fix any functions without search_path set
-- Update the hash_reset_code function search path
ALTER FUNCTION public.hash_reset_code(text, text) SET search_path TO 'public';

-- Update cleanup function if it exists
ALTER FUNCTION public.cleanup_expired_reset_codes() SET search_path TO 'public';

-- Update rate limit check function
ALTER FUNCTION public.check_reset_rate_limit(text, inet) SET search_path TO 'public';