# Remaining Adjustments for Tenant Provisioning Fix

**Date**: October 22, 2025  
**Status**: ⚠️ ACTION REQUIRED

---

## ✅ What's Already Done

1. ✅ Migration SQL created (`20251022_fix_tenant_provisioning_atomic.sql`)
2. ✅ Edge Function refactored and deployed (`tenant-provisioning`)
3. ✅ Admin dashboard already compatible (response format matches)
4. ✅ Documentation created (audit + deployment guide)

---

## 🔴 Critical: Migration Must Be Run Manually

**Problem**: The `supabase db push` command cannot handle multi-statement SQL files with function definitions.

**Solution**: Run the migration **manually via Supabase Dashboard SQL Editor**

### Step-by-Step:

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/[your-project-id]/sql

2. **Copy the ENTIRE migration file**:
   - File: `supabase/migrations/20251022_fix_tenant_provisioning_atomic.sql`
   - All 374 lines

3. **Paste into SQL Editor** and click "Run"

4. **Expected Output**:
   ```
   ✓ CREATE TABLE provisioning_requests
   ✓ CREATE FUNCTION check_owner_email_availability
   ✓ ALTER TABLE tenants (owner_id constraint)
   ✓ CREATE FUNCTION provision_tenant_atomic
   ✓ CREATE FUNCTION mark_provisioning_failed
   ✓ GRANT EXECUTE ON FUNCTION...
   ```

5. **Verify Installation**:
   ```sql
   -- Check table exists
   SELECT COUNT(*) FROM provisioning_requests;
   
   -- Check functions exist
   SELECT proname FROM pg_proc 
   WHERE proname IN ('provision_tenant_atomic', 'check_owner_email_availability');
   
   -- Test email validation
   SELECT * FROM check_owner_email_availability('test@example.com');
   ```

---

## ⚠️ Additional Adjustments Needed

### 1. Update Admin Dashboard Error Handling

**File**: `apps/admin-dashboard/src/components/admin/TenantProvisioningWizard.tsx`

**Current**: Already handles most error codes (DUPLICATE_SLUG, INVALID_SLUG, etc.)

**Add**: New error codes from atomic function:

```typescript
const errorMessages: Record<string, { title: string; description: string; action: string }> = {
  // ... existing codes ...
  
  // NEW: Add these error codes
  'EMAIL_UNAVAILABLE': {
    title: 'Email Already In Use',
    description: 'This email address is already registered to another tenant or user.',
    action: 'Please use a unique email address for each tenant owner.'
  },
  'EMAIL_VALIDATION_FAILED': {
    title: 'Email Validation Failed',
    description: 'Unable to validate the owner email address.',
    action: 'Please check the email format and try again.'
  },
  'DUPLICATE_REQUEST': {
    title: 'Provisioning Already In Progress',
    description: 'A provisioning request with this information is already being processed.',
    action: 'Please wait for the current request to complete, or refresh the page.'
  },
  'AUTH_USER_CREATION_FAILED': {
    title: 'Owner Account Creation Failed',
    description: 'Unable to create the authentication account for the tenant owner.',
    action: 'The email may be in use. Try a different owner email or contact support.'
  },
};
```

**Location**: Around line 290-330 in TenantProvisioningWizard.tsx

---

### 2. Add Migration to Migrations Tracking

**File**: `supabase/migrations/.gitkeep` or tracking document

**Action**: Ensure `20251022_fix_tenant_provisioning_atomic.sql` is tracked in version control

```powershell
# Commit the migration
git add supabase/migrations/20251022_fix_tenant_provisioning_atomic.sql
git commit -m "feat: add atomic tenant provisioning with rollback support"
git push
```

---

### 3. Test Provisioning Flow End-to-End

**CRITICAL**: Test before considering this done

#### Test Case 1: Happy Path
```
1. Admin Dashboard → Tenant Provisioning
2. Fill form with UNIQUE owner email (e.g., owner@newrestaurant.com)
3. Submit
4. Expected: Success, owner credentials displayed
5. Verify: 
   - Tenant created with status='active'
   - Owner auth user created
   - tenant.email matches owner.email
   - auto_provisioning.status='completed'
```

#### Test Case 2: Duplicate Email
```
1. Try to provision with existing owner email
2. Expected: Clear error "Email Already In Use"
3. Verify: NO tenant created (no orphan)
```

#### Test Case 3: Duplicate Slug
```
1. Try to provision with existing slug
2. Expected: Clear error "Slug already taken"
3. Verify: NO tenant created
```

#### Test Case 4: Rollback on Failure
```
1. Temporarily break auth.users table (revoke permissions)
2. Try to provision
3. Expected: Error, NO partial tenant
4. Restore permissions
```

---

### 4. Monitor provisioning_requests Table

**Action**: Set up monitoring query

```sql
-- Check for failed provisioning attempts
SELECT 
  created_at,
  tenant_slug,
  owner_email,
  status,
  error_message
FROM provisioning_requests
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

**Set up alert** if `status='failed'` count > 0 in last hour

---

### 5. Clean Up Old Provisioning Code (Optional)

**Files to review for old code**:
- `apps/admin-dashboard/src/hooks/useTenantProvisioning.ts` - May have duplicate logic
- Any backup/old versions of `tenant-provisioning` Edge Function

**Action**: Archive or remove deprecated provisioning logic after confirming new system works

---

### 6. Update Documentation

**Files to update**:

1. **README.md** - Add note about atomic provisioning
2. **CATERING_START_HERE.md** - Update if it references tenant provisioning
3. **.github/copilot-instructions.md** - Update with new provisioning architecture

**Key points to document**:
- Tenant provisioning now uses atomic transactions
- Email uniqueness is enforced
- Idempotency prevents duplicate requests
- All operations rollback on failure

---

## 🎯 Priority Order

1. **CRITICAL** - Run migration in Supabase Dashboard SQL Editor
2. **HIGH** - Add new error codes to TenantProvisioningWizard.tsx
3. **HIGH** - Test end-to-end provisioning (all 4 test cases)
4. **MEDIUM** - Commit migration to git
5. **MEDIUM** - Set up monitoring for failed provisioning attempts
6. **LOW** - Clean up old code
7. **LOW** - Update documentation

---

## ✅ Success Criteria

- [ ] Migration runs successfully in Supabase
- [ ] All 3 functions created (provision_tenant_atomic, check_owner_email_availability, mark_provisioning_failed)
- [ ] provisioning_requests table exists
- [ ] Test Case 1 (happy path) passes
- [ ] Test Case 2 (duplicate email) shows clear error
- [ ] Test Case 3 (duplicate slug) shows clear error
- [ ] No orphaned tenants created on failures
- [ ] Admin dashboard shows meaningful error messages
- [ ] Owner credentials displayed after successful provisioning

---

## 🚨 Known Issues to Watch

1. **Supabase CLI limitation**: Cannot use `supabase db push` with multi-statement function definitions
2. **Manual migration required**: Must be run via dashboard (one-time inconvenience)
3. **Email case sensitivity**: Function normalizes to lowercase, but UI validation should match

---

## 📞 If Something Goes Wrong

**Rollback Steps** (see DEPLOYMENT_GUIDE_TENANT_PROVISIONING_FIX.md):
```sql
DROP FUNCTION IF EXISTS provision_tenant_atomic CASCADE;
DROP FUNCTION IF EXISTS check_owner_email_availability CASCADE;
DROP FUNCTION IF EXISTS mark_provisioning_failed CASCADE;
DROP TABLE IF EXISTS provisioning_requests CASCADE;
ALTER TABLE tenants ALTER COLUMN owner_id SET NOT NULL;
```

Then re-deploy old Edge Function from git history.

---

**Next Action**: Run the migration in Supabase Dashboard SQL Editor (Step 1 above)
