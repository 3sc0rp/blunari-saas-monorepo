-- Check Tenant Resolution for Production
-- Run this in Supabase SQL Editor to verify your tenant data structure

-- ========================================
-- 1. Check All Users and Their Tenants
-- ========================================
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  ap.tenant_id,
  ap.status as provisioning_status,
  ap.created_at as provisioning_created,
  t.slug as tenant_slug,
  t.name as tenant_name,
  t.timezone,
  t.currency
FROM auth.users u
LEFT JOIN auto_provisioning ap ON ap.user_id = u.id
LEFT JOIN tenants t ON t.id = ap.tenant_id
ORDER BY u.created_at DESC;

-- ========================================
-- 2. Check Orphaned Users (No Tenant)
-- ========================================
SELECT 
  u.id as user_id,
  u.email,
  u.created_at,
  'No auto_provisioning record' as issue
FROM auth.users u
LEFT JOIN auto_provisioning ap ON ap.user_id = u.id
WHERE ap.id IS NULL;

-- ========================================
-- 3. Check Incomplete Provisioning
-- ========================================
SELECT 
  u.id as user_id,
  u.email,
  ap.status,
  ap.tenant_id,
  ap.error_message,
  ap.created_at
FROM auth.users u
INNER JOIN auto_provisioning ap ON ap.user_id = u.id
WHERE ap.status != 'completed';

-- ========================================
-- 4. Check All Tenants
-- ========================================
SELECT 
  t.id,
  t.slug,
  t.name,
  t.timezone,
  t.currency,
  t.created_at,
  COUNT(DISTINCT ap.user_id) as user_count
FROM tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
GROUP BY t.id, t.slug, t.name, t.timezone, t.currency, t.created_at
ORDER BY t.created_at DESC;

-- ========================================
-- 5. Check Demo/Test Tenant
-- ========================================
SELECT 
  id,
  slug,
  name,
  'This is the demo tenant that should NOT be used in production' as warning
FROM tenants
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
   OR slug = 'demo';

-- ========================================
-- 6. Fix Script for Users Without Tenants
-- ========================================
-- UNCOMMENT AND MODIFY THIS IF YOU NEED TO CREATE TENANTS FOR EXISTING USERS
/*
DO $$
DECLARE
  user_record RECORD;
  new_tenant_id UUID;
  user_email_prefix TEXT;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN auto_provisioning ap ON ap.user_id = u.id
    WHERE ap.id IS NULL
  LOOP
    -- Extract email prefix for slug (e.g., john@example.com -> john)
    user_email_prefix := SPLIT_PART(user_record.email, '@', 1);
    
    -- Create a new tenant for this user
    INSERT INTO tenants (slug, name, timezone, currency)
    VALUES (
      user_email_prefix || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8),
      user_email_prefix || '''s Restaurant',
      'America/New_York',
      'USD'
    )
    RETURNING id INTO new_tenant_id;
    
    -- Create auto_provisioning record
    INSERT INTO auto_provisioning (user_id, tenant_id, status)
    VALUES (user_record.id, new_tenant_id, 'completed');
    
    RAISE NOTICE 'Created tenant % for user %', new_tenant_id, user_record.email;
  END LOOP;
END $$;
*/

-- ========================================
-- 7. Widget Analytics Tables Check
-- ========================================
-- Verify the analytics tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('widget_analytics_logs', 'widget_events')
ORDER BY table_name;

-- Check if there's any analytics data
SELECT 
  'widget_analytics_logs' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT tenant_id) as unique_tenants
FROM widget_analytics_logs
UNION ALL
SELECT 
  'widget_events' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT tenant_id) as unique_tenants
FROM widget_events;
