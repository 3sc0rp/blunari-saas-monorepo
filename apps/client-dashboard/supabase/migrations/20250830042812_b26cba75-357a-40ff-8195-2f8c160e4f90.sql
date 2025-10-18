-- Create enum for reset attempt status
CREATE TYPE public.reset_attempt_status AS ENUM ('pending', 'used', 'expired', 'failed');

-- Create password reset codes table
CREATE TABLE public.password_reset_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status reset_attempt_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at TIMESTAMPTZ NULL
);

-- Create indexes for performance
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes(expires_at);
CREATE INDEX idx_password_reset_codes_status ON public.password_reset_codes(status);

-- Create rate limiting table
CREATE TABLE public.password_reset_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    attempts INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for rate limiting
CREATE INDEX idx_reset_rate_limits_email ON public.password_reset_rate_limits(email);
CREATE INDEX idx_reset_rate_limits_ip ON public.password_reset_rate_limits(ip_address);
CREATE INDEX idx_reset_rate_limits_window ON public.password_reset_rate_limits(window_start);

-- Create security audit log table
CREATE TABLE public.password_reset_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    action TEXT NOT NULL, -- 'request_code', 'verify_code', 'reset_password', 'rate_limited', 'account_locked'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for audit log
CREATE INDEX idx_reset_audit_log_email ON public.password_reset_audit_log(email);
CREATE INDEX idx_reset_audit_log_created_at ON public.password_reset_audit_log(created_at);
CREATE INDEX idx_reset_audit_log_action ON public.password_reset_audit_log(action);

-- Enable RLS on all tables
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies (restrictive - only service role can access)
CREATE POLICY "Service role access only" ON public.password_reset_codes
    FOR ALL USING (false);

CREATE POLICY "Service role access only" ON public.password_reset_rate_limits
    FOR ALL USING (false);

CREATE POLICY "Service role access only" ON public.password_reset_audit_log
    FOR ALL USING (false);

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_reset_rate_limit(
    p_email TEXT,
    p_ip_address INET DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to hash security codes
CREATE OR REPLACE FUNCTION public.hash_reset_code(p_code TEXT, p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use SHA-256 with email as salt
    RETURN encode(digest(p_code || p_email || 'blunari_reset_salt', 'sha256'), 'hex');
END;
$$;