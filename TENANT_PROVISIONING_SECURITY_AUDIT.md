# Tenant Provisioning Security Audit & Fixes
**Date**: October 23, 2025  
**Status**: CRITICAL SECURITY REVIEW  
**Author**: Senior Developer AI Agent

## Executive Summary

This audit reviews the tenant provisioning system for **data isolation**, **credential security**, **authorization**, and **data leakage prevention**. Multiple critical and high-severity issues have been identified and **MUST be fixed immediately**.

---

## 🔴 CRITICAL Issues Found

### 1. **Race Condition in Owner ID Assignment** (P0 - CRITICAL)
**Location**: `supabase/functions/tenant-provisioning/index.ts` (Lines 319-338)

**Problem**:
```typescript
// Step 1: Database creates placeholder UUID
v_owner_id := gen_random_uuid();  // Placeholder ID

// Step 2: Tenant created with placeholder ID
INSERT INTO tenants (owner_id, ...) VALUES (v_owner_id, ...);

// Step 3: Auth user created with DIFFERENT ID
const { data: authUser } = await supabase.auth.admin.createUser(...);

// Step 4: Update tenant with REAL auth ID
await supabase.from('tenants').update({ owner_id: authUser.user.id });
```

**Security Risk**:
- **Window of vulnerability**: Between steps 2 and 4, `tenant.owner_id` points to **non-existent user**
- **RLS bypass potential**: If update fails, tenant has wrong owner_id forever
- **Data leak**: Queries using `tenant.owner_id` for authorization will fail or return wrong data

**Impact**: **CRITICAL** - Complete authorization bypass possible

---

### 2. **No Email Uniqueness Enforcement Across Tenants** (P0 - CRITICAL)
**Location**: `check_owner_email_availability` function

**Problem**:
```sql
-- Current check only validates against auth.users and profiles
-- Does NOT check if email is already a tenant owner in tenants table
SELECT 1 FROM tenants WHERE email = p_email;  -- MISSING!
```

**Security Risk**:
- **Same email can own multiple tenants** if one uses `tenants.email` and another uses `owner` object
- **Credential confusion**: User gets multiple tenants with same credentials
- **Data leakage**: User might access wrong tenant's data via auto_provisioning

**Impact**: **CRITICAL** - Data mixing between tenants

---

### 3. **Insecure Password Transmission** (P0 - CRITICAL)
**Location**: `supabase/functions/tenant-provisioning/index.ts` (Line 341)

**Problem**:
```typescript
ownerCredentials: {
  email: ownerEmail,
  password: ownerPassword,  // PLAINTEXT in response!
  temporaryPassword: true,
}
```

**Security Risk**:
- **Password logged in Edge Function logs** (Supabase retains logs)
- **Password visible in browser DevTools Network tab**
- **Password sent over network** (even with HTTPS, still logged)
- **Password may be cached by proxies/CDNs**

**Impact**: **CRITICAL** - Credential exposure, compliance violation (GDPR, SOC2)

---

### 4. **Missing Tenant Isolation in RLS Policies** (P1 - HIGH)
**Location**: Various tables (bookings, restaurant_tables, business_hours, etc.)

**Problem**:
```sql
-- Current RLS pattern
CREATE POLICY "Tenant isolation" ON bookings
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);
```

**Security Risk**:
- **Assumes `auto_provisioning.status = 'completed'`** but provisioning sets `status = 'pending'` initially
- **Window of vulnerability**: User can't access data until Edge Function completes
- **If Edge Function fails**: User locked out permanently with `status = 'pending'`

**Impact**: **HIGH** - Users unable to access their data, support burden

---

### 5. **No Verification of Auto-Provisioning Completion** (P1 - HIGH)
**Location**: `supabase/functions/tenant-provisioning/index.ts` (Lines 333-337)

**Problem**:
```typescript
// Database sets status='pending'
INSERT INTO auto_provisioning (..., status='pending', ...);

// Edge Function updates to 'completed'
await supabase.from('auto_provisioning').update({ 
  user_id: authUser.user.id, 
  status: 'completed' 
});

// BUT: No error handling if update fails!
// No verification that status changed!
```

**Security Risk**:
- **Silent failures**: If update fails, user created but status stuck at `pending`
- **Permanent lockout**: RLS policies block access forever
- **No retry mechanism**: Failed provisions must be manually fixed

**Impact**: **HIGH** - Users locked out, manual intervention required

---

## 🟡 MEDIUM Issues Found

### 6. **Idempotency Key Not Unique Constraint** (P2 - MEDIUM)
**Location**: `provisioning_requests` table

**Problem**:
```sql
-- No UNIQUE constraint on idempotency_key
-- Allows duplicate requests with same key
```

**Security Risk**:
- **Race conditions**: Two admins submit same request simultaneously
- **Duplicate tenants**: Both requests succeed, creating 2 tenants
- **Audit trail corruption**: Two requests with same idempotency key

**Impact**: **MEDIUM** - Duplicate tenant creation possible

---

### 7. **Weak Password Requirements** (P2 - MEDIUM)
**Location**: `generateSecurePassword` function

**Problem**:
```typescript
const length = 16;  // Good
// BUT: No enforcement in validation
// No check for dictionary words
// No check for common patterns
```

**Security Risk**:
- **Predictable passwords**: Random but not checked against breached password database
- **No rotation policy**: Password never expires
- **No complexity requirements** enforced on user password change

**Impact**: **MEDIUM** - Weak credential security

---

### 8. **Slug Collision Possible with Deleted Tenants** (P2 - MEDIUM)
**Location**: Slug validation logic

**Problem**:
```sql
-- Check only active tenants
SELECT 1 FROM tenants WHERE slug = p_tenant_slug;

-- But what if tenant was soft-deleted?
-- Slug becomes available again!
```

**Security Risk**:
- **Slug reuse**: New tenant gets old tenant's slug
- **SEO confusion**: Search engines may confuse old/new tenants
- **Customer confusion**: "I thought this was Restaurant X?"

**Impact**: **MEDIUM** - Brand confusion, potential data leakage

---

## 🔵 LOW Issues Found

### 9. **No Rate Limiting on Provisioning** (P3 - LOW)
**Problem**: Admin can create unlimited tenants rapidly

**Impact**: **LOW** - DoS potential, billing issues

---

### 10. **No Audit Logging of Provisioning Events** (P3 - LOW)
**Problem**: No comprehensive audit trail (who, when, what, why)

**Impact**: **LOW** - Compliance issues, hard to debug

---

## ✅ COMPREHENSIVE FIX PLAN

### Phase 1: CRITICAL FIXES (Deploy TODAY)

#### Fix #1: Atomic Owner ID Assignment
**File**: `supabase/functions/tenant-provisioning/index.ts`

**Strategy**: Create auth user FIRST, then use real ID

```typescript
// WRONG (current):
const ownerId = gen_random_uuid();
// Create tenant with placeholder
// Create auth user
// Update tenant with real ID

// RIGHT (new):
// Create auth user FIRST
const { data: authUser } = await supabase.auth.admin.createUser(...);
const ownerId = authUser.user.id;
// THEN create tenant with REAL ID (atomic)
const { data } = await supabase.rpc('provision_tenant_atomic', {
  p_owner_id: ownerId,  // Real auth ID
  ...
});
```

**Result**: **Zero-window vulnerability**, atomic operation

---

#### Fix #2: Email Uniqueness Across All Tables
**File**: Migration `20251023_enforce_email_uniqueness.sql`

```sql
-- Comprehensive email uniqueness check
CREATE OR REPLACE FUNCTION check_owner_email_availability(p_email TEXT)
RETURNS TABLE(available BOOLEAN, reason TEXT) AS $$
BEGIN
  p_email := LOWER(TRIM(p_email));
  
  -- Check auth.users (Supabase Auth)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN QUERY SELECT FALSE, 'Email already registered in authentication system';
    RETURN;
  END IF;
  
  -- Check profiles table
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN QUERY SELECT FALSE, 'Email already registered to a user profile';
    RETURN;
  END IF;
  
  -- *** NEW: Check tenants table ***
  IF EXISTS (SELECT 1 FROM tenants WHERE email = p_email) THEN
    RETURN QUERY SELECT FALSE, 'Email already used as tenant contact email';
    RETURN;
  END IF;
  
  -- *** NEW: Check employees table ***
  IF EXISTS (SELECT 1 FROM employees WHERE email = p_email) THEN
    RETURN QUERY SELECT FALSE, 'Email already registered to an employee';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Email is available';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### Fix #3: Remove Password from Response
**File**: `supabase/functions/tenant-provisioning/index.ts`

**Strategy**: Use password reset email instead

```typescript
// WRONG (current):
return {
  ownerCredentials: {
    password: ownerPassword  // NEVER DO THIS!
  }
};

// RIGHT (new):
// Create user with random password
const tempPassword = generateSecurePassword();
await supabase.auth.admin.createUser({
  email: ownerEmail,
  password: tempPassword,
  email_confirm: false,  // Require email verification
});

// Send password reset email
await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: ownerEmail,
});

// Return SAFE response
return {
  ownerCredentials: {
    email: ownerEmail,
    setupLinkSent: true,
    message: "Password setup email sent. User must verify email and set password."
  }
};
```

**Result**: **Zero password exposure**, email verification enforced

---

#### Fix #4: Fix RLS Policies for Pending Status
**File**: Migration `20251023_fix_rls_pending_status.sql`

```sql
-- WRONG (current):
CREATE POLICY "Tenant isolation" ON bookings
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'  -- TOO STRICT!
  )
);

-- RIGHT (new):
CREATE OR REPLACE POLICY "Tenant isolation" ON bookings
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() 
    AND status IN ('completed', 'pending')  -- Allow pending!
    AND user_id IS NOT NULL  -- Ensure user_id set
  )
);
```

---

#### Fix #5: Verification & Rollback on Failure
**File**: `supabase/functions/tenant-provisioning/index.ts`

```typescript
try {
  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser(...);
  
  if (authError) throw new Error(`Auth creation failed: ${authError.message}`);
  
  // Update tenant
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({ owner_id: authUser.user.id, status: 'active' })
    .eq('id', tenantId);
  
  if (tenantError) {
    // ROLLBACK: Delete auth user
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Tenant update failed: ${tenantError.message}`);
  }
  
  // Update auto_provisioning
  const { error: provError } = await supabase
    .from('auto_provisioning')
    .update({ user_id: authUser.user.id, status: 'completed' })
    .eq('tenant_id', tenantId);
  
  if (provError) {
    // ROLLBACK: Delete auth user AND tenant
    await supabase.auth.admin.deleteUser(authUser.user.id);
    await supabase.from('tenants').delete().eq('id', tenantId);
    throw new Error(`Provisioning update failed: ${provError.message}`);
  }
  
  // *** VERIFICATION STEP ***
  const { data: verification } = await supabase
    .from('auto_provisioning')
    .select('status, user_id')
    .eq('tenant_id', tenantId)
    .single();
  
  if (verification.status !== 'completed' || verification.user_id !== authUser.user.id) {
    throw new Error('Verification failed: auto_provisioning not updated correctly');
  }
  
} catch (rollbackError) {
  // Mark provisioning_request as failed
  await supabase
    .from('provisioning_requests')
    .update({ status: 'failed', error_message: rollbackError.message })
    .eq('idempotency_key', idempotencyKey);
  
  throw rollbackError;
}
```

---

### Phase 2: HIGH PRIORITY FIXES (Deploy This Week)

#### Fix #6: Idempotency Key Unique Constraint

```sql
-- Add unique constraint
ALTER TABLE provisioning_requests 
ADD CONSTRAINT provisioning_requests_idempotency_key_unique 
UNIQUE (idempotency_key);

-- Add index for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisioning_requests_idempotency_key
ON provisioning_requests(idempotency_key);
```

---

#### Fix #7: Slug Soft-Delete Handling

```sql
-- Add deleted_at column
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Update slug validation
CREATE OR REPLACE FUNCTION validate_slug_availability(p_slug TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE slug = p_slug 
    AND deleted_at IS NULL  -- Only check active tenants
  );
END;
$$ LANGUAGE plpgsql;
```

---

### Phase 3: MEDIUM PRIORITY FIXES (Deploy Next Week)

#### Fix #8: Rate Limiting

```sql
-- Add rate limiting table
CREATE TABLE IF NOT EXISTS provisioning_rate_limits (
  admin_user_id UUID NOT NULL,
  window_start TIMESTAMP NOT NULL,
  request_count INT DEFAULT 1,
  PRIMARY KEY (admin_user_id, window_start)
);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_provisioning_rate_limit(
  p_admin_user_id UUID,
  p_max_per_hour INT DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM provisioning_rate_limits
  WHERE admin_user_id = p_admin_user_id
  AND window_start > NOW() - INTERVAL '1 hour';
  
  RETURN v_count < p_max_per_hour;
END;
$$ LANGUAGE plpgsql;
```

---

#### Fix #9: Comprehensive Audit Logging

```sql
CREATE TABLE IF NOT EXISTS tenant_provisioning_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  admin_email TEXT,
  tenant_id UUID,
  tenant_slug TEXT,
  owner_email TEXT,
  action TEXT NOT NULL,  -- 'initiated', 'completed', 'failed', 'rolled_back'
  idempotency_key UUID,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add audit trigger
CREATE OR REPLACE FUNCTION log_provisioning_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_provisioning_audit (...)
  VALUES (...);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛡️ DATA ISOLATION VERIFICATION CHECKLIST

### ✅ Tenant Data Separation
- [x] Each tenant has unique `tenant_id` (UUID)
- [x] All tenant-scoped tables have `tenant_id` foreign key
- [x] RLS policies enforce `tenant_id` checks on ALL operations
- [ ] **FIX NEEDED**: RLS allows `status='pending'` for initial access
- [ ] **FIX NEEDED**: Verify no cross-tenant queries possible

### ✅ Owner Authentication
- [ ] **FIX NEEDED**: Owner ID set atomically (no placeholder UUID)
- [x] Owner auth user created in `auth.users`
- [x] Owner profile created in `profiles` table
- [ ] **FIX NEEDED**: Email uniqueness enforced across ALL tables
- [ ] **FIX NEEDED**: Password never transmitted in API response

### ✅ Authorization Model
- [x] Admin users in `employees` table with `SUPER_ADMIN`/`ADMIN` roles
- [x] Tenant owners in `profiles` table with `tenant_owner` role
- [x] `auto_provisioning` table maps `user_id` → `tenant_id`
- [ ] **FIX NEEDED**: RLS policies accept `pending` status during provisioning

### ✅ Credentials Security
- [ ] **FIX NEEDED**: Passwords sent via email reset link, not API
- [x] Passwords hashed by Supabase Auth (bcrypt)
- [ ] **FIX NEEDED**: Password complexity requirements enforced
- [ ] **FIX NEEDED**: Password rotation policy implemented

### ✅ Audit Trail
- [x] `provisioning_requests` table tracks all attempts
- [ ] **FIX NEEDED**: Comprehensive audit log with admin actions
- [ ] **FIX NEEDED**: Failed provisions logged with error details

---

## 🚨 DEPLOYMENT PLAN

### Immediate (Today)
1. Create auth user FIRST before database records
2. Remove password from API response
3. Send password reset email instead
4. Fix RLS policies to allow `pending` status
5. Add verification + rollback logic

### This Week
6. Add email uniqueness checks (all tables)
7. Add idempotency key unique constraint
8. Add slug soft-delete handling

### Next Week
9. Implement rate limiting
10. Add comprehensive audit logging
11. Add password complexity requirements

---

## 📊 RISK ASSESSMENT SUMMARY

| Issue | Severity | Impact | Likelihood | Risk Score |
|-------|----------|--------|------------|------------|
| Race condition in owner ID | P0 | CRITICAL | High | 9.5/10 |
| Email uniqueness missing | P0 | CRITICAL | Medium | 8.5/10 |
| Password exposure | P0 | CRITICAL | High | 9.0/10 |
| RLS policy too strict | P1 | HIGH | High | 7.5/10 |
| No provisioning verification | P1 | HIGH | Medium | 7.0/10 |
| Idempotency not enforced | P2 | MEDIUM | Low | 5.0/10 |
| Weak password policy | P2 | MEDIUM | Medium | 6.0/10 |
| Slug collision | P2 | MEDIUM | Low | 4.5/10 |

**Overall Risk**: **CRITICAL** - Multiple P0 issues require immediate fixes

---

## ✅ CONCLUSION

The current tenant provisioning system has **CRITICAL security vulnerabilities** that must be fixed immediately to prevent:

1. ❌ **Data leakage** between tenants
2. ❌ **Credential exposure** in logs and network traffic
3. ❌ **Authorization bypass** via race conditions
4. ❌ **User lockout** from RLS policy strictness

**Recommendation**: **DO NOT USE IN PRODUCTION** until all P0 and P1 fixes are deployed.

**Estimated Fix Time**: 
- P0 fixes: 4-6 hours
- P1 fixes: 2-3 hours
- P2 fixes: 3-4 hours
**Total**: 9-13 hours of development + testing

---

**Next Steps**: Review this audit, approve fix plan, begin implementation immediately.
