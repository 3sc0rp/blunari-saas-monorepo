-- ===================================================================
-- PROVISIONING AUDIT: Database State Verification
-- Run this in Supabase SQL Editor
-- ===================================================================

-- ===================================================================
-- 1. VERIFY CONSTRAINTS ON TENANTS TABLE
-- ===================================================================
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'tenants' 
AND constraint_name LIKE '%owner%'
ORDER BY constraint_name;

-- Expected: tenants_owner_id_unique (UNIQUE constraint)


-- ===================================================================
-- 2. VERIFY REQUIRED DATABASE FUNCTIONS EXIST
-- ===================================================================
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name IN (
    'check_owner_email_availability',
    'verify_provisioning_completion',
    'rollback_failed_provisioning',
    'log_provisioning_audit'
)
ORDER BY routine_name;

-- Expected: All 4 functions present


-- ===================================================================
-- 3. TEST EMAIL VALIDATION FUNCTION
-- ===================================================================

-- Test with EXISTING email (should return available=false)
SELECT * FROM check_owner_email_availability('deewav3@gmail.com');

-- Test with NEW email (should return available=true)
SELECT * FROM check_owner_email_availability('totally-new-email-never-used@example.com');


-- ===================================================================
-- 4. CURRENT TENANTS STATE
-- ===================================================================
SELECT 
    id,
    name,
    slug,
    email,
    owner_id,
    status,
    created_at
FROM tenants 
ORDER BY created_at DESC;


-- ===================================================================
-- 5. RECENT AUTH USERS (Last 7 days)
-- ===================================================================
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;


-- ===================================================================
-- 6. RECENT PROVISIONING AUDIT LOGS (Last 20)
-- ===================================================================
SELECT 
    action,
    tenant_slug,
    owner_email,
    admin_email,
    error_message,
    created_at
FROM tenant_provisioning_audit 
ORDER BY created_at DESC 
LIMIT 20;


-- ===================================================================
-- 7. FIND ORPHANED AUTH USERS (No Tenant Association)
-- ===================================================================
SELECT 
    u.id,
    u.email,
    u.created_at,
    'ORPHANED - No tenant record' as status
FROM auth.users u
LEFT JOIN tenants t ON t.owner_id = u.id
WHERE t.id IS NULL
AND u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;


-- ===================================================================
-- 8. VERIFY AUTO_PROVISIONING RECORDS
-- ===================================================================
SELECT 
    ap.user_id,
    ap.tenant_id,
    ap.status,
    t.name as tenant_name,
    t.email as tenant_email,
    ap.created_at
FROM auto_provisioning ap
JOIN tenants t ON t.id = ap.tenant_id
ORDER BY ap.created_at DESC
LIMIT 20;


-- ===================================================================
-- 9. CHECK FOR DUPLICATE OWNER_ID (Should be EMPTY)
-- ===================================================================
SELECT 
    owner_id,
    COUNT(*) as tenant_count,
    STRING_AGG(name, ', ') as tenant_names
FROM tenants
GROUP BY owner_id
HAVING COUNT(*) > 1;

-- Expected: ZERO rows (UNIQUE constraint prevents duplicates)


-- ===================================================================
-- 10. VERIFY TENANT_PROVISIONING_AUDIT TABLE STRUCTURE
-- ===================================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tenant_provisioning_audit'
ORDER BY ordinal_position;

-- Expected columns: id, admin_email, tenant_slug, owner_email, 
--                   owner_id, action, metadata, idempotency_key, 
--                   error_message, created_at
