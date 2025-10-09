# Fix: Login Email Shows admin@blunari.ai Instead of Owner Email

## Problem

Looking at the tenant detail page:
- **Email (Owner Email)**: `owner-test-1759905296975@example.com` ✅ Correct
- **Login Email**: `admin@blunari.ai` ❌ Wrong

The "Login Email" should match the owner email, but it's showing the admin who created the tenant.

## Root Cause

The `auto_provisioning` table has a `user_id` field that should point to the **owner's user_id**, but it's currently pointing to the **admin's user_id** (who provisioned the tenant).

The UI fetches the login email by:
1. Getting `user_id` from `auto_provisioning`
2. Looking up that user in `profiles`
3. Displaying their email

### Why This Happened

The tenants were provisioned **before** the updated `provision_tenant` function was deployed. The old function (or manual process) set `user_id` to the admin's ID instead of the owner's ID.

## The Fix

You need to run a SQL script that updates `auto_provisioning.user_id` to point to the correct owner based on the `login_email` field.

### Run This in Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new

2. **First, check the mismatches** (copy this):

```sql
SELECT 
  ap.id,
  ap.restaurant_name,
  ap.user_id as current_user_id,
  p_current.email as current_email,
  ap.login_email as should_be_email,
  p_correct.user_id as correct_user_id
FROM auto_provisioning ap
LEFT JOIN profiles p_current ON ap.user_id = p_current.user_id
LEFT JOIN profiles p_correct ON ap.login_email = p_correct.email
WHERE ap.login_email != p_current.email
ORDER BY ap.created_at DESC;
```

This will show you which records have the wrong `user_id`.

3. **Then apply the fix** (copy the entire contents of `fix-autoprov-user-id-mismatch.sql`)

The script will:
- Show current mismatches
- Update `auto_provisioning.user_id` to match the owner (based on `login_email`)
- Verify the fix worked

## After Running the Fix

1. **Hard refresh the admin UI** (Ctrl+Shift+R)
2. **Go to the tenant detail page** (Users tab)
3. **Login Email should now show**: `owner-test-1759905296975@example.com` ✅

## Why This Matters

The `user_id` in `auto_provisioning` is used to:
- Display the correct login email in the admin UI
- Track who the owner is
- Associate the owner with their tenant
- Manage user access and permissions

Having the wrong user_id means:
- ❌ Admin UI shows wrong login email
- ❌ Owner may not be able to access their tenant properly
- ❌ Audit logs may be confusing
- ❌ User management features won't work correctly

## Prevention

The updated `provision_tenant` function now correctly sets:
```sql
INSERT INTO auto_provisioning (
  user_id,  -- Set to p_owner_user_id (the actual owner)
  login_email,  -- Set to p_owner_email
  ...
)
```

All **new tenants** will have the correct user_id automatically! ✅

## Files to Use

1. **check-autoprov-user-mismatch.sql** - Diagnostic query to see the problem
2. **fix-autoprov-user-id-mismatch.sql** - Fix script (USE THIS)

## Quick Steps

1. Open Supabase SQL Editor
2. Copy contents of `fix-autoprov-user-id-mismatch.sql`
3. Paste and click **RUN**
4. Hard refresh admin UI
5. Check tenant detail page - Login Email should be correct! ✅

---

## Technical Details

### The Data Flow

**Current (Wrong)**:
```
admin@blunari.ai creates tenant
  ↓
auto_provisioning.user_id = admin's UUID (6a853fe6...)
  ↓
UI looks up profiles.email WHERE user_id = 6a853fe6...
  ↓
Shows "admin@blunari.ai" ❌
```

**After Fix (Correct)**:
```
admin@blunari.ai creates tenant for owner-test@example.com
  ↓
auto_provisioning.user_id = owner's UUID (7668eada...)
auto_provisioning.login_email = owner-test@example.com
  ↓
UI looks up profiles.email WHERE user_id = 7668eada...
  ↓
Shows "owner-test@example.com" ✅
```

### The Update Query

```sql
UPDATE auto_provisioning ap
SET user_id = p.user_id
FROM profiles p
WHERE ap.login_email = p.email
  AND ap.user_id != p.user_id
  AND ap.login_email IS NOT NULL;
```

This matches the `login_email` (which is correct) with the `profiles` table to find the correct `user_id`, then updates it.
