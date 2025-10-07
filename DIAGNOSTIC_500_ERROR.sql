-- 🔍 DIAGNOSTIC SCRIPT FOR 500 ERROR
-- Run this in Supabase SQL Editor to diagnose the credential update issue
-- This will show you exactly what's wrong

-- ============================================================================
-- PART 1: CHECK PROFILES TABLE STRUCTURE
-- ============================================================================

SELECT '1️⃣  PROFILES TABLE STRUCTURE CHECK' as "DIAGNOSTIC STEP";

-- Check if user_id column exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('id', 'user_id', 'email')
ORDER BY ordinal_position;

-- ============================================================================
-- PART 2: CHECK FOR PROFILES WITH NULL user_id
-- ============================================================================

SELECT '2️⃣  PROFILES WITH NULL user_id (PROBLEM!)' as "DIAGNOSTIC STEP";

SELECT 
  id as profile_id,
  user_id,
  email,
  CASE 
    WHEN user_id IS NULL THEN '❌ PROBLEM: NULL user_id'
    ELSE '✅ OK: Has user_id'
  END as status
FROM profiles
WHERE user_id IS NULL
LIMIT 10;

SELECT 
  COUNT(*) as total_profiles_with_null_user_id
FROM profiles
WHERE user_id IS NULL;

-- ============================================================================
-- PART 3: CHECK TENANTS AND THEIR PROFILES
-- ============================================================================

SELECT '3️⃣  TENANT-PROFILE LINKAGE CHECK' as "DIAGNOSTIC STEP";

SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  p.id as profile_id,
  p.user_id as profile_user_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PROFILE'
    WHEN p.user_id IS NULL THEN '⚠️  NULL user_id'
    ELSE '✅ OK'
  END as status
FROM tenants t
LEFT JOIN profiles p ON p.email = t.email
WHERE t.email != 'admin@blunari.ai'
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 4: CHECK AUTO_PROVISIONING RECORDS
-- ============================================================================

SELECT '4️⃣  AUTO-PROVISIONING RECORDS' as "DIAGNOSTIC STEP";

SELECT 
  ap.tenant_id,
  ap.user_id,
  ap.status,
  t.name as tenant_name,
  t.email as tenant_email
FROM auto_provisioning ap
LEFT JOIN tenants t ON t.id = ap.tenant_id
ORDER BY ap.created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 5: SUMMARY & DIAGNOSIS
-- ============================================================================

SELECT '5️⃣  SUMMARY & DIAGNOSIS' as "DIAGNOSTIC STEP";

-- Count issues
SELECT 
  'Total profiles' as metric,
  COUNT(*)::text as value
FROM profiles
UNION ALL
SELECT 
  'Profiles with NULL user_id' as metric,
  COUNT(*)::text as value
FROM profiles
WHERE user_id IS NULL
UNION ALL
SELECT 
  'Tenants without profiles' as metric,
  COUNT(*)::text as value
FROM tenants t
LEFT JOIN profiles p ON p.email = t.email
WHERE p.id IS NULL
  AND t.email != 'admin@blunari.ai'
UNION ALL
SELECT 
  'Auto-provisioning completed' as metric,
  COUNT(*)::text as value
FROM auto_provisioning
WHERE status = 'completed';

-- ============================================================================
-- FINAL DIAGNOSIS
-- ============================================================================

SELECT '🔍 FINAL DIAGNOSIS' as "DIAGNOSTIC STEP";

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles WHERE user_id IS NULL) > 0 THEN
      '❌ ISSUE FOUND: ' || (SELECT COUNT(*) FROM profiles WHERE user_id IS NULL)::text || ' profiles have NULL user_id. This causes 500 errors when updating credentials. See FIX SCRIPT below.'
    WHEN (SELECT COUNT(*) FROM tenants t LEFT JOIN profiles p ON p.email = t.email WHERE p.id IS NULL AND t.email != ''admin@blunari.ai'') > 0 THEN
      '⚠️  ISSUE: Some tenants have no profiles. They need to be provisioned.'
    ELSE
      '✅ NO ISSUES FOUND: Database structure looks correct. Check edge function logs for other errors.'
  END as diagnosis;

-- ============================================================================
-- HOW TO FIX: Run this if you have NULL user_id profiles
-- ============================================================================

SELECT '📋 TO FIX NULL user_id ISSUES:' as "FIX INSTRUCTIONS";

SELECT 
  '-- For each profile with NULL user_id, you need to either:
-- Option 1: Link to existing auth user (if they have one)
-- Option 2: Create new auth user and link it
-- Option 3: Use "Regenerate Credentials" in admin dashboard

-- To see which profiles need fixing:
SELECT email, id FROM profiles WHERE user_id IS NULL;

-- These profiles cannot have their credentials updated until user_id is set.
' as instructions;
