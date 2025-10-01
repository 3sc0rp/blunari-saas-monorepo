-- COMPREHENSIVE DATABASE AUDIT FOR BOOKING ISSUES
-- Run this in Supabase SQL Editor

-- 1. Check if bookings table exists and its exact structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check constraints that might block inserts
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.bookings'::regclass;

-- 3. Check RLS policies that might block inserts
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'bookings';

-- 4. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'bookings';

-- 5. Check recent booking attempts (last 24 hours)
SELECT 
    id,
    tenant_id,
    guest_name,
    guest_email,
    status,
    booking_time,
    booking_date,
    created_at,
    party_size
FROM bookings 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 6. Check booking_holds table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'booking_holds' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Check recent booking holds
SELECT 
    id,
    tenant_id,
    booking_time,
    booking_date,
    party_size,
    session_id,
    expires_at,
    created_at
FROM booking_holds 
WHERE created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 8. Check tenants table to ensure demo tenant exists
SELECT 
    id,
    name,
    slug,
    status,
    timezone,
    created_at
FROM tenants
WHERE slug = 'demo' OR name LIKE '%demo%'
LIMIT 5;

-- 9. Check if there are any triggers on bookings table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'bookings';

-- 10. Test a simple insert to see what happens (use a unique email)
-- UNCOMMENT AND RUN THIS CAREFULLY:
/*
INSERT INTO bookings (
    tenant_id, 
    booking_time, 
    party_size, 
    guest_name, 
    guest_email, 
    status,
    duration_minutes
) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo' LIMIT 1),
    NOW() + INTERVAL '2 hours',
    2,
    'Test User Audit',
    'audit-test-' || extract(epoch from now()) || '@example.com',
    'pending',
    120
) RETURNING id, created_at, status;
*/

-- 11. Check indexes that might affect performance
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'bookings';

-- 12. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'bookings' AND table_schema = 'public';