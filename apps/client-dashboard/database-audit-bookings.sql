-- ================================================================
-- COMPREHENSIVE DATABASE AUDIT FOR BOOKINGS TABLE
-- ================================================================
-- Purpose: Diagnose database schema, RLS policies, and insertion issues
-- Date: October 1, 2025
-- Run this in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- SECTION 1: SCHEMA INSPECTION
-- ================================================================

-- 1.1: List all columns in bookings table
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 1.2: Check table existence and RLS status
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity AS rls_enabled,
  hasindexes,
  hastriggers
FROM pg_tables
WHERE tablename = 'bookings';

-- 1.3: List all constraints
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  tc.is_deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'bookings'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 1.4: Check foreign key relationships
SELECT
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'bookings'
  AND tc.table_schema = 'public';

-- 1.5: List all indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'bookings'
  AND schemaname = 'public';

-- ================================================================
-- SECTION 2: RLS POLICIES AUDIT
-- ================================================================

-- 2.1: List all RLS policies on bookings table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 2.2: Check if service_role can bypass RLS
SELECT 
  rolname,
  rolsuper,
  rolcanlogin,
  rolbypassrls
FROM pg_roles
WHERE rolname IN ('service_role', 'postgres', 'authenticator', 'anon', 'authenticated');

-- ================================================================
-- SECTION 3: DATA INSPECTION
-- ================================================================

-- 3.1: Count total bookings
SELECT COUNT(*) AS total_bookings
FROM bookings;

-- 3.2: Count bookings by status
SELECT 
  status,
  COUNT(*) AS count
FROM bookings
GROUP BY status
ORDER BY count DESC;

-- 3.3: Count bookings by tenant (top 10)
SELECT 
  t.name AS tenant_name,
  t.slug AS tenant_slug,
  COUNT(b.id) AS booking_count
FROM tenants t
LEFT JOIN bookings b ON b.tenant_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY booking_count DESC
LIMIT 10;

-- 3.4: Check for "Guest" names (indicating field mismatch issue)
SELECT 
  COUNT(*) AS guest_name_default_count,
  MIN(created_at) AS first_occurrence,
  MAX(created_at) AS last_occurrence
FROM bookings
WHERE guest_name = 'Guest';

-- 3.5: Sample recent bookings
SELECT 
  id,
  tenant_id,
  guest_name,
  guest_email,
  party_size,
  booking_time,
  status,
  created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 10;

-- 3.6: Check for NULL reservation IDs (shouldn't exist)
SELECT COUNT(*) AS null_id_count
FROM bookings
WHERE id IS NULL;

-- ================================================================
-- SECTION 4: DEMO TENANT SPECIFIC CHECKS
-- ================================================================

-- 4.1: Get demo tenant details
SELECT 
  id,
  slug,
  name,
  timezone,
  currency,
  created_at
FROM tenants
WHERE slug = 'demo';

-- 4.2: Count demo tenant bookings
SELECT 
  status,
  COUNT(*) AS count,
  MIN(created_at) AS first_booking,
  MAX(created_at) AS last_booking
FROM bookings
WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
GROUP BY status;

-- 4.3: Recent demo tenant bookings
SELECT 
  id,
  guest_name,
  guest_email,
  guest_phone,
  party_size,
  booking_time,
  status,
  created_at,
  updated_at
FROM bookings
WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY created_at DESC
LIMIT 20;

-- ================================================================
-- SECTION 5: INSERTION TEST
-- ================================================================

-- 5.1: Test INSERT with demo tenant (READ-ONLY TEST - will rollback)
BEGIN;

-- Attempt insert
INSERT INTO bookings (
  tenant_id,
  booking_time,
  party_size,
  guest_name,
  guest_email,
  guest_phone,
  status,
  duration_minutes,
  deposit_required,
  deposit_amount,
  deposit_paid
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', -- demo tenant
  '2025-10-02T19:00:00+00:00',
  4,
  'Database Test User',
  'dbtest@example.com',
  '+1234567890',
  'pending',
  120,
  false,
  0,
  false
)
RETURNING 
  id,
  guest_name,
  status,
  created_at;

-- Rollback so we don't actually insert
ROLLBACK;

-- If the above INSERT succeeded and you saw a result, RLS policies allow insertion
-- If it failed, check the error message for clues

-- ================================================================
-- SECTION 6: POTENTIAL ISSUES DETECTION
-- ================================================================

-- 6.1: Check for bookings with invalid foreign keys
SELECT 
  b.id AS booking_id,
  b.tenant_id,
  b.table_id,
  CASE 
    WHEN t.id IS NULL THEN 'Missing Tenant'
    ELSE 'OK'
  END AS tenant_check,
  CASE
    WHEN b.table_id IS NOT NULL AND rt.id IS NULL THEN 'Missing Table'
    WHEN b.table_id IS NULL THEN 'No Table Assigned'
    ELSE 'OK'
  END AS table_check
FROM bookings b
LEFT JOIN tenants t ON b.tenant_id = t.id
LEFT JOIN restaurant_tables rt ON b.table_id = rt.id
WHERE t.id IS NULL 
   OR (b.table_id IS NOT NULL AND rt.id IS NULL)
LIMIT 10;

-- 6.2: Check for overlapping bookings (same table, overlapping time)
WITH overlaps AS (
  SELECT 
    b1.id AS booking1_id,
    b2.id AS booking2_id,
    b1.table_id,
    b1.booking_time AS b1_start,
    b1.booking_time + (b1.duration_minutes || ' minutes')::INTERVAL AS b1_end,
    b2.booking_time AS b2_start,
    b2.booking_time + (b2.duration_minutes || ' minutes')::INTERVAL AS b2_end
  FROM bookings b1
  JOIN bookings b2 
    ON b1.table_id = b2.table_id
    AND b1.id < b2.id  -- Avoid duplicates
    AND b1.status != 'cancelled'
    AND b2.status != 'cancelled'
    AND b1.table_id IS NOT NULL
  WHERE 
    -- Check for overlap: b1_start < b2_end AND b1_end > b2_start
    b1.booking_time < b2.booking_time + (b2.duration_minutes || ' minutes')::INTERVAL
    AND b1.booking_time + (b1.duration_minutes || ' minutes')::INTERVAL > b2.booking_time
)
SELECT 
  COUNT(*) AS overlap_count
FROM overlaps;

-- 6.3: Check for bookings with missing required fields
SELECT 
  COUNT(*) AS invalid_bookings,
  SUM(CASE WHEN guest_email IS NULL THEN 1 ELSE 0 END) AS missing_email,
  SUM(CASE WHEN booking_time IS NULL THEN 1 ELSE 0 END) AS missing_booking_time,
  SUM(CASE WHEN party_size IS NULL OR party_size = 0 THEN 1 ELSE 0 END) AS invalid_party_size
FROM bookings;

-- ================================================================
-- SECTION 7: PERFORMANCE CHECKS
-- ================================================================

-- 7.1: Check table size
SELECT 
  pg_size_pretty(pg_total_relation_size('bookings')) AS total_size,
  pg_size_pretty(pg_relation_size('bookings')) AS table_size,
  pg_size_pretty(pg_total_relation_size('bookings') - pg_relation_size('bookings')) AS indexes_size;

-- 7.2: Check for missing indexes on common query columns
SELECT 
  'tenant_id' AS column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'bookings' 
      AND indexdef LIKE '%tenant_id%'
    ) THEN 'Indexed'
    ELSE 'NOT INDEXED - NEEDS INDEX'
  END AS index_status
UNION ALL
SELECT 
  'booking_time',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'bookings' 
      AND indexdef LIKE '%booking_time%'
    ) THEN 'Indexed'
    ELSE 'NOT INDEXED - NEEDS INDEX'
  END
UNION ALL
SELECT 
  'status',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'bookings' 
      AND indexdef LIKE '%status%'
    ) THEN 'Indexed'
    ELSE 'NOT INDEXED - Consider indexing'
  END;

-- ================================================================
-- SECTION 8: SCHEMA VERSION DETECTION
-- ================================================================

-- 8.1: Try to detect if we have old schema (DATE + TIME) or new schema (TIMESTAMPTZ)
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'booking_date' THEN 'Legacy schema (DATE + TIME split)'
    WHEN column_name = 'booking_time' AND data_type = 'timestamp with time zone' THEN 'New schema (TIMESTAMPTZ)'
    WHEN column_name = 'booking_time' AND data_type = 'time without time zone' THEN 'Legacy schema (DATE + TIME split)'
    ELSE 'Standard column'
  END AS schema_indicator
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name IN ('booking_date', 'booking_time')
ORDER BY column_name;

-- ================================================================
-- DIAGNOSTIC SUMMARY
-- ================================================================

-- Generate a diagnostic summary
SELECT 
  'AUDIT COMPLETE' AS status,
  NOW() AS audit_timestamp,
  (SELECT COUNT(*) FROM bookings) AS total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE guest_name = 'Guest') AS guest_name_issues,
  (SELECT COUNT(*) FROM tenants) AS total_tenants,
  (
    SELECT CASE 
      WHEN rowsecurity THEN 'ENABLED' 
      ELSE 'DISABLED' 
    END 
    FROM pg_tables 
    WHERE tablename = 'bookings'
  ) AS rls_status;

-- ================================================================
-- RECOMMENDED FIXES (DO NOT RUN AUTOMATICALLY)
-- ================================================================

/*
-- If RLS is preventing insertions, you might need:

-- Option 1: Add policy for service role to insert
CREATE POLICY "Service role can insert bookings"
ON bookings
FOR INSERT
TO service_role
WITH CHECK (true);

-- Option 2: Add policy for authenticated users
CREATE POLICY "Authenticated users can insert bookings"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Option 3: Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_time 
ON bookings(tenant_id, booking_time);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status 
ON bookings(tenant_id, status);

-- Option 4: Add index for guest lookups
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email 
ON bookings(guest_email);

*/
