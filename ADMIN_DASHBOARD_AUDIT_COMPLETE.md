# Admin Dashboard - Deep Audit & Comprehensive Fixes
**Date**: October 22, 2025  
**Status**: 🔴 CRITICAL ISSUES FOUND

## Executive Summary

The admin dashboard tenant provisioning system has **multiple critical issues** preventing successful tenant creation. The root cause is a **mismatch between authorization checks** in the database function and the actual user data model.

### Critical Issue Found: Authorization Check Failure

**Problem**: The `provision_tenant_atomic()` database function checks the `profiles` table for admin authorization:

```sql
-- Line 198-203 in 20251022_fix_tenant_provisioning_atomic.sql
IF NOT EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = p_admin_user_id 
  AND role IN ('SUPER_ADMIN', 'ADMIN')
) THEN
  RAISE EXCEPTION 'User % is not authorized to provision tenants', p_admin_user_id;
END IF;
```

**But**: Admin users were added to the `employees` table, NOT the `profiles` table!

This causes **ALL provisioning attempts to fail with 403 Forbidden** error:
```
"User 7d68eada-5b32-419f-aef8-f15afac43ed0 is not authorized to provision tenants"
```

---

## Issues Found

### 🔴 Issue #1: Database Authorization Check Points to Wrong Table

**Severity**: P0 - CRITICAL (Blocks all provisioning)  
**Location**: `supabase/migrations/20251022_fix_tenant_provisioning_atomic.sql:198-203`

**Current Code**:
```sql
-- Checks profiles table
IF NOT EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = p_admin_user_id 
  AND role IN ('SUPER_ADMIN', 'ADMIN')
) THEN
  RAISE EXCEPTION 'User % is not authorized to provision tenants', p_admin_user_id;
END IF;
```

**Problems**:
1. Function checks `profiles.role` for admin status
2. Admins are stored in `employees` table with roles ('SUPER_ADMIN', 'ADMIN')
3. Current admin user exists in `employees` but NOT in `profiles`
4. Result: Authorization always fails

**Fix Options**:

**Option A: Add Admin to Profiles Table** (Immediate Fix)
```sql
-- Add admin user to profiles table
INSERT INTO profiles (user_id, email, role, onboarding_completed)
VALUES (
  '7d68eada-5b32-419f-aef8-f15afac43ed0',
  'drood.tech@gmail.com',
  'SUPER_ADMIN',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'SUPER_ADMIN',
  email = 'drood.tech@gmail.com',
  updated_at = NOW();
```

**Option B: Change Database Function to Check Employees Table** (Proper Fix)
```sql
-- Update provision_tenant_atomic to check employees table instead
IF NOT EXISTS (
  SELECT 1 FROM employees 
  WHERE user_id = p_admin_user_id 
  AND role IN ('SUPER_ADMIN', 'ADMIN')
  AND status = 'ACTIVE'
) THEN
  RAISE EXCEPTION 'User % is not authorized to provision tenants', p_admin_user_id;
END IF;
```

**Recommendation**: Use Option A immediately to unblock, then apply Option B as proper long-term fix.

---

### 🔴 Issue #2: Broken Security Audit Triggers Block Table Modifications

**Severity**: P0 - CRITICAL (Blocks user/tenant modifications)  
**Location**: Multiple triggers on `profiles`, `employees`, `tenants` tables

**Problems**:
1. Multiple audit triggers fire on INSERT/UPDATE
2. Triggers try to log to `security_events` table with wrong schema
3. Triggers reference non-existent columns (`NEW.id`, `event_type`)
4. Result: Cannot INSERT into `profiles` table

**Error Messages**:
```
ERROR: column "event_type" of relation "security_events" does not exist
ERROR: record "new" has no field "id"
```

**Broken Triggers Found**:
- `profiles`: `audit_profile_changes`, `protect_profile_updates`, `trigger_audit_profiles`
- `employees`: `audit_employee_changes`, `prevent_unauthorized_role_changes`, `trigger_audit_employees`
- `tenants`: `trigger_audit_tenants`, `create_tenant_settings_trigger`

**Broken Functions**:
- `audit_all_sensitive_operations()`
- `audit_sensitive_operations()`
- `log_role_change()`
- `validate_role_change()`
- `auto_log_changes()`

**Fix**: Drop all broken triggers and functions immediately.

---

### 🟡 Issue #3: Edge Function Admin Verification Uses Wrong Table

**Severity**: P1 - HIGH (Causes 403 errors at Edge Function level)  
**Location**: `supabase/functions/tenant-provisioning/index.ts:182-208`

**Current Code**:
```typescript
// Edge Function checks employees table
const { data: employeeData, error: employeeError } = await supabase.rpc('get_employee_by_user_id', {
  p_user_id: user.id
});
```

**Problems**:
1. Edge Function checks `employees` table (correct)
2. Database function checks `profiles` table (incorrect)
3. Inconsistent authorization logic between layers
4. Even if Edge Function passes, database function rejects

**Fix**: Make database function use same table as Edge Function (`employees`).

---

### 🟡 Issue #4: Admin Dashboard UI Lacks Actionable Error Messages

**Severity**: P1 - HIGH (Poor UX, confusing for admins)  
**Location**: `apps/admin-dashboard/src/components/admin/TenantProvisioningWizard.tsx:310-330`

**Current Code**:
```typescript
const errorMessages: Record<string, { title: string; description: string; action: string }> = {
  'FORBIDDEN': {
    title: 'Permission Denied',
    description: 'You do not have permission to provision tenants.',
    action: 'Please contact a super admin for assistance.'
  },
  // ...
};
```

**Problems**:
1. Generic "Permission Denied" doesn't explain root cause
2. No guidance on checking `profiles` vs `employees` table
3. No instructions for admin to self-diagnose
4. Error mapping doesn't cover database-level authorization failures

**Improved Error Handling**:
```typescript
'FORBIDDEN': {
  title: 'Authorization Failed',
  description: 'Your account is not properly configured for provisioning.',
  action: 'Verify your user exists in the profiles table with SUPER_ADMIN role. Check database logs for details.'
},
'P0001': {  // PostgreSQL RAISE EXCEPTION code
  title: 'Database Authorization Error',
  description: 'The database rejected your provisioning request.',
  action: 'Your user may be missing from the profiles table. Contact a database admin.'
}
```

---

### 🟢 Issue #5: RLS Policies Block Service Role Queries

**Severity**: P2 - MEDIUM (Causes intermittent Edge Function failures)  
**Location**: `employees` table RLS policies

**Problems**:
1. RLS policies apply even to service_role queries using `.from()`
2. Edge Function can't read `employees` table despite service role key
3. Workaround: Use SECURITY DEFINER function to bypass RLS

**Current Workaround**:
```sql
-- get_employee_by_user_id() function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_employee_by_user_id(p_user_id UUID)
RETURNS TABLE (role TEXT, status TEXT)
SECURITY DEFINER  -- Bypasses RLS
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT e.role::TEXT, e.status::TEXT 
  FROM employees e WHERE e.user_id = p_user_id LIMIT 1;
END;
$$;
```

**Proper Fix**: Add explicit RLS policy for service role:
```sql
CREATE POLICY "Service role can read employees"
ON employees FOR SELECT
TO service_role
USING (true);
```

---

## Database Schema Analysis

### Profiles Table Structure
```sql
Column Name          | Type      | Nullable | Notes
---------------------|-----------|----------|-------------------
email                | text      | NO       | Required
first_name           | text      | YES      | 
last_name            | text      | YES      | 
phone                | text      | YES      | 
avatar_url           | text      | YES      | 
role                 | text      | NO       | Required (admin check)
onboarding_completed | boolean   | NO       | Required
created_at           | timestamp | NO       | 
updated_at           | timestamp | NO       | 
user_id              | uuid      | NO       | Primary key
```

### Employees Table Structure
```sql
Column Name | Type | Notes
------------|------|----------------------------------
id          | uuid | Primary key
user_id     | uuid | References auth.users(id)
email       | text | Employee email
role        | enum | SUPER_ADMIN, ADMIN, MANAGER, etc.
status      | enum | ACTIVE, INACTIVE, SUSPENDED
tenant_id   | uuid | NULL for platform admins
```

### Key Insight
- **Platform admins** (no tenant_id): Should be in `employees` AND `profiles`
- **Tenant owners**: Only in `profiles` (linked via tenants.owner_id)
- **Current bug**: Platform admin only in `employees`, missing from `profiles`

---

## Comprehensive Fix Plan

### Phase 1: Immediate Fixes (Unblock Provisioning)

**Step 1A: Drop Broken Security Triggers**
```bash
# Run: FIX_SECURITY_TRIGGERS.sql
```

**Step 1B: Add Admin to Profiles Table**
```bash
# Run: FIX_ADD_ADMIN_TO_PROFILES.sql
```

**Step 1C: Test Provisioning**
- Login to admin dashboard
- Create test tenant with unique email/slug
- Verify success (no 403 error)

### Phase 2: Proper Database Fixes

**Step 2A: Update provision_tenant_atomic Function**
```sql
-- Create new migration: 20251022_fix_provision_tenant_auth_check.sql

CREATE OR REPLACE FUNCTION provision_tenant_atomic(
  p_idempotency_key UUID,
  p_admin_user_id UUID,
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_owner_email TEXT,
  p_owner_password TEXT,
  p_tenant_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  -- ... existing variables ...
BEGIN
  -- FIX: Check employees table instead of profiles
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE user_id = p_admin_user_id 
    AND role IN ('SUPER_ADMIN', 'ADMIN')
    AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'User % is not authorized to provision tenants', p_admin_user_id;
  END IF;
  
  -- ... rest of function unchanged ...
END;
$$;
```

**Step 2B: Add Service Role RLS Bypass**
```sql
-- Create policy for service role to bypass RLS
CREATE POLICY "Service role bypass" ON employees
FOR ALL TO service_role
USING (true);

CREATE POLICY "Service role bypass" ON profiles
FOR ALL TO service_role
USING (true);
```

**Step 2C: Rebuild Security Audit System**
```sql
-- Create proper security_events table with correct schema
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT,
  record_id UUID,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simplified audit trigger
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO security_events (event_type, severity, user_id, table_name, record_id, event_data)
  VALUES (
    TG_OP,
    'medium',
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Re-add triggers to critical tables
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_employees_trigger
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_tenants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
```

### Phase 3: Admin Dashboard Improvements

**Step 3A: Enhanced Error Handling**
```typescript
// apps/admin-dashboard/src/hooks/useAdminAPI.ts

// Add specific error code mappings for database errors
const errorCodeMap: Record<string, string> = {
  'P0001': 'Database authorization check failed. Verify user exists in profiles table with admin role.',
  '42P01': 'Database table missing. Contact system administrator.',
  '23505': 'Duplicate entry detected. Email or slug already exists.',
  '23503': 'Foreign key violation. Referenced data not found.',
  '42703': 'Database column missing. Schema may need update.',
};

// Enhanced error extraction
if (response.error) {
  const errCode = (errObj as { code?: string })?.code || '';
  const dbHint = errorCodeMap[errCode] || '';
  
  console.error('Edge function error with database hint:', {
    code: errCode,
    message,
    hint: dbHint,
    correlationId
  });
  
  // Show database hint if available
  if (dbHint) {
    errorMsg += ` [Database: ${dbHint}]`;
  }
}
```

**Step 3B: Pre-Flight Checks**
```typescript
// Add pre-flight validation before provisioning
const runPreFlightChecks = async (formData: ProvisioningRequestData) => {
  const checks = [];
  
  // Check 1: Verify admin has profiles entry
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();
    
  if (!profile || !['SUPER_ADMIN', 'ADMIN'].includes(profile.role)) {
    checks.push({
      passed: false,
      message: 'Your user account is not configured as an admin in the profiles table.',
      action: 'Contact a system administrator to add you to the profiles table with SUPER_ADMIN role.'
    });
  }
  
  // Check 2: Verify slug availability
  const { data: existingSlug } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', formData.basics.slug)
    .maybeSingle();
    
  if (existingSlug) {
    checks.push({
      passed: false,
      message: `Slug "${formData.basics.slug}" is already taken.`,
      action: 'Choose a different restaurant name or modify the slug manually.'
    });
  }
  
  // Check 3: Verify owner email availability
  const { data: users } = await supabase.auth.admin.listUsers();
  const emailExists = users?.users?.some(u => u.email === formData.owner.email);
  
  if (emailExists) {
    checks.push({
      passed: false,
      message: `Email "${formData.owner.email}" is already registered.`,
      action: 'Use a different owner email address.'
    });
  }
  
  return checks;
};

// Call before submit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Run pre-flight checks
  const preFlightResults = await runPreFlightChecks(formData);
  const failures = preFlightResults.filter(c => !c.passed);
  
  if (failures.length > 0) {
    toast({
      title: 'Pre-Flight Checks Failed',
      description: failures.map(f => f.message).join('\n'),
      variant: 'destructive',
    });
    return;
  }
  
  // Continue with provisioning...
};
```

---

## Testing Checklist

### Pre-Deployment Tests

- [ ] **Admin User Setup**
  - [ ] Admin exists in `employees` table with SUPER_ADMIN role
  - [ ] Admin exists in `profiles` table with SUPER_ADMIN role
  - [ ] Admin can login to admin dashboard
  - [ ] Admin token includes correct role in JWT

- [ ] **Database Functions**
  - [ ] `provision_tenant_atomic` checks `employees` table
  - [ ] `get_employee_by_user_id` works with service_role
  - [ ] RLS policies allow service_role queries
  - [ ] No broken triggers on `profiles`/`employees`/`tenants`

- [ ] **Edge Functions**
  - [ ] `tenant-provisioning` deployed successfully
  - [ ] Function logs show admin verification passing
  - [ ] Function returns detailed error messages
  - [ ] CORS headers work for admin dashboard origin

### Post-Deployment Tests

- [ ] **Happy Path**
  - [ ] Create tenant with unique slug/email
  - [ ] Provisioning completes without errors
  - [ ] Owner user created in auth.users
  - [ ] Tenant record created with correct owner_id
  - [ ] Auto_provisioning record created
  - [ ] Admin receives success message with credentials

- [ ] **Error Scenarios**
  - [ ] Duplicate slug shows clear error
  - [ ] Duplicate owner email shows clear error
  - [ ] Invalid slug format rejected with guidance
  - [ ] Missing owner email rejected
  - [ ] Unauthorized user (no admin role) gets 403 with explanation

- [ ] **Edge Cases**
  - [ ] Idempotent retry returns same result
  - [ ] Network timeout doesn't create duplicate tenants
  - [ ] Database rollback works on any step failure
  - [ ] Owner credentials displayed exactly once

---

## Deployment Instructions

### 1. Prepare SQL Fixes

```powershell
# Navigate to project root
cd "c:\Users\Drood\Desktop\Blunari SAAS"

# Verify SQL files exist
ls FIX_*.sql
```

### 2. Apply Fixes in Order

**Step 2.1: Drop Broken Triggers**
```sql
-- Run in Supabase SQL Editor: FIX_SECURITY_TRIGGERS.sql
-- This must run FIRST before any table modifications
```

**Step 2.2: Add Admin to Profiles**
```sql
-- Run in Supabase SQL Editor: FIX_ADD_ADMIN_TO_PROFILES.sql
-- Adds current admin user to profiles table
```

**Step 2.3: Fix Database Function Authorization**
```sql
-- Create and run new migration: 20251022_fix_provision_tenant_auth_check.sql
-- Changes provision_tenant_atomic to check employees table
```

### 3. Deploy Edge Functions

```powershell
cd supabase/functions/tenant-provisioning
supabase functions deploy tenant-provisioning
```

### 4. Test Provisioning

```
1. Login to admin dashboard: https://admin.blunari.ai
2. Navigate to Tenants → Create New Tenant
3. Fill form:
   - Name: Test Restaurant 2025
   - Slug: test-restaurant-2025
   - Owner Email: owner-test-2025@example.com (MUST be unique!)
4. Submit and verify success
5. Check owner credentials displayed
```

### 5. Monitor & Verify

```sql
-- Verify tenant created
SELECT id, name, slug, owner_id, status 
FROM tenants 
WHERE slug = 'test-restaurant-2025';

-- Verify owner user created
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'owner-test-2025@example.com';

-- Verify auto_provisioning record
SELECT tenant_id, user_id, status 
FROM auto_provisioning 
WHERE tenant_slug = 'test-restaurant-2025';
```

---

## Files Created/Modified

### SQL Fixes
1. `FIX_SECURITY_TRIGGERS.sql` - Drops all broken audit triggers and functions
2. `FIX_ADD_ADMIN_TO_PROFILES.sql` - Adds admin user to profiles table
3. `CHECK_PROFILES_COLUMNS.sql` - Inspects profiles table schema
4. `CREATE_EMPLOYEE_HELPER_FUNCTION.sql` - SECURITY DEFINER function for RLS bypass

### Proposed New Files
1. `supabase/migrations/20251022_fix_provision_tenant_auth_check.sql` - Fix authorization check
2. `supabase/migrations/20251022_rebuild_security_audit.sql` - Rebuild audit system
3. `supabase/migrations/20251022_service_role_rls_bypass.sql` - Add service role policies

---

## Root Cause Analysis

### Why Did This Happen?

1. **Inconsistent User Model**
   - Platform admins stored in `employees` table
   - Tenant owners stored via `profiles` table
   - No clear separation or documentation

2. **Multiple Authorization Layers**
   - Edge Function checks `employees` table
   - Database function checks `profiles` table
   - No consistency between layers

3. **Broken Security Monitoring**
   - Over-engineered audit triggers
   - Schema changes broke trigger logic
   - No tests to catch broken triggers

4. **Inadequate Error Messages**
   - Generic "Permission Denied" doesn't explain root cause
   - No guidance on self-diagnosis
   - Database errors not surfaced to UI

### Prevention Measures

1. **Standardize User Model**
   - Document which table contains which user type
   - Use `employees` for ALL admin/staff
   - Use `profiles` for ALL tenant owners
   - Enforce with database constraints

2. **Unified Authorization**
   - All authorization checks use same table
   - Edge Function and database function aligned
   - Document authorization flow clearly

3. **Robust Audit System**
   - Simple trigger design (fewer failure points)
   - Schema-agnostic logging (use JSONB)
   - Automated tests for triggers

4. **Better Error Handling**
   - Surface database errors to UI
   - Provide actionable guidance
   - Include correlation IDs for debugging

---

## Next Steps

After applying fixes:

1. **Immediate**
   - [ ] Test tenant provisioning end-to-end
   - [ ] Verify no 403 errors
   - [ ] Document current admin users in profiles table

2. **Short-term** (This Sprint)
   - [ ] Create migration for authorization fix
   - [ ] Rebuild security audit system
   - [ ] Add pre-flight checks to UI
   - [ ] Improve error messages

3. **Long-term** (Next Sprint)
   - [ ] Document user model architecture
   - [ ] Add automated tests for provisioning flow
   - [ ] Create admin management UI
   - [ ] Add health check endpoint

---

## Support Information

**Debugging Commands**:
```sql
-- Check admin user
SELECT user_id, email, role FROM profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN');
SELECT user_id, email, role, status FROM employees WHERE role IN ('SUPER_ADMIN', 'ADMIN');

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, roles 
FROM pg_policies 
WHERE schemaname = 'public';
```

**Edge Function Logs**:
```powershell
# View logs in Supabase Dashboard
https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/logs/edge-functions
```

---

## Conclusion

The tenant provisioning system has **critical authorization bugs** that prevent all provisioning attempts. The root cause is a mismatch between:
- Edge Function (checks `employees` table)
- Database function (checks `profiles` table) 
- Admin user data (only in `employees`, not `profiles`)

**Immediate fix**: Add admin to `profiles` table  
**Proper fix**: Update database function to check `employees` table  
**Long-term**: Standardize user model and authorization flow

All fixes are documented above with step-by-step instructions.
