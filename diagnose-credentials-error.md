# Diagnose: manage-tenant-credentials 500 Error

**Error**: `POST https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/manage-tenant-credentials 500 (Internal Server Error)`

---

## Most Likely Cause

The tenant you're trying to update **doesn't have an `auto_provisioning` record** or the **owner user doesn't have a profile**.

This is the issue we identified earlier that requires the database migration to be applied!

---

## The Problem Chain

1. **You click "Update Email"** in the tenant detail page
2. **Function looks for auto_provisioning record** for this tenant
3. **No record found** (because migration not applied yet)
4. **Function falls back** to looking up tenant by email
5. **Tenant might not have email** or **profile doesn't exist**
6. **Function throws 500 error**

---

## The Fix

You need to **apply the database migration** that we created earlier!

### Step 1: Apply APPLY-ALL-FIXES.sql

1. **Open Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
   ```

2. **Copy the SQL file**:
   - File: `scripts/fixes/APPLY-ALL-FIXES.sql`
   - Copy entire contents (340 lines)

3. **Paste and Run**:
   - Paste into SQL Editor
   - Click "Run"
   - Wait for completion (~10 seconds)

4. **Verify Success**:
   Look for these messages:
   ```
   ✅ provision_tenant function updated
   ✅ Created X auto_provisioning records
   ✅ All fixes applied successfully!
   ```

---

## What The Migration Fixes

The migration creates:

1. **auto_provisioning records** for all existing tenants
2. **profiles** for all tenant owners
3. **Updated provision_tenant function** for future tenants

Without these, the `manage-tenant-credentials` function can't:
- Find the tenant owner's user ID
- Update their email
- Update their password
- Generate new passwords

---

## Quick Test After Migration

After applying the migration:

1. **Hard refresh browser**: `Ctrl+Shift+R`
2. **Go back to tenant detail page**
3. **Try updating email again**
4. **Should work now!** ✅

---

## If Still Getting 500 Error

### Check 1: Verify Migration Ran

Run this in Supabase SQL Editor:
```sql
-- Check if auto_provisioning records exist
SELECT COUNT(*) as total_tenants FROM tenants;
SELECT COUNT(*) as with_provisioning 
FROM tenants t 
INNER JOIN auto_provisioning ap ON t.id = ap.tenant_id;

-- Should be equal!
```

### Check 2: Check Specific Tenant

Find the tenant ID from the URL (it's in the browser address bar):
```sql
-- Replace TENANT_ID with actual tenant ID
SELECT 
  t.id as tenant_id,
  t.name,
  t.email as tenant_email,
  ap.id as provisioning_id,
  ap.user_id as owner_user_id,
  ap.login_email as owner_email,
  p.email as profile_email
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
LEFT JOIN profiles p ON ap.user_id = p.user_id
WHERE t.id = 'TENANT_ID';
```

**Expected Result**:
- `provisioning_id` should NOT be null
- `owner_user_id` should NOT be null
- `owner_email` should have a value
- `profile_email` should match `owner_email`

### Check 3: Check Browser Console

Look for the detailed error in browser console:
```javascript
// Should show something like:
Error updating email: No tenant owner found. Tenant has no email and no provisioning record.
// OR
Error updating email: No user found with email xxx@example.com
// OR
Error updating email: Profile has NULL user_id
```

This will tell you exactly what's missing.

---

## Root Cause Analysis

### Why This Happened

The `manage-tenant-credentials` function was deployed **before** the database migration was applied.

The function expects:
1. ✅ Tenants to have `auto_provisioning` records
2. ✅ Owner users to have `profiles`
3. ✅ Profiles to have valid `user_id` links

But your database currently has:
1. ❌ Some tenants WITHOUT `auto_provisioning` records
2. ❌ Some owner users WITHOUT `profiles`
3. ❌ Some profiles with NULL `user_id`

### The Proper Order Should Be

1. **First**: Apply database migration ✅
2. **Then**: Deploy edge functions ✅ (already done)
3. **Finally**: Use the features ⏳ (what you're trying to do)

---

## Summary

**Problem**: 500 error when updating tenant credentials  
**Cause**: Missing auto_provisioning records and profiles  
**Solution**: Apply `APPLY-ALL-FIXES.sql` migration  
**Time**: 2 minutes to apply + test

---

## Quick Commands

### Apply Migration
```
1. Open: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Copy: scripts/fixes/APPLY-ALL-FIXES.sql
3. Paste and Run
4. Verify success messages
```

### Test After Migration
```
1. Hard refresh: Ctrl+Shift+R
2. Go to: Admin → Tenants → (select tenant) → Users tab
3. Click: "Update Email" or "Generate Password"
4. Should work! ✅
```

---

**Status**: Waiting for database migration to be applied  
**Blocker**: HIGH - All credential management features broken  
**ETA**: 2 minutes after migration applied

Once you apply the migration, the 500 error will be resolved! 🎯
