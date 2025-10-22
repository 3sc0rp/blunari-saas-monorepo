# Tenant Provisioning System - Deep Audit & Fixes

**Date**: October 22, 2025
**Status**: 🔴 CRITICAL ISSUES FOUND

## Executive Summary

The tenant provisioning system has **CRITICAL FLAWS** that cause data integrity issues, duplicate users, and the 500 errors you're experiencing. The main problem is that **email addresses can be shared between tenants and admin users**, leading to confused ownership.

---

## Critical Issues Found

### 🔴 ISSUE 1: No Enforcement of Unique Owner Emails
**Location**: `supabase/functions/tenant-provisioning/index.ts` lines 467-490

**Problem**:
```typescript
// The function checks if a user exists, then THROWS an error
if (checkData.users && checkData.users.length > 0) {
  throw new Error(`Email ${email} is already registered...`);
}
```

**But this check happens AFTER the tenant is already created in the database!**

**Impact**:
- Tenant is created with email (e.g., `addictedave@gmail.com`)
- System tries to create owner with same email
- Owner creation fails because email exists
- Tenant is left orphaned with no owner
- `owner_id` points to wrong user or remains NULL (violates constraint)

**Evidence**: Warrior Factory tenant had:
- Tenant email: `addictedave@gmail.com`
- Owner: `naturevillage2024@gmail.com` (wrong user!)

---

### 🔴 ISSUE 2: Validation Constraint Prevents NULL owner_id
**Location**: Database function `validate_tenant_owner()`

**Problem**:
```sql
-- This function throws an error if owner_id is NULL
CREATE FUNCTION validate_tenant_owner() ...
RAISE EXCEPTION 'owner_id cannot be NULL';
```

**But the provisioning flow tries to**:
1. Create tenant first (with owner_id = NULL temporarily)
2. Then create owner user
3. Then update tenant with owner_id

**This breaks because step 1 fails the validation!**

**Impact**:
- Cannot use the "create tenant, then owner, then link" pattern
- Must create owner FIRST, which causes race conditions
- If owner creation fails, tenant creation also fails
- Leads to partial provisioning failures

---

### 🔴 ISSUE 3: Race Condition in Concurrent Provisioning
**Location**: `tenant-provisioning/index.ts` lines 467-577

**Problem**:
The function has retry logic for race conditions, but it's **flawed**:

```typescript
if (createUserError.message.includes('duplicate')) {
  // Fetches existing user and reuses it
  return { userId: retryData.users[0].id, isNewUser: false };
}
```

**This is WRONG** because:
- If two tenants are provisioned simultaneously with same email
- Both get the SAME user as owner
- One tenant overwrites the other's owner_id
- Leads to shared owners (Nature Village + Warrior Factory scenario)

**Impact**:
- Multiple tenants can share the same owner account
- Breaks tenant isolation
- Admin updates affect wrong tenant
- Security risk: one tenant can access another's data

---

### 🔴 ISSUE 4: No Rollback on Partial Failures
**Location**: Entire `tenant-provisioning/index.ts`

**Problem**:
The provisioning process is **NOT ATOMIC**:

```
1. Create tenant → SUCCESS
2. Create owner → FAIL (email exists)
3. No rollback of step 1!
```

**Impact**:
- Orphaned tenants in database
- Tenants with no owner
- Tenants with wrong owner
- Database integrity violated
- Manual cleanup required (what you've been doing)

---

### 🔴 ISSUE 5: manage-tenant-credentials Assumptions
**Location**: `supabase/functions/manage-tenant-credentials/index.ts`

**Problem**:
This function assumes:
1. Tenant always has a valid `owner_id`
2. If `owner_id` is null, it can set it to null temporarily
3. It can create owner on-the-fly

**But**:
- Database constraint prevents `owner_id = NULL`
- Creating owner requires knowing tenant email
- If tenant email conflicts with existing user, fails
- No coordination with provisioning flow

---

## Root Cause Analysis

**The fundamental design flaw is**:

```
TENANT ← owns → OWNER (auth.users)
  ↓                    ↓
email field        email (must be unique)
```

**Problem**: No enforcement that tenant.email matches owner.email!

**Current broken flow**:
1. Admin creates tenant with `email = "addictedave@gmail.com"`
2. System tries to create owner with `email = "addictedave@gmail.com"`
3. Email already exists (maybe from another tenant or admin)
4. System panics and uses existing user
5. Tenant gets wrong owner!

---

## Proposed Fixes

### ✅ FIX 1: Atomic Provisioning with Transaction
**Create a database function that does everything atomically**:

```sql
CREATE OR REPLACE FUNCTION provision_tenant_atomic(
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_owner_email TEXT,
  p_owner_password TEXT,
  ...
) RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Step 1: Create owner user (this calls auth.users internally)
  v_owner_id := create_owner_user(p_owner_email, p_owner_password);
  
  -- Step 2: Create tenant with owner_id
  INSERT INTO tenants (name, slug, owner_id, email, ...)
  VALUES (p_tenant_name, p_tenant_slug, v_owner_id, p_owner_email, ...)
  RETURNING id INTO v_tenant_id;
  
  -- Step 3: Create auto_provisioning
  INSERT INTO auto_provisioning (user_id, tenant_id, ...)
  VALUES (v_owner_id, v_tenant_id, ...);
  
  -- Step 4: Create profile
  INSERT INTO profiles (user_id, email, role)
  VALUES (v_owner_id, p_owner_email, 'tenant_owner');
  
  RETURN json_build_object(
    'tenant_id', v_tenant_id,
    'owner_id', v_owner_id,
    'success', true
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on ANY error
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### ✅ FIX 2: Unique Constraint on Tenant Ownership
**Ensure one email = one tenant**:

```sql
-- Option A: Make tenant.email unique
ALTER TABLE tenants ADD CONSTRAINT tenants_email_unique UNIQUE (email);

-- Option B: Create a composite check
CREATE UNIQUE INDEX idx_tenant_owner_email 
ON tenants (owner_id) 
WHERE owner_id IS NOT NULL;
```

---

### ✅ FIX 3: Pre-Flight Email Validation
**Check email availability BEFORE starting provisioning**:

```typescript
// In tenant-provisioning Edge Function
const validateOwnerEmail = async (email: string): Promise<{valid: boolean, error?: string}> => {
  // Check if email is used by ANY auth user
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const emailExists = existingUsers?.users?.some(u => u.email === email);
  
  if (emailExists) {
    return { 
      valid: false, 
      error: `Email ${email} is already in use. Please use a unique email for each tenant owner.` 
    };
  }
  
  // Check if email is used in any tenant
  const { data: tenantWithEmail } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('email', email)
    .single();
  
  if (tenantWithEmail) {
    return { 
      valid: false, 
      error: `Email ${email} is already assigned to tenant "${tenantWithEmail.name}".` 
    };
  }
  
  return { valid: true };
};
```

---

### ✅ FIX 4: Remove owner_id NOT NULL Constraint
**Allow temporary NULL during provisioning**:

```sql
-- Migration to make owner_id nullable
ALTER TABLE tenants ALTER COLUMN owner_id DROP NOT NULL;

-- Add CHECK constraint instead
ALTER TABLE tenants ADD CONSTRAINT tenant_must_have_owner 
CHECK (
  -- Either owner_id is set, OR status is 'provisioning'
  owner_id IS NOT NULL OR status = 'provisioning'
);
```

---

### ✅ FIX 5: Idempotency with Unique Request IDs
**Use idempotency keys properly**:

```typescript
// Store provisioning attempts in separate table
CREATE TABLE provisioning_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key UUID NOT NULL UNIQUE,
  admin_user_id UUID NOT NULL,
  tenant_slug TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  tenant_id UUID REFERENCES tenants(id),
  owner_id UUID REFERENCES auth.users(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Check idempotency FIRST, before any operations
```

---

## Immediate Action Plan

### Phase 1: Stop the Bleeding (Today)
1. ✅ **Disable tenant provisioning** until fixes are deployed
2. ✅ **Audit existing tenants** for shared owners
3. ✅ **Fix broken tenants** (like Warrior Factory)

### Phase 2: Deploy Critical Fixes (This Week)
1. ✅ Create atomic provisioning database function
2. ✅ Update Edge Function to use atomic function
3. ✅ Add email uniqueness validation
4. ✅ Add provisioning_requests table for idempotency
5. ✅ Deploy and test with new tenant

### Phase 3: Data Cleanup (Next Week)
1. ✅ Identify all tenants with shared owners
2. ✅ Create dedicated owner accounts for each
3. ✅ Update auto_provisioning records
4. ✅ Verify tenant isolation

---

## Testing Checklist

Before deploying fixes:

- [ ] Test provisioning with unique email → SUCCESS
- [ ] Test provisioning with duplicate email → CLEAR ERROR
- [ ] Test provisioning with admin email → CLEAR ERROR
- [ ] Test concurrent provisioning same email → ONE SUCCESS, ONE FAILURE
- [ ] Test provisioning failure → NO ORPHANED TENANTS
- [ ] Test updating tenant email → OWNER EMAIL SYNCS
- [ ] Test deleting tenant → OWNER ACCOUNT REMAINS

---

## Files to Modify

1. `supabase/migrations/<timestamp>_fix_tenant_provisioning.sql` - NEW atomic function
2. `supabase/functions/tenant-provisioning/index.ts` - Use atomic function
3. `supabase/functions/manage-tenant-credentials/index.ts` - Better error handling
4. `apps/admin-dashboard/src/components/admin/TenantProvisioningWizard.tsx` - Better validation

---

## Success Criteria

✅ Each tenant has ONE unique owner email  
✅ No shared owner accounts between tenants  
✅ Provisioning is atomic (all or nothing)  
✅ Clear errors when email conflicts occur  
✅ No orphaned tenants in database  
✅ Idempotency prevents duplicate tenants  
✅ All existing tenants have valid owners  

---

**Would you like me to implement these fixes now?**
