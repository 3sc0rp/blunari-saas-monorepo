-- =============================================================================
-- DIAGNOSE: Why all tenants have the same owner_id
-- =============================================================================

-- Step 1: Check what's in auto_provisioning for each tenant
SELECT 
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.tenant_id,
  ap.user_id,
  ap.login_email,
  ap.status,
  ap.created_at,
  CASE 
    WHEN ap.user_id = '04d3d2d0-3624-4034-8c75-f363e5965838' THEN '⚠️ USING SAME USER!'
    ELSE '✅ Different user'
  END as user_check
FROM auto_provisioning ap
ORDER BY ap.created_at DESC;

-- Step 2: Check what each tenant's owner_id is now
SELECT 
  t.name as tenant_name,
  t.slug,
  t.owner_id,
  t.email as tenant_email,
  p.email as owner_actual_email,
  CASE 
    WHEN t.owner_id = '04d3d2d0-3624-4034-8c75-f363e5965838' THEN '⚠️ SHARED OWNER!'
    ELSE '✅ Unique owner'
  END as sharing_status
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
ORDER BY t.created_at DESC;

-- =============================================================================
-- THE PROBLEM:
-- If you see "SHARED OWNER" for multiple tenants, it means they're all
-- incorrectly pointing to the same auth user account.
--
-- Each tenant MUST have its own dedicated owner auth user!
-- =============================================================================
