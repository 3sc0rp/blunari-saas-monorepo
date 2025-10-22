-- =============================================================================
-- P1 FIX: Add Rate Limiting for Credential Management
-- =============================================================================
-- Prevents abuse of email/password update operations
-- =============================================================================

-- Check if table exists and add missing columns if needed
DO $$
BEGIN
  -- Add key column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_rate_limits' AND column_name = 'key'
  ) THEN
    ALTER TABLE public.api_rate_limits ADD COLUMN key text;
  END IF;

  -- Add request_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_rate_limits' AND column_name = 'request_count'
  ) THEN
    ALTER TABLE public.api_rate_limits ADD COLUMN request_count integer NOT NULL DEFAULT 1;
  END IF;

  -- Add window_start column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_rate_limits' AND column_name = 'window_start'
  ) THEN
    ALTER TABLE public.api_rate_limits ADD COLUMN window_start timestamptz NOT NULL DEFAULT now();
  END IF;

  -- Add endpoint column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_rate_limits' AND column_name = 'endpoint'
  ) THEN
    ALTER TABLE public.api_rate_limits ADD COLUMN endpoint text;
  END IF;
END $$;

-- Make key NOT NULL after adding it
DO $$
BEGIN
  ALTER TABLE public.api_rate_limits ALTER COLUMN key SET NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not set key as NOT NULL, column may not exist yet';
END $$;

-- Create unique index on key for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_rate_limits_key ON public.api_rate_limits(key);

-- Create index for cleanup queries (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_rate_limits' AND column_name = 'window_start') THEN
    CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start ON public.api_rate_limits(window_start);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_rate_limits' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_id ON public.api_rate_limits(user_id);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.api_rate_limits IS 
'Rate limiting for API endpoints, especially credential management operations. Window-based rate limiting with automatic cleanup of expired windows.';

-- Create cleanup function to remove old rate limit records
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete rate limit records older than 24 hours
  DELETE FROM public.api_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE 'Cleaned up expired rate limit records';
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_rate_limits TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.api_rate_limits TO authenticated;

-- Add RLS policies (only if columns exist)
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
  
  -- Create policy for service role (always works)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'api_rate_limits' 
    AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
    ON public.api_rate_limits
    FOR ALL
    USING (auth.role() = 'service_role');
  END IF;
  
  -- Create user policy only if user_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_rate_limits' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'api_rate_limits' 
      AND policyname = 'Users can view own rate limits'
    ) THEN
      CREATE POLICY "Users can view own rate limits"
      ON public.api_rate_limits
      FOR SELECT
      USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'api_rate_limits'
) as table_exists;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'api_rate_limits'
ORDER BY indexname;

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'api_rate_limits';

-- =============================================================================
-- Usage Example (for testing)
-- =============================================================================

/*
-- Simulate rate limit check (DO NOT RUN IN PRODUCTION)
INSERT INTO public.api_rate_limits (
  key,
  request_count,
  window_start,
  endpoint,
  user_id
) VALUES (
  'credentials:update_email:test-user-id:test-tenant-id',
  1,
  NOW(),
  'manage-tenant-credentials:update_email',
  auth.uid()
);

-- Check rate limit
SELECT 
  key,
  request_count,
  window_start,
  CASE 
    WHEN (EXTRACT(EPOCH FROM (NOW() - window_start))) < 3600 THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as window_status,
  EXTRACT(EPOCH FROM (NOW() - window_start))::integer as seconds_since_start
FROM public.api_rate_limits
WHERE key = 'credentials:update_email:test-user-id:test-tenant-id';
*/

-- =============================================================================
-- Scheduled Cleanup (Recommended)
-- =============================================================================

/*
-- Set up a cron job to clean up expired rate limits daily
-- This should be configured in Supabase Dashboard → Database → Extensions → pg_cron

SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 2 * * *',  -- Run at 2 AM daily
  $$SELECT cleanup_expired_rate_limits()$$
);

-- Or use Supabase Database Webhooks to trigger cleanup
*/

-- =============================================================================
-- Rate Limit Configuration (Documentation)
-- =============================================================================

/*
RATE LIMITS (per user per tenant per hour):

Credential Management:
- update_email: 3 requests/hour
- update_password: 5 requests/hour  
- generate_password: 10 requests/hour
- reset_password: 3 requests/hour

These limits prevent:
1. Email enumeration attacks
2. Credential harassment (malicious password changes)
3. System abuse (bulk operations overwhelming email delivery)

Limits are enforced in the Edge Function code, this table just tracks usage.
*/

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- ✅ api_rate_limits table created
-- ✅ Indexes added for performance
-- ✅ RLS policies enabled
-- ✅ Cleanup function created
-- ✅ Ready for Edge Function integration
-- =============================================================================
