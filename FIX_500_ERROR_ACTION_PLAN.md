# IMMEDIATE ACTION PLAN - Fix 500 Error

## Current Situation

You're getting a **500 Internal Server Error** when trying to update a tenant's email. This is because the tenant you're testing with was created **before** we deployed the `owner_id` fix.

## Root Cause

The tenant has `owner_id = NULL` in the database, so the Edge Function can't find the owner user to update.

## Two Options to Fix

### ⚡ Option 1: Quick Fix (2 minutes) - Fix Existing Tenant

Run this in **Supabase Dashboard → SQL Editor**:

```sql
-- Open CHECK_TENANT_STATUS.sql and run it first to see the problem
-- Then run EMERGENCY_FIX_TENANT.sql to fix it
```

**Steps**:
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Copy contents of `CHECK_TENANT_STATUS.sql` and run it
3. You should see: "❌ NO OWNER_ID - NEEDS FIX" for your tenant
4. Copy contents of `EMERGENCY_FIX_TENANT.sql` and run it
5. Verify: Run `CHECK_TENANT_STATUS.sql` again - should now show "✅ OWNER PROPERLY CONFIGURED"
6. **Try the email update again** in admin dashboard - should work now!

### ✅ Option 2: Best Practice (3 minutes) - Create New Tenant

This uses the **fixed** `provision_tenant` function which automatically sets `owner_id`.

**Steps**:
1. Go to Admin Dashboard → Tenant Management
2. Click "Add New Tenant"
3. Fill in:
   - Name: "Test Restaurant v2"
   - Slug: "test-restaurant-v2"
   - **Owner Email**: Use a DIFFERENT email (not one that already exists)
   - Timezone: Any
   - Currency: USD
4. Click "Create Tenant"
5. Should succeed with success toast
6. **Try updating the email** - should work perfectly!

## What's Different Now?

### ✅ Fixed (Deployed)
- `provision_tenant` function now sets `owner_id` ✅
- `manage-tenant-credentials` validates `owner_id` exists ✅
- Better error messages (will tell you exactly what's wrong) ✅

### ⏳ Still Need to Do
- Fix existing tenants by running SQL script (Option 1)
- OR create new tenant to test (Option 2)

## Expected Behavior After Fix

### Create Tenant Flow:
1. Admin fills form → clicks "Create Tenant"
2. `tenant-provisioning` Edge Function creates auth user
3. Calls `provision_tenant` with `p_owner_user_id`
4. **NEW**: Tenant is created with `owner_id` set to that user ID ✅
5. Success!

### Update Email Flow:
1. Admin clicks "Update Email" on tenant
2. `manage-tenant-credentials` Edge Function:
   - Looks up tenant → finds `owner_id` ✅
   - Validates owner user exists ✅
   - Updates email in auth.users
   - Updates email in profiles
   - Updates email in tenants
3. Success toast appears!

## Testing After Fix

### Test 1: Create New Tenant
```bash
# In admin dashboard:
Name: "Integration Test Restaurant"
Slug: "integration-test"
Email: "owner-integration@test.com" (must be unique!)
```

Expected: Success, tenant created with owner_id set

### Test 2: Update Email
```bash
# Find the tenant you just created
# Click "Manage Credentials" or email update
# Change email to: "new-owner@test.com"
```

Expected: Success toast "Email updated successfully"

### Test 3: Verify in Database
```sql
SELECT 
  t.name,
  t.owner_id,
  p.email as owner_email,
  p.role
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.slug = 'integration-test';
```

Expected: owner_id populated, email matches new email, role = 'owner'

## If Still Getting Errors

### Error: "Tenant owner account is not properly configured"
**Cause**: The `owner_id` is still NULL (fix didn't apply)
**Fix**: Run `EMERGENCY_FIX_TENANT.sql` in Supabase SQL Editor

### Error: "Email already registered to another user"
**Cause**: The new email you're trying to use already exists in auth.users
**Fix**: Use a different email address

### Error: "Tenant owner user account not found"
**Cause**: The `owner_id` points to a user ID that doesn't exist in auth.users
**Fix**: 
1. Check Supabase Dashboard → Authentication → Users
2. Search for the user ID from `tenant.owner_id`
3. If not found, run `EMERGENCY_FIX_TENANT.sql` to use the correct user from auto_provisioning

## Files Reference

- **Diagnostic**: `CHECK_TENANT_STATUS.sql` - See what's wrong
- **Quick Fix**: `EMERGENCY_FIX_TENANT.sql` - Fix existing tenant
- **Full Fix**: `FIX_EXISTING_TENANTS_OWNER_ID.sql` - Fix ALL tenants
- **Testing Guide**: `QUICK_TEST_TENANT_OWNER_FIX.md` - Step-by-step testing

## Summary

✅ **All code fixes deployed**
✅ **New tenants will work perfectly**
⏳ **Just need to fix your existing test tenant** (2 minutes with SQL script)

**Next Action**: Run `CHECK_TENANT_STATUS.sql` then `EMERGENCY_FIX_TENANT.sql` in Supabase SQL Editor.
