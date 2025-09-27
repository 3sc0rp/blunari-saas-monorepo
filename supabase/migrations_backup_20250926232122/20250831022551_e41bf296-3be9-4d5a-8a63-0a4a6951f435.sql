-- Final security fixes based on linter results

-- Security Fix: Remove any remaining security definer views
-- Check for and remove any views with SECURITY DEFINER
DO $$
DECLARE
    view_name text;
BEGIN
    -- Find and drop any security definer views
    FOR view_name IN
        SELECT schemaname||'.'||viewname
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition LIKE '%SECURITY DEFINER%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_name || ' CASCADE';
    END LOOP;
END $$;

-- Security Fix: Add SET search_path to remaining functions that need it
-- Find functions without proper search_path settings and fix them

CREATE OR REPLACE FUNCTION public.has_admin_access()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role IN ('admin', 'super_admin')
  );
END;
$function$;

-- Update any other functions that might be missing search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired codes as expired
    UPDATE public.password_reset_codes
    SET status = 'expired'
    WHERE expires_at < now() AND status = 'pending';
    
    -- Delete codes older than 24 hours
    DELETE FROM public.password_reset_codes
    WHERE created_at < now() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old rate limit records (older than 24 hours)
    DELETE FROM public.password_reset_rate_limits
    WHERE created_at < now() - INTERVAL '24 hours';
    
    -- Clean up old audit logs (older than 30 days)
    DELETE FROM public.password_reset_audit_log
    WHERE created_at < now() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_reset_rate_limit(p_email text, p_ip_address inet DEFAULT NULL::inet)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    rate_limit_record RECORD;
    current_window TIMESTAMPTZ;
    max_attempts INTEGER := 3;
    window_duration INTERVAL := '1 hour';
    lockout_duration INTERVAL := '1 hour';
BEGIN
    current_window := date_trunc('hour', now());
    
    -- Check if account is currently locked
    SELECT * INTO rate_limit_record
    FROM public.password_reset_rate_limits
    WHERE email = p_email
    AND (locked_until IS NULL OR locked_until > now())
    ORDER BY updated_at DESC
    LIMIT 1;
    
    -- If locked, return lock info
    IF rate_limit_record.locked_until IS NOT NULL AND rate_limit_record.locked_until > now() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'account_locked',
            'locked_until', rate_limit_record.locked_until,
            'attempts_remaining', 0
        );
    END IF;
    
    -- Check current window attempts
    IF rate_limit_record.window_start >= current_window THEN
        -- Same window, check attempts
        IF rate_limit_record.attempts >= max_attempts THEN
            -- Lock the account
            UPDATE public.password_reset_rate_limits
            SET locked_until = now() + lockout_duration,
                updated_at = now()
            WHERE id = rate_limit_record.id;
            
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'rate_limited',
                'locked_until', now() + lockout_duration,
                'attempts_remaining', 0
            );
        ELSE
            -- Increment attempts
            UPDATE public.password_reset_rate_limits
            SET attempts = attempts + 1,
                updated_at = now()
            WHERE id = rate_limit_record.id;
            
            RETURN jsonb_build_object(
                'allowed', true,
                'attempts_remaining', max_attempts - (rate_limit_record.attempts + 1)
            );
        END IF;
    ELSE
        -- New window, reset or create record
        INSERT INTO public.password_reset_rate_limits (email, ip_address, attempts, window_start)
        VALUES (p_email, p_ip_address, 1, current_window)
        ON CONFLICT DO NOTHING;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'attempts_remaining', max_attempts - 1
        );
    END IF;
END;
$function$;

-- Add security monitoring trigger to track any remaining security definer usage
CREATE OR REPLACE FUNCTION public.log_security_definer_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log any access to security-sensitive operations
  PERFORM public.log_security_event(
    'security_definer_function_accessed',
    'info',
    auth.uid(),
    NULL,
    NULL::inet,
    NULL,
    jsonb_build_object(
      'function_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;