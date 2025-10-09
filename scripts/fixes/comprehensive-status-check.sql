-- COMPREHENSIVE STATUS CHECK
-- This will tell us exactly what's happening

-- Part 1: Show EVERYTHING about this tenant
SELECT 
  '=== AUTO_PROVISIONING DATA ===' as section,
  ap.id,
  ap.user_id,
  ap.login_email,
  ap.business_email,
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.status,
  ap.created_at
FROM auto_provisioning ap
WHERE ap.restaurant_slug = 'test-restaurant-1759905296975'

UNION ALL

SELECT 
  '=== PROFILE FOR THAT USER_ID ===' as section,
  NULL,
  p.user_id,
  p.email,
  NULL,
  p.first_name || ' ' || p.last_name as full_name,
  p.role,
  NULL,
  p.created_at
FROM profiles p
WHERE p.user_id = (
  SELECT user_id FROM auto_provisioning 
  WHERE restaurant_slug = 'test-restaurant-1759905296975'
)

UNION ALL

SELECT 
  '=== PROFILE BY EMAIL ===' as section,
  NULL,
  p.user_id,
  p.email,
  NULL,
  p.first_name || ' ' || p.last_name as full_name,
  p.role,
  NULL,
  p.created_at
FROM profiles p
WHERE p.email = 'owner-test-1759905296975@example.com';

-- Part 2: Count how many profiles we created
SELECT 
  'Total profiles in system' as metric,
  COUNT(*) as count
FROM profiles

UNION ALL

SELECT 
  'Profiles with role=owner' as metric,
  COUNT(*) as count
FROM profiles
WHERE role = 'owner'

UNION ALL

SELECT 
  'Profiles created today' as metric,
  COUNT(*) as count
FROM profiles
WHERE created_at::date = CURRENT_DATE;
