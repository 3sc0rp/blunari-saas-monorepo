-- =============================================================================
-- CHECK ADMIN vs TENANT USER SEPARATION
-- =============================================================================
-- This query shows the difference between admin users and tenant owners

-- Part 1: Show admin users (from employees table)
SELECT 
  'ADMIN USER' as user_type,
  e.user_id,
  au.email,
  e.role::text as role,
  'N/A - No tenant link' as tenant_info,
  e.status
FROM employees e
JOIN auth.users au ON au.id = e.user_id
WHERE e.status = 'ACTIVE'
ORDER BY au.email;

-- Part 2: Show tenant owners (from tenants table)
SELECT 
  'TENANT OWNER' as user_type,
  t.owner_id as user_id,
  au.email,
  p.role as role,
  t.name as tenant_info,
  'active' as status
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id
LEFT JOIN profiles p ON p.user_id = t.owner_id
WHERE t.owner_id IS NOT NULL
ORDER BY au.email;

-- Part 3: Check for tenants WITHOUT owners (need to be fixed)
SELECT 
  '⚠️  TENANT WITHOUT OWNER' as issue,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.owner_id,
  'This tenant needs an owner!' as action_needed
FROM tenants t
WHERE t.owner_id IS NULL;

-- Part 4: Check for tenants linked to ADMIN users (BAD!)
SELECT 
  '🚨 TENANT LINKED TO ADMIN' as issue,
  t.id as tenant_id,
  t.name as tenant_name,
  t.owner_id,
  au.email as admin_email,
  e.role::text as admin_role,
  'CRITICAL: Remove this link!' as action_needed
FROM tenants t
JOIN auth.users au ON au.id = t.owner_id
JOIN employees e ON e.user_id = t.owner_id
WHERE e.status = 'ACTIVE';

-- Part 5: Check auto_provisioning for admin users (BAD!)
SELECT 
  '🚨 AUTO-PROVISIONING LINKED TO ADMIN' as issue,
  ap.tenant_id,
  t.name as tenant_name,
  ap.user_id,
  au.email as admin_email,
  e.role::text as admin_role,
  'CRITICAL: Remove this link!' as action_needed
FROM auto_provisioning ap
JOIN tenants t ON t.id = ap.tenant_id
JOIN auth.users au ON au.id = ap.user_id
JOIN employees e ON e.user_id = ap.user_id
WHERE e.status = 'ACTIVE';

-- Summary
SELECT '=== SUMMARY ===' as info;

DO $$
DECLARE
  admin_count INTEGER;
  tenant_owner_count INTEGER;
  tenants_without_owner INTEGER;
  tenants_linked_to_admin INTEGER;
BEGIN
  -- Count admins
  SELECT COUNT(*) INTO admin_count
  FROM employees
  WHERE status = 'ACTIVE';
  
  -- Count tenant owners
  SELECT COUNT(*) INTO tenant_owner_count
  FROM tenants
  WHERE owner_id IS NOT NULL;
  
  -- Count tenants without owners
  SELECT COUNT(*) INTO tenants_without_owner
  FROM tenants
  WHERE owner_id IS NULL;
  
  -- Count tenants linked to admins (BAD!)
  SELECT COUNT(*) INTO tenants_linked_to_admin
  FROM tenants t
  JOIN employees e ON e.user_id = t.owner_id
  WHERE e.status = 'ACTIVE';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== USER SEPARATION STATUS ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin users: %', admin_count;
  RAISE NOTICE 'Tenant owners: %', tenant_owner_count;
  RAISE NOTICE 'Tenants without owners: %', tenants_without_owner;
  RAISE NOTICE 'Tenants linked to admins (BAD!): %', tenants_linked_to_admin;
  RAISE NOTICE '';
  
  IF tenants_linked_to_admin > 0 THEN
    RAISE NOTICE '🚨 CRITICAL: % tenant(s) are linked to admin users!', tenants_linked_to_admin;
    RAISE NOTICE '   Action: Change tenant email via admin dashboard to auto-create owners';
  END IF;
  
  IF tenants_without_owner > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % tenant(s) have no owner assigned', tenants_without_owner;
    RAISE NOTICE '   Action: Change tenant email via admin dashboard to auto-create owners';
  END IF;
  
  IF tenants_linked_to_admin = 0 AND tenants_without_owner = 0 THEN
    RAISE NOTICE '✅ All tenants properly separated from admin users!';
  END IF;
END $$;
