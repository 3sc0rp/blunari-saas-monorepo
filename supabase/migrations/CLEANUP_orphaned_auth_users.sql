-- ============================================================================
-- CLEANUP: Orphaned Auth Users
-- ============================================================================
-- Run this occasionally to clean up auth users from failed provisioning attempts
-- These are users that were created but don't have corresponding tenant records

-- STEP 1: View orphaned users first (to see what will be deleted)
SELECT 
  u.id,
  u.email,
  u.created_at,
  t.id as tenant_id,
  p.user_id as profile_exists
FROM auth.users u
LEFT JOIN tenants t ON t.owner_id = u.id
LEFT JOIN profiles p ON p.user_id = u.id
WHERE t.id IS NULL  -- No tenant
AND u.created_at > NOW() - INTERVAL '7 days'  -- Only recent ones
ORDER BY u.created_at DESC;

-- STEP 2: After reviewing, uncomment and run this to delete them
/*
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN tenants t ON t.owner_id = u.id
  WHERE t.id IS NULL
  AND u.created_at > NOW() - INTERVAL '7 days'
);
*/

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete. Review the results above.';
END $$;
