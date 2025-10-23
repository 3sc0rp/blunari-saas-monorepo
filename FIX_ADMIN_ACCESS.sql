-- ============================================================================
-- SIMPLE ADMIN CHECK - Run this first
-- ============================================================================

-- Step 1: Who are you? (Find your current auth user)
SELECT 
  id AS user_id,
  email,
  created_at,
  '👤 This is YOU' AS note
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- Step 2: Are you in the employees table as an admin?
-- ============================================================================
SELECT 
  e.user_id,
  e.email,
  e.role,
  e.status,
  CASE 
    WHEN e.role IN ('SUPER_ADMIN', 'ADMIN') AND e.status = 'ACTIVE' THEN '✅ You have admin access!'
    WHEN e.role IN ('SUPER_ADMIN', 'ADMIN') AND e.status != 'ACTIVE' THEN '⚠️ You are admin but status is: ' || e.status
    WHEN e.role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN '❌ Your role is: ' || e.role || ' (needs to be SUPER_ADMIN or ADMIN)'
    ELSE '❌ No access'
  END AS diagnosis
FROM employees e
ORDER BY e.created_at DESC
LIMIT 10;

-- ============================================================================
-- If Step 2 returns NO ROWS:
-- You are NOT in the employees table! Run the fix below:
-- ============================================================================

/*
-- FIX: Add yourself as SUPER_ADMIN
-- Replace YOUR_EMAIL and YOUR_USER_ID with values from Step 1

INSERT INTO employees (
  user_id,
  email,
  full_name,
  role,
  status,
  tenant_id
) VALUES (
  'YOUR_USER_ID_FROM_STEP_1',  -- e.g., '12345678-1234-1234-1234-123456789abc'
  'YOUR_EMAIL_FROM_STEP_1',     -- e.g., 'admin@example.com'
  'System Administrator',
  'SUPER_ADMIN',
  'ACTIVE',
  NULL  -- Super admins don't belong to a specific tenant
);
*/

-- ============================================================================
-- If Step 2 shows you exist but with wrong role or status:
-- ============================================================================

/*
-- FIX: Update your role to SUPER_ADMIN
UPDATE employees 
SET role = 'SUPER_ADMIN', status = 'ACTIVE'
WHERE email = 'YOUR_EMAIL_HERE';
*/
