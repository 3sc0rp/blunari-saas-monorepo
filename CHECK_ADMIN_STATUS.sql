-- ============================================================================
-- CHECK ADMIN STATUS
-- Run this in Supabase Dashboard to see why you're getting 403 Forbidden
-- ============================================================================

-- Step 1: Find your current auth user
SELECT 
  id,
  email,
  created_at,
  '👤 Your Auth User' AS note
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check if you exist in employees table
SELECT 
  e.id,
  e.user_id,
  e.role,
  e.status,
  e.email,
  u.email AS auth_email,
  CASE 
    WHEN e.role IN ('SUPER_ADMIN', 'ADMIN') AND e.status = 'ACTIVE' THEN '✅ Has admin access'
    WHEN e.role IN ('SUPER_ADMIN', 'ADMIN') AND e.status != 'ACTIVE' THEN '⚠️ Admin but status is not ACTIVE'
    WHEN e.role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN '❌ Not an admin role'
    ELSE '❌ No access'
  END AS access_status
FROM employees e
LEFT JOIN auth.users u ON u.id = e.user_id
ORDER BY e.created_at DESC
LIMIT 10;

-- Step 3: Check profiles table (might have role info there too)
SELECT 
  p.user_id,
  p.email,
  p.role,
  u.email AS auth_email,
  '📋 Profile record' AS note
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
ORDER BY u.created_at DESC
LIMIT 10;

-- ============================================================================
-- DIAGNOSIS
-- ============================================================================
-- If you see your email in auth.users but NOT in employees table:
--   → You need to add yourself to employees table as SUPER_ADMIN
--
-- If you're in employees but role is not SUPER_ADMIN or ADMIN:
--   → You need to update your role
--
-- If you're in employees but status is not ACTIVE:
--   → You need to update your status to ACTIVE
-- ============================================================================
