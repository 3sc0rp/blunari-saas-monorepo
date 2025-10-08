-- Add table to track revoked recovery links
-- This prevents revoked links from being used even if they haven't expired

CREATE TABLE IF NOT EXISTS public.revoked_recovery_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  revoked_by UUID NOT NULL REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for fast lookups by request_id
CREATE INDEX IF NOT EXISTS idx_revoked_recovery_links_request_id 
  ON public.revoked_recovery_links(request_id);

-- Add index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_revoked_recovery_links_tenant_id 
  ON public.revoked_recovery_links(tenant_id);

-- Add index for time-based queries
CREATE INDEX IF NOT EXISTS idx_revoked_recovery_links_revoked_at 
  ON public.revoked_recovery_links(revoked_at DESC);

-- Enable RLS
ALTER TABLE public.revoked_recovery_links ENABLE ROW LEVEL SECURITY;

-- Only admins can view revoked links
CREATE POLICY "Admins can view revoked recovery links"
  ON public.revoked_recovery_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE user_id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'ADMIN')
        AND status = 'ACTIVE'
    )
  );

-- Only admins can insert revocations
CREATE POLICY "Admins can revoke recovery links"
  ON public.revoked_recovery_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE user_id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'ADMIN')
        AND status = 'ACTIVE'
    )
  );

-- Add helper function to check if a recovery link is revoked
CREATE OR REPLACE FUNCTION public.is_recovery_link_revoked(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.revoked_recovery_links
    WHERE request_id = p_request_id
  );
END;
$$;

-- Add function to revoke a recovery link
CREATE OR REPLACE FUNCTION public.revoke_recovery_link(
  p_request_id UUID,
  p_tenant_id UUID,
  p_owner_email TEXT,
  p_revoked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_already_revoked BOOLEAN;
BEGIN
  -- Check if already revoked
  SELECT EXISTS (
    SELECT 1 FROM revoked_recovery_links
    WHERE request_id = p_request_id
  ) INTO v_already_revoked;

  IF v_already_revoked THEN
    v_result := jsonb_build_object(
      'success', true,
      'already_revoked', true,
      'message', 'Recovery link was already revoked'
    );
    RETURN v_result;
  END IF;

  -- Insert revocation record
  INSERT INTO revoked_recovery_links (
    request_id,
    tenant_id,
    owner_email,
    revoked_by,
    reason
  ) VALUES (
    p_request_id,
    p_tenant_id,
    p_owner_email,
    p_revoked_by,
    p_reason
  );

  -- Log the revocation in activity_logs
  INSERT INTO activity_logs (
    employee_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    (SELECT id FROM employees WHERE user_id = p_revoked_by LIMIT 1),
    'owner_recovery_link_revoked',
    'tenant',
    p_tenant_id::TEXT,
    jsonb_build_object(
      'request_id', p_request_id,
      'owner_email', p_owner_email,
      'reason', p_reason
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'already_revoked', false,
    'message', 'Recovery link successfully revoked'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to revoke recovery link: %', SQLERRM;
END;
$$;

-- Add comments
COMMENT ON TABLE public.revoked_recovery_links IS 'Tracks revoked password recovery links to prevent their use';
COMMENT ON FUNCTION public.is_recovery_link_revoked IS 'Check if a recovery link has been revoked by request ID';
COMMENT ON FUNCTION public.revoke_recovery_link IS 'Revoke a recovery link and log the action';

-- Verification query
DO $$
BEGIN
  RAISE NOTICE '✓ Recovery link revocation system installed';
  RAISE NOTICE '  - Table: revoked_recovery_links';
  RAISE NOTICE '  - Function: is_recovery_link_revoked()';
  RAISE NOTICE '  - Function: revoke_recovery_link()';
  RAISE NOTICE '  - RLS policies: 2 created';
  RAISE NOTICE '  - Indexes: 3 created';
END $$;
