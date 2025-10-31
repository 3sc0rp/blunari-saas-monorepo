-- ===================================================================
-- DEBUG PROVISIONING ISSUE - Run in Supabase SQL Editor
-- ===================================================================

-- 1. Check recent provisioning audit logs (last 10 attempts)
SELECT 
    action,
    tenant_slug,
    owner_email,
    admin_email,
    error_message,
    metadata,
    created_at
FROM tenant_provisioning_audit 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check if email is available
SELECT * FROM check_owner_email_availability('YOUR_EMAIL_HERE');
-- Replace YOUR_EMAIL_HERE with the email you're trying to use

-- 3. Check if slug is available
SELECT slug, name, email, owner_id, created_at 
FROM tenants 
WHERE slug = 'YOUR_SLUG_HERE';
-- Replace YOUR_SLUG_HERE with the slug you're trying to use

-- 4. Check recent auth users (last 5)
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check for any orphaned auth users from today
SELECT 
    u.id,
    u.email,
    u.created_at,
    'ORPHANED - No tenant record' as status
FROM auth.users u
LEFT JOIN tenants t ON t.owner_id = u.id
WHERE t.id IS NULL
AND u.created_at > NOW() - INTERVAL '1 day'
ORDER BY u.created_at DESC;
