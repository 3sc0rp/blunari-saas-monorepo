-- =============================================================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE SQL EDITOR
-- =============================================================================
-- URL: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
-- =============================================================================

-- Step 1: CHECK - See what's wrong with your tenant(s)
-- Look for "❌ NO OWNER_ID - NEEDS FIX"
SELECT 
  t.id,
  t.name,
  t.slug,
  t.email,
  t.owner_id,
  CASE 
    WHEN t.owner_id IS NULL THEN '❌ NO OWNER_ID - NEEDS FIX'
    ELSE '✅ OWNER_ID IS SET'
  END as status,
  t.created_at
FROM tenants t
ORDER BY t.created_at DESC
LIMIT 5;

-- Step 2: FIX - Update tenants with owner_id from auto_provisioning
-- This is the ACTUAL FIX - it will set owner_id for tenants that are missing it
UPDATE tenants t
SET 
  owner_id = ap.user_id,
  updated_at = NOW()
FROM auto_provisioning ap
WHERE t.id = ap.tenant_id
  AND t.owner_id IS NULL
  AND ap.status = 'completed';

-- Step 3: VERIFY - Check that it worked
-- Should now show "✅ OWNER PROPERLY CONFIGURED"
SELECT 
  t.id,
  t.name,
  t.slug,
  t.owner_id,
  CASE 
    WHEN t.owner_id IS NULL THEN '❌ STILL NULL - PROBLEM!'
    WHEN p.user_id IS NULL THEN '⚠️ OWNER_ID SET BUT USER NOT FOUND'
    WHEN p.role = 'owner' THEN '✅ OWNER PROPERLY CONFIGURED'
    ELSE '⚠️ WRONG ROLE: ' || p.role
  END as status,
  p.email as owner_email
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
ORDER BY t.updated_at DESC
LIMIT 5;

-- =============================================================================
-- AFTER RUNNING THIS:
-- 1. You should see "✅ OWNER PROPERLY CONFIGURED" in Step 3
-- 2. Go back to admin dashboard
-- 3. Try updating the tenant email again
-- 4. Should work now! ✅
-- =============================================================================
