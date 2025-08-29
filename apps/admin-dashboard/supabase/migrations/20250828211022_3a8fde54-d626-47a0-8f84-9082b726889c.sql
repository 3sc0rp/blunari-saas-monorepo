-- Fix security issues by setting search_path for all functions

-- Update cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deactivate expired sessions
  UPDATE public.user_sessions
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
  
  -- Delete old inactive sessions (older than 30 days)
  DELETE FROM public.user_sessions
  WHERE is_active = false 
    AND created_at < now() - INTERVAL '30 days';
END;
$$;

-- Update hash_api_key function
CREATE OR REPLACE FUNCTION public.hash_api_key(api_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- In production, use a proper cryptographic hash function
  -- This is a simplified version for demo purposes
  RETURN encode(digest(api_key || 'blunari_salt', 'sha256'), 'hex');
END;
$$;

-- Update validate_api_key_permissions function
CREATE OR REPLACE FUNCTION public.validate_api_key_permissions(
  p_key_hash TEXT,
  p_required_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  key_permissions JSONB;
BEGIN
  SELECT permissions INTO key_permissions
  FROM public.api_keys
  WHERE key_hash = p_key_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update last_used_at
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = p_key_hash;
  
  -- Check if the key has the required permission or admin permission
  RETURN key_permissions ? p_required_permission OR key_permissions ? 'admin';
END;
$$;

-- Update log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'info',
  p_user_id UUID DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_event_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, employee_id, 
    ip_address, user_agent, event_data
  ) VALUES (
    p_event_type, p_severity, p_user_id, p_employee_id,
    p_ip_address, p_user_agent, p_event_data
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Update update_api_keys_updated_at function
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;