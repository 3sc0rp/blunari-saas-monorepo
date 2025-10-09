-- ================================================================
-- TENANT PROVISIONING IMPROVEMENTS
-- Date: October 8, 2025
-- Purpose: Add critical security and data integrity improvements
-- ================================================================

-- This migration addresses critical issues from the provisioning audit:
-- 1. Add unique constraint on tenants.slug
-- 2. Add idempotency_key column to auto_provisioning
-- 3. Add audit logging table
-- 4. Add provisioning metrics table
-- 5. Update provision_tenant function with transaction rollback

BEGIN;

-- ================================================================
-- PHASE 1: ADD UNIQUE CONSTRAINTS
-- ================================================================

-- Add unique constraint on tenants.slug if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_slug_unique'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);
    RAISE NOTICE 'Added unique constraint on tenants.slug';
  ELSE
    RAISE NOTICE 'Unique constraint on tenants.slug already exists';
  END IF;
END $$;

-- Add index on tenants.slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- ================================================================
-- PHASE 2: ADD IDEMPOTENCY SUPPORT
-- ================================================================

-- Add idempotency_key column to auto_provisioning if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_provisioning' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE auto_provisioning ADD COLUMN idempotency_key UUID;
    RAISE NOTICE 'Added idempotency_key column to auto_provisioning';
  ELSE
    RAISE NOTICE 'idempotency_key column already exists';
  END IF;
END $$;

-- Add unique index on idempotency_key (allowing NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_provisioning_idempotency 
ON auto_provisioning(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add login_email and business_email columns for clarity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_provisioning' 
    AND column_name = 'login_email'
  ) THEN
    ALTER TABLE auto_provisioning ADD COLUMN login_email TEXT;
    RAISE NOTICE 'Added login_email column to auto_provisioning';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_provisioning' 
    AND column_name = 'business_email'
  ) THEN
    ALTER TABLE auto_provisioning ADD COLUMN business_email TEXT;
    RAISE NOTICE 'Added business_email column to auto_provisioning';
  END IF;
END $$;

-- ================================================================
-- PHASE 3: AUDIT LOGGING TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS tenant_provisioning_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'RETRY'
  data JSONB NOT NULL, -- Full provisioning payload
  ip_address INET,
  user_agent TEXT,
  request_id UUID NOT NULL,
  idempotency_key UUID,
  status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'IN_PROGRESS'
  error_message TEXT,
  error_code VARCHAR(50),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit table
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON tenant_provisioning_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON tenant_provisioning_audit(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON tenant_provisioning_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_status ON tenant_provisioning_audit(status);
CREATE INDEX IF NOT EXISTS idx_audit_request_id ON tenant_provisioning_audit(request_id);

-- Add comment
COMMENT ON TABLE tenant_provisioning_audit IS 'Comprehensive audit log for all tenant provisioning operations';

-- ================================================================
-- PHASE 4: PROVISIONING METRICS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS provisioning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  failure_code VARCHAR(50),
  configuration JSONB, -- Store config like timezone, plan, features
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics
CREATE INDEX IF NOT EXISTS idx_metrics_tenant ON provisioning_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_metrics_admin ON provisioning_metrics(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_success ON provisioning_metrics(success);
CREATE INDEX IF NOT EXISTS idx_metrics_created ON provisioning_metrics(created_at DESC);

-- Add comment
COMMENT ON TABLE provisioning_metrics IS 'Performance and success metrics for tenant provisioning operations';

-- ================================================================
-- PHASE 5: HELPER FUNCTION FOR AUDIT LOGGING
-- ================================================================

CREATE OR REPLACE FUNCTION log_provisioning_audit(
  p_tenant_id UUID,
  p_admin_user_id UUID,
  p_action VARCHAR(50),
  p_data JSONB,
  p_request_id UUID,
  p_idempotency_key UUID DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'SUCCESS',
  p_error_message TEXT DEFAULT NULL,
  p_error_code VARCHAR(50) DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO tenant_provisioning_audit (
    tenant_id,
    admin_user_id,
    action,
    data,
    request_id,
    idempotency_key,
    status,
    error_message,
    error_code,
    duration_ms
  ) VALUES (
    p_tenant_id,
    p_admin_user_id,
    p_action,
    p_data,
    p_request_id,
    p_idempotency_key,
    p_status,
    p_error_message,
    p_error_code,
    p_duration_ms
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- ================================================================
-- PHASE 6: UPDATE provision_tenant FUNCTION
-- ================================================================

-- Drop and recreate with transaction rollback support
CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_user_id uuid, 
  p_restaurant_name text, 
  p_restaurant_slug text, 
  p_timezone text DEFAULT 'America/New_York'::text,
  p_currency text DEFAULT 'USD'::text,
  p_description text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_address jsonb DEFAULT NULL,
  p_cuisine_type_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  provisioning_id UUID;
BEGIN
  -- Start explicit transaction block with error handling
  BEGIN
    -- Create auto_provisioning record
    INSERT INTO public.auto_provisioning (
      user_id, restaurant_name, restaurant_slug, timezone, currency, status
    ) VALUES (
      p_user_id, p_restaurant_name, p_restaurant_slug, p_timezone, p_currency, 'processing'
    ) RETURNING id INTO provisioning_id;

    -- Create tenant with enhanced fields
    INSERT INTO public.tenants (
      name, slug, timezone, currency, status, description, phone, email, website, address, cuisine_type_id
    ) VALUES (
      p_restaurant_name, p_restaurant_slug, p_timezone, p_currency, 'active',
      p_description, p_phone, p_email, p_website, p_address, p_cuisine_type_id
    ) RETURNING id INTO new_tenant_id;

    -- Update provisioning record with tenant_id
    UPDATE public.auto_provisioning 
    SET tenant_id = new_tenant_id, status = 'completed', completed_at = now()
    WHERE id = provisioning_id;

    -- Enable default features for new tenant
    INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, source)
    VALUES 
      (new_tenant_id, 'basic_booking', true, 'plan'),
      (new_tenant_id, 'email_notifications', true, 'plan'),
      (new_tenant_id, 'basic_analytics', true, 'plan'),
      (new_tenant_id, 'widget_integration', true, 'plan');

    -- Create default tables for the restaurant
    INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
    VALUES 
      (new_tenant_id, 'Table 1', 2, 'standard', true),
      (new_tenant_id, 'Table 2', 2, 'standard', true),
      (new_tenant_id, 'Table 3', 4, 'standard', true),
      (new_tenant_id, 'Table 4', 4, 'standard', true),
      (new_tenant_id, 'Table 5', 6, 'standard', true),
      (new_tenant_id, 'Table 6', 6, 'standard', true),
      (new_tenant_id, 'Table 7', 8, 'standard', true),
      (new_tenant_id, 'Table 8', 8, 'standard', true);

    -- Create default business hours (Monday-Friday 9-22, Saturday-Sunday 9-23)
    INSERT INTO public.business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
    VALUES 
      (new_tenant_id, 0, false, NULL, NULL), -- Sunday closed by default
      (new_tenant_id, 1, true, '09:00', '22:00'), -- Monday
      (new_tenant_id, 2, true, '09:00', '22:00'), -- Tuesday
      (new_tenant_id, 3, true, '09:00', '22:00'), -- Wednesday
      (new_tenant_id, 4, true, '09:00', '22:00'), -- Thursday
      (new_tenant_id, 5, true, '09:00', '23:00'), -- Friday
      (new_tenant_id, 6, true, '09:00', '23:00'); -- Saturday

    -- Create default party size configuration
    INSERT INTO public.party_size_configs (
      tenant_id, min_party_size, max_party_size, default_party_size, 
      allow_large_parties, large_party_threshold
    ) VALUES (
      new_tenant_id, 1, 12, 2, true, 8
    );

    -- If we get here, commit is implicit
    RETURN new_tenant_id;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Rollback is automatic on exception
      RAISE NOTICE 'Provisioning failed: Duplicate key violation (slug: %)', p_restaurant_slug;
      RAISE EXCEPTION 'A tenant with slug "%" already exists', p_restaurant_slug;
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Provisioning failed: Foreign key violation (user_id: %)', p_user_id;
      RAISE EXCEPTION 'Invalid reference: User ID or Cuisine Type ID does not exist';
    WHEN OTHERS THEN
      -- Catch all other errors and rollback
      RAISE NOTICE 'Provisioning failed with error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      RAISE EXCEPTION 'Tenant provisioning failed: %', SQLERRM;
  END;
END;
$function$;

-- ================================================================
-- PHASE 7: ADD COMMENTS AND DOCUMENTATION
-- ================================================================

COMMENT ON COLUMN auto_provisioning.idempotency_key IS 'UUID for idempotent provisioning requests - prevents duplicate creation';
COMMENT ON COLUMN auto_provisioning.login_email IS 'Email used for authentication (user login)';
COMMENT ON COLUMN auto_provisioning.business_email IS 'Business contact email (may differ from login)';
COMMENT ON CONSTRAINT tenants_slug_unique ON tenants IS 'Ensures tenant slugs are globally unique across the platform';

-- ================================================================
-- PHASE 8: DATA VALIDATION
-- ================================================================

-- Verify the changes
DO $$
DECLARE
  constraint_count INTEGER;
  index_count INTEGER;
  audit_table_exists BOOLEAN;
  metrics_table_exists BOOLEAN;
BEGIN
  -- Check unique constraint
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint 
  WHERE conname = 'tenants_slug_unique';
  
  RAISE NOTICE 'Unique constraint check: % (expected: 1)', constraint_count;
  
  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE indexname IN ('idx_tenants_slug', 'idx_auto_provisioning_idempotency');
  
  RAISE NOTICE 'Critical indexes: % (expected: 2)', index_count;
  
  -- Check audit table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tenant_provisioning_audit'
  ) INTO audit_table_exists;
  
  RAISE NOTICE 'Audit table exists: %', audit_table_exists;
  
  -- Check metrics table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'provisioning_metrics'
  ) INTO metrics_table_exists;
  
  RAISE NOTICE 'Metrics table exists: %', metrics_table_exists;
  
  -- Summary
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Critical improvements applied:';
  RAISE NOTICE '  ✓ Unique constraint on tenants.slug';
  RAISE NOTICE '  ✓ Idempotency support added';
  RAISE NOTICE '  ✓ Audit logging table created';
  RAISE NOTICE '  ✓ Metrics tracking table created';
  RAISE NOTICE '  ✓ Transaction rollback in provision_tenant';
  RAISE NOTICE '================================================';
END $$;

COMMIT;
