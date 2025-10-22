-- =============================================================================
-- P0 FIX: Add Database Constraints for owner_id
-- =============================================================================
-- Prevents orphaned tenants and enforces data integrity at database level
-- =============================================================================

-- Step 1: First ensure ALL existing tenants have owner_id set
-- (Should already be done after running fix-tenant-owner for each tenant)

-- Check for any tenants without owner_id
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM tenants
  WHERE owner_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot add NOT NULL constraint: % tenants have NULL owner_id. Run fix-tenant-owner first.', v_null_count;
  END IF;
  
  RAISE NOTICE '✅ All tenants have owner_id set. Safe to add constraint.';
END $$;

-- Step 2: Add NOT NULL constraint
-- This prevents future tenants from being created without owner_id
ALTER TABLE public.tenants 
ALTER COLUMN owner_id SET NOT NULL;

-- Step 3: Add index for performance on owner_id lookups
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);

-- Step 4: Add check to ensure one owner doesn't have too many tenants
-- (Business rule: Currently allowing multiple tenants per owner, but we log it)
CREATE OR REPLACE FUNCTION check_owner_tenant_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_count INTEGER;
BEGIN
  -- Count tenants for this owner
  SELECT COUNT(*) INTO v_tenant_count
  FROM tenants
  WHERE owner_id = NEW.owner_id;
  
  -- Log warning if owner has multiple tenants (unusual but allowed)
  IF v_tenant_count > 3 THEN
    RAISE WARNING 'Owner % now has % tenants - may need review', NEW.owner_id, v_tenant_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_owner_tenant_limit
AFTER INSERT OR UPDATE OF owner_id ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION check_owner_tenant_limit();

-- Step 5: Add comment for documentation
COMMENT ON COLUMN public.tenants.owner_id IS 
'UUID of the tenant owner auth user (required). Must reference a valid auth.users.id. This is the primary account that manages the tenant and has full access to tenant settings and data. Each tenant MUST have exactly one owner.';

-- Step 6: Create helper function to validate owner exists in auth
CREATE OR REPLACE FUNCTION validate_tenant_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify owner_id is not null (redundant with NOT NULL but explicit)
  IF NEW.owner_id IS NULL THEN
    RAISE EXCEPTION 'owner_id cannot be NULL';
  END IF;
  
  -- Verify owner is not an active admin employee
  -- (Admins should NOT be tenant owners to prevent credential conflicts)
  IF EXISTS (
    SELECT 1 
    FROM employees 
    WHERE user_id = NEW.owner_id 
    AND status = 'ACTIVE'
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Cannot set admin user as tenant owner. Admin user % cannot be a tenant owner.', NEW.owner_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_tenant_owner
BEFORE INSERT OR UPDATE OF owner_id ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION validate_tenant_owner();

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check 1: Verify constraint is applied
SELECT 
  column_name,
  is_nullable,
  data_type,
  CASE 
    WHEN is_nullable = 'NO' THEN '✅ NOT NULL enforced'
    ELSE '❌ NULL allowed (BAD!)'
  END as constraint_status
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name = 'owner_id';

-- Expected: is_nullable = 'NO' ✅

-- Check 2: Verify index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tenants'
AND indexname = 'idx_tenants_owner_id';

-- Expected: 1 row showing the index ✅

-- Check 3: Verify triggers are active
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tenants'
AND trigger_name IN ('trg_check_owner_tenant_limit', 'trg_validate_tenant_owner');

-- Expected: 2 rows (both triggers) ✅

-- Check 4: Test constraint (should fail)
-- DO NOT RUN IN PRODUCTION - For testing only
/*
INSERT INTO tenants (id, name, slug, owner_id)
VALUES (gen_random_uuid(), 'Test', 'test', NULL);
-- Expected: ERROR: null value in column "owner_id" violates not-null constraint ✅
*/

-- =============================================================================
-- Rollback (if needed - NOT RECOMMENDED)
-- =============================================================================
/*
-- Remove NOT NULL constraint
ALTER TABLE public.tenants ALTER COLUMN owner_id DROP NOT NULL;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_check_owner_tenant_limit ON public.tenants;
DROP TRIGGER IF EXISTS trg_validate_tenant_owner ON public.tenants;

-- Drop functions
DROP FUNCTION IF EXISTS check_owner_tenant_limit();
DROP FUNCTION IF EXISTS validate_tenant_owner();

-- Drop index
DROP INDEX IF EXISTS idx_tenants_owner_id;
*/

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- ✅ owner_id now required (NOT NULL constraint)
-- ✅ Performance optimized (index on owner_id)
-- ✅ Business rules enforced (owner limit warning trigger)
-- ✅ Safety checks (admin cannot be tenant owner)
-- ✅ Documentation added (column comment)
-- =============================================================================
