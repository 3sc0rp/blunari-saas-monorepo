-- Fix RLS policy for password_reset_codes table to allow edge function access
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Service role access only" ON public.password_reset_codes;

-- Create proper policy that allows service role access
CREATE POLICY "Service role can manage reset codes" 
ON public.password_reset_codes 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Also allow authenticated users to view their own reset attempts for transparency
CREATE POLICY "Users can view their own reset codes" 
ON public.password_reset_codes 
FOR SELECT 
TO authenticated 
USING (email = auth.email());

-- Ensure the same fix for other password reset related tables
DROP POLICY IF EXISTS "Service role access only" ON public.password_reset_rate_limits;
CREATE POLICY "Service role can manage rate limits" 
ON public.password_reset_rate_limits 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access only" ON public.password_reset_audit_log;
CREATE POLICY "Service role can manage audit log" 
ON public.password_reset_audit_log 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);