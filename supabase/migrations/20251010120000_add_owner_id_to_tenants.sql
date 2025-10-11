-- ================================================================
-- ADD OWNER_ID TO TENANTS TABLE
-- Date: October 10, 2025
-- Purpose: Separate tenant owner users from admin users
-- ================================================================

-- Add owner_id column to tenants table
-- This will store the dedicated auth user who owns/operates this tenant
-- IMPORTANT: This should NEVER be an admin user!

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.owner_id IS 'Dedicated auth user who owns and operates this tenant. This should be a separate user account, NOT an admin user. Admin users manage tenants but should not be linked as owners.';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE '✅ Added owner_id column to tenants table';
  RAISE NOTICE '⚠️  Existing tenants have NULL owner_id - they need owners assigned';
  RAISE NOTICE '💡 Use manage-tenant-credentials to auto-create owners when needed';
END $$;
