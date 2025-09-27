-- Create rate_limits table for rate limiting functionality
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_limit_key TEXT NOT NULL,
  identifier TEXT NOT NULL, -- IP address or user ID
  action TEXT NOT NULL, -- Type of action being rate limited
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON public.rate_limits (rate_limit_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action_identifier ON public.rate_limits (action, identifier, created_at DESC);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for system to manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
USING (true);

-- Add security audit fields to existing activity_logs table if they don't exist
DO $$ 
BEGIN
  -- Check if ip_address column exists, if not add it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'ip_address') THEN
    ALTER TABLE public.activity_logs ADD COLUMN ip_address INET;
  END IF;
  
  -- Check if user_agent column exists, if not add it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'user_agent') THEN
    ALTER TABLE public.activity_logs ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- Create security_events table for tracking security incidents
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'login_attempt', 'failed_login', 'suspicious_activity', etc.
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  user_id UUID, -- Reference to auth.users, nullable for anonymous events
  employee_id UUID, -- Reference to employees table, nullable
  ip_address INET,
  user_agent TEXT,
  event_data JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID, -- Reference to employees table
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for security_events
CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON public.security_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_resolved ON public.security_events (severity, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_employee_id ON public.security_events (employee_id, created_at DESC);

-- Enable RLS on security_events table
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create policies for security_events
CREATE POLICY "Support can view security events"
ON public.security_events
FOR SELECT
USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Support can update security events"
ON public.security_events
FOR UPDATE
USING (has_employee_role('SUPPORT'::employee_role));

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Reference to auth.users
  session_token TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}', -- Browser, OS, device type info
  ip_address INET,
  location_data JSONB DEFAULT '{}', -- Country, city, region
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_active ON public.user_sessions (user_id, is_active, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions (expires_at);

-- Enable RLS on user_sessions table
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
ON public.user_sessions
FOR ALL
USING (true);

-- Create api_keys table for API key management
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Reference to auth.users
  employee_id UUID, -- Reference to employees table, nullable
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- Hashed version of the actual key
  key_preview TEXT NOT NULL, -- First 8 + last 4 characters for display
  permissions JSONB DEFAULT '[]', -- Array of permission strings
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id_active ON public.api_keys (user_id, is_active, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON public.api_keys (expires_at);

-- Enable RLS on api_keys table
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for api_keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys"
ON public.api_keys
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all API keys"
ON public.api_keys
FOR SELECT
USING (has_employee_role('ADMIN'::employee_role));

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to hash API keys securely
CREATE OR REPLACE FUNCTION public.hash_api_key(api_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, use a proper cryptographic hash function
  -- This is a simplified version for demo purposes
  RETURN encode(digest(api_key || 'blunari_salt', 'sha256'), 'hex');
END;
$$;

-- Create function to validate API key permissions
CREATE OR REPLACE FUNCTION public.validate_api_key_permissions(
  p_key_hash TEXT,
  p_required_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to log security events
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

-- Create trigger to update updated_at on api_keys
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_api_keys_updated_at_trigger
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_api_keys_updated_at();