# Tenant Provisioning Fix - Deployment Guide

**Date**: October 22, 2025  
**Status**: ✅ Ready for Deployment  
**Priority**: CRITICAL - Fixes 500 errors and orphaned tenants

---

## Summary of Changes

### ✅ Completed Work

1. **Created Atomic Provisioning Migration** (`20251022_fix_tenant_provisioning_atomic.sql`)
   - Creates `provisioning_requests` table for idempotency tracking
   - Adds `check_owner_email_availability()` function for pre-flight validation
   - Creates `provision_tenant_atomic()` function with transaction rollback
   - Adds `mark_provisioning_failed()` helper function
   - Relaxes `owner_id` constraint to allow NULL during `provisioning` status
   - Removes old strict validation trigger

2. **Refactored tenant-provisioning Edge Function**
   - New clean version (459 lines, down from 778)
   - Uses atomic database function instead of multi-step process
   - Pre-flight email validation before ANY operations
   - Proper error handling with rollback support
   - Creates auth user AFTER database operations complete
   - Updates tenant with actual auth user ID

3. **Updated Documentation**
   - `TENANT_PROVISIONING_AUDIT.md` - Detailed analysis of 5 critical issues
   - This deployment guide

---

## Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard** → SQL Editor
2. **Copy the entire migration SQL** from `supabase/migrations/20251022_fix_tenant_provisioning_atomic.sql`
3. **Paste and run** in the SQL Editor
4. **Verify output**: Should see all tables/functions created successfully
5. **Test email validation**:
   ```sql
   SELECT * FROM check_owner_email_availability('test@example.com');
   ```

### Option 2: Via Supabase CLI

The migration file has issues with `supabase db push` due to multi-statement limitations.  
**Workaround**: Use Option 1 above (dashboard) instead.

### Step 2: Deploy Edge Function

```powershell
cd "c:\Users\Drood\Desktop\Blunari SAAS\supabase\functions\tenant-provisioning"
supabase functions deploy tenant-provisioning
```

Expected output:
```
Deploying tenant-provisioning...
Deploy status for tenant-provisioning:
  • Version: [timestamp]
  • Status: ACTIVE
```

### Step 3: Verify Deployment

1. **Check function exists**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'provision_tenant_atomic';
   ```

2. **Check table exists**:
   ```sql
   SELECT COUNT(*) FROM provisioning_requests;
   ```

3. **Test email validation**:
   ```sql
   SELECT * FROM check_owner_email_availability('admin@blunari.ai');
   -- Should return: available=false, reason='Email is already registered...'
   ```

---

## Testing Checklist

### Test 1: Provision New Tenant with Unique Email

1. **Go to Admin Dashboard** → Tenant Provisioning
2. **Fill out form**:
   - Name: `Test Restaurant`
   - Slug: `test-restaurant`
   - Owner Email: `owner@test-restaurant-unique.com` (MUST be unique!)
3. **Submit** and watch for success
4. **Verify** in database:
   ```sql
   SELECT t.name, t.email, t.owner_id, u.email as owner_email
   FROM tenants t
   LEFT JOIN auth.users u ON u.id = t.owner_id
   WHERE t.slug = 'test-restaurant';
   ```
5. **Expected**: tenant.email matches owner.email, owner_id is set, status = 'active'

### Test 2: Try to Provision with Duplicate Email

1. **Try to create another tenant** with same owner email
2. **Expected**: Clear error message: "Email is already registered..."
3. **Verify**: No orphaned tenant created

### Test 3: Try to Provision with Admin Email

1. **Try to create tenant** with email `admin@blunari.ai`
2. **Expected**: Clear error: "Email is already registered..."
3. **Verify**: No tenant created

### Test 4: Concurrent Provisioning (Advanced)

1. **Open two browser tabs** with admin dashboard
2. **Start provisioning same slug** in both tabs simultaneously
3. **Expected**: One succeeds, one fails with "Slug already taken" or "already in progress"
4. **Verify**: Only ONE tenant created, no duplicates

---

## Rollback Plan

If deployment causes issues:

1. **Drop new functions**:
   ```sql
   DROP FUNCTION IF EXISTS provision_tenant_atomic CASCADE;
   DROP FUNCTION IF EXISTS check_owner_email_availability CASCADE;
   DROP FUNCTION IF EXISTS mark_provisioning_failed CASCADE;
   ```

2. **Drop new table**:
   ```sql
   DROP TABLE IF EXISTS provisioning_requests CASCADE;
   ```

3. **Restore old constraint**:
   ```sql
   ALTER TABLE tenants ALTER COLUMN owner_id SET NOT NULL;
   ```

4. **Re-deploy old tenant-provisioning Edge Function** from git history

---

## What This Fixes

### Before (Broken):
- ❌ Tenant created FIRST, owner SECOND → if owner fails, orphaned tenant
- ❌ Email conflicts silently reuse existing users → shared owners
- ❌ Race conditions create duplicate tenants
- ❌ No rollback on failures → partial provisioning
- ❌ Generic "500 Internal Server Error" messages

### After (Fixed):
- ✅ Pre-flight email validation BEFORE any database operations
- ✅ Atomic transaction → all-or-nothing provisioning
- ✅ Idempotency tracking prevents duplicates
- ✅ Clear error messages with specific reasons
- ✅ Automatic rollback on ANY failure
- ✅ Each tenant MUST have unique owner email

---

## Migration SQL Location

**File**: `c:\Users\Drood\Desktop\Blunari SAAS\supabase\migrations\20251022_fix_tenant_provisioning_atomic.sql`

**Size**: ~230 lines

**Safe to Run**: Yes - uses `IF NOT EXISTS` and `CREATE OR REPLACE` where appropriate

---

## Next Steps After Deployment

1. ✅ Test provisioning with new tenant (unique email)
2. ✅ Audit existing tenants for shared owners:
   ```sql
   SELECT owner_id, COUNT(*) as tenant_count, array_agg(name) as tenants
   FROM tenants
   GROUP BY owner_id
   HAVING COUNT(*) > 1;
   ```
3. ✅ Fix any tenants with shared owners (create dedicated owner accounts)
4. ✅ Update `TENANT_PROVISIONING_AUDIT.md` with test results
5. ✅ Monitor production for 24 hours

---

## Support

If you encounter issues:

1. **Check Supabase Edge Function Logs**:
   - Dashboard → Edge Functions → tenant-provisioning → Logs

2. **Check Database Logs**:
   ```sql
   SELECT * FROM provisioning_requests ORDER BY created_at DESC LIMIT 10;
   ```

3. **Check for Failed Provisions**:
   ```sql
   SELECT * FROM provisioning_requests WHERE status = 'failed';
   ```

---

**Ready to deploy? Start with Option 1 (Supabase Dashboard SQL Editor).**
