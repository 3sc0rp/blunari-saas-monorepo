-- Database schema check for booking widget debugging
-- Run this in your Supabase SQL editor

-- 1. Check if bookings table exists and its structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'bookings' 
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- 2. Check recent bookings (if any)
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
FROM 
    bookings 
WHERE 
    created_at >= NOW() - INTERVAL '24 hours'
ORDER BY 
    created_at DESC
LIMIT 10;

-- 3. Check if booking_holds table exists
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'booking_holds' 
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- 4. Check recent booking holds
SELECT 
    id,
    tenant_id,
    booking_time,
    booking_date, 
    party_size,
    session_id,
    expires_at,
    created_at
FROM 
    booking_holds 
WHERE 
    created_at >= NOW() - INTERVAL '2 hours'
ORDER BY 
    created_at DESC
LIMIT 10;

-- 5. Check tenants table
SELECT 
    id,
    name,
    slug,
    status,
    timezone
FROM 
    tenants
LIMIT 5;

-- 6. Check if there are any constraints or policies that might block inserts
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM 
    pg_constraint 
WHERE 
    conrelid = 'public.bookings'::regclass;

-- 7. Check RLS policies on bookings table
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM 
    pg_policies 
WHERE 
    tablename = 'bookings';