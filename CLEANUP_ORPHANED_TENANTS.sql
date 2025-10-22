-- ============================================================================
-- CLEANUP ORPHANED TENANTS
-- Run this after deployment to clean up any stuck provisions
-- ============================================================================

-- ============================================================================
-- STEP 1: Identify Orphaned Tenants
-- ============================================================================

-- Find tenants stuck in provisioning state for > 1 hour
SELECT 
  id,
  name,
  slug,
  owner_id,
  email,
  status,
  created_at,
  NOW() - created_at AS stuck_for,
  '❌ DELETE' AS action
FROM tenants
WHERE status = 'provisioning'
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at;

-- Find related auto_provisioning records
SELECT 
  ap.id,
  ap.tenant_id,
  ap.user_id,
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.status,
  ap.created_at,
  NOW() - ap.created_at AS stuck_for,
  '❌ DELETE' AS action
FROM auto_provisioning ap
WHERE ap.status = 'pending'
AND ap.created_at < NOW() - INTERVAL '1 hour'
ORDER BY ap.created_at;

-- ============================================================================
-- STEP 2: Backup Orphaned Data (Optional)
-- ============================================================================

-- Create backup table (run once)
CREATE TABLE IF NOT EXISTS orphaned_tenants_backup (
  id UUID,
  name TEXT,
  slug TEXT,
  owner_id UUID,
  email TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Backup orphaned tenants before deletion
INSERT INTO orphaned_tenants_backup (id, name, slug, owner_id, email, status, created_at, reason)
SELECT 
  id,
  name,
  slug,
  owner_id,
  email,
  status,
  created_at,
  'Stuck in provisioning state for > 1 hour'
FROM tenants
WHERE status = 'provisioning'
AND created_at < NOW() - INTERVAL '1 hour';

-- ============================================================================
-- STEP 3: Delete Orphaned Tenants
-- ============================================================================

-- WARNING: This will permanently delete tenants stuck in provisioning
-- Review the SELECT query results above before running DELETE!

BEGIN;

-- Delete orphaned auto_provisioning records first (foreign key)
DELETE FROM auto_provisioning
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '1 hour'
RETURNING id, restaurant_slug, created_at;

-- Delete orphaned tenants
DELETE FROM tenants
WHERE status = 'provisioning'
AND created_at < NOW() - INTERVAL '1 hour'
RETURNING id, name, slug, created_at;

-- Review deletions before committing
-- If everything looks correct, run: COMMIT;
-- If you want to undo, run: ROLLBACK;

-- Uncomment when ready:
-- COMMIT;

ROLLBACK; -- Remove this line and uncomment COMMIT above when ready

-- ============================================================================
-- STEP 4: Verify Cleanup
-- ============================================================================

-- Check if any orphaned tenants remain
SELECT 
  COUNT(*) AS orphaned_tenants_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphaned tenants'
    ELSE '⚠️  Still have orphaned tenants'
  END AS status
FROM tenants
WHERE status = 'provisioning'
AND created_at < NOW() - INTERVAL '1 hour';

-- Check if any orphaned auto_provisioning records remain
SELECT 
  COUNT(*) AS orphaned_auto_prov_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphaned auto_provisioning records'
    ELSE '⚠️  Still have orphaned auto_provisioning records'
  END AS status
FROM auto_provisioning
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '1 hour';

-- ============================================================================
-- STEP 5: Review Backup
-- ============================================================================

-- View backed up orphaned tenants
SELECT 
  id,
  name,
  slug,
  email,
  status,
  created_at,
  deleted_at,
  reason
FROM orphaned_tenants_backup
ORDER BY deleted_at DESC;

-- ============================================================================
-- OPTIONAL: Create Automatic Cleanup Function
-- ============================================================================

-- This function can be called manually or via cron job to clean up stuck provisions
CREATE OR REPLACE FUNCTION cleanup_stuck_provisions(
  p_older_than_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
  deleted_tenants INTEGER,
  deleted_auto_prov INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_tenants INTEGER := 0;
  v_deleted_auto_prov INTEGER := 0;
BEGIN
  -- Backup orphaned tenants
  INSERT INTO orphaned_tenants_backup (id, name, slug, owner_id, email, status, created_at, reason)
  SELECT 
    id,
    name,
    slug,
    owner_id,
    email,
    status,
    created_at,
    format('Auto-cleanup: Stuck for > %s hours', p_older_than_hours)
  FROM tenants
  WHERE status = 'provisioning'
  AND created_at < NOW() - (p_older_than_hours || ' hours')::INTERVAL;
  
  -- Delete orphaned auto_provisioning records
  DELETE FROM auto_provisioning
  WHERE status = 'pending'
  AND created_at < NOW() - (p_older_than_hours || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_auto_prov = ROW_COUNT;
  
  -- Delete orphaned tenants
  DELETE FROM tenants
  WHERE status = 'provisioning'
  AND created_at < NOW() - (p_older_than_hours || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_tenants = ROW_COUNT;
  
  -- Log cleanup
  RAISE NOTICE 'Cleanup completed: % tenants, % auto_provisioning records deleted', 
    v_deleted_tenants, v_deleted_auto_prov;
  
  -- Return results
  RETURN QUERY SELECT v_deleted_tenants, v_deleted_auto_prov;
END;
$$;

COMMENT ON FUNCTION cleanup_stuck_provisions IS 'Automatically cleans up tenants stuck in provisioning state for more than specified hours';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Manual cleanup (delete provisions older than 1 hour)
-- SELECT * FROM cleanup_stuck_provisions(1);

-- Aggressive cleanup (delete provisions older than 5 minutes)
-- SELECT * FROM cleanup_stuck_provisions(0); -- 0 hours = immediate

-- Check what would be deleted without actually deleting
/*
SELECT 
  id,
  name,
  slug,
  created_at,
  NOW() - created_at AS stuck_for
FROM tenants
WHERE status = 'provisioning'
AND created_at < NOW() - INTERVAL '1 hour';
*/

-- ============================================================================
-- SCHEDULE AUTOMATIC CLEANUP (Optional - requires pg_cron extension)
-- ============================================================================

-- Enable pg_cron if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every hour
-- SELECT cron.schedule(
--   'cleanup-stuck-provisions',
--   '0 * * * *', -- Every hour at minute 0
--   $$SELECT cleanup_stuck_provisions(1)$$
-- );

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- Remove scheduled job
-- SELECT cron.unschedule('cleanup-stuck-provisions');
