# FINAL SOLUTION: Login Email Showing Wrong Email

## 🔍 Problem Confirmed

Query results show:
```
restaurant_name: Test Restaurant 1759905296975
login_email: owner-test-1759905296975@example.com  (correct)
profile_email: admin@blunari.ai  (wrong!)
status: ❌ Mismatch
```

## ✅ Root Cause Identified

The `auto_provisioning.user_id` is set correctly to the owner's UUID (created by the edge function), **BUT there's no profile for that user_id in the profiles table**.

When the UI tries to look up the email:
1. Gets `user_id` from `auto_provisioning` → Owner's UUID
2. Looks up `profiles` WHERE `user_id` = Owner's UUID → **NOT FOUND**
3. Falls back to something else (showing admin email)

## 🚀 THE FIX (Run This)

**File**: `FINAL-FIX-create-owner-profiles.sql`

This script will:
1. Create profiles for ALL owner users from `auto_provisioning`
2. Use the existing `user_id` (which is correct)
3. Set the email from `login_email` (which is correct)
4. Set role to 'owner'
5. Verify all emails now match

### Run in Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Copy **entire contents** of `FINAL-FIX-create-owner-profiles.sql`
3. Paste and click **RUN**
4. Should see all tenants with ✅ Fixed! status

## Expected Results

### Before Fix:
```sql
auto_provisioning.user_id = 7668eada-... (owner UUID)
  ↓
profiles WHERE user_id = 7668eada-... → NOT FOUND ❌
  ↓
Shows: admin@blunari.ai (fallback)
```

### After Fix:
```sql
INSERT INTO profiles:
  user_id = 7668eada-... (owner UUID)
  email = owner-test-1759905296975@example.com
  role = 'owner'
  ↓
auto_provisioning.user_id = 7668eada-...
  ↓
profiles WHERE user_id = 7668eada-... → FOUND ✅
  ↓
Shows: owner-test-1759905296975@example.com ✅
```

## Why This Happened

The provisioning flow:
1. ✅ Edge function creates owner user in `auth.users`
2. ✅ Edge function gets the new `user_id`  
3. ✅ Edge function calls `provision_tenant(user_id, email, ...)`
4. ✅ Database function stores `user_id` in `auto_provisioning`
5. ❌ **Profile creation step was missing or failed**

The old `provision_tenant` function didn't include the profile creation step. The updated version does (lines 94-107 in `fix-provision-tenant-with-auto-provisioning.sql`).

## After Running the Fix

1. **Hard refresh admin UI** (Ctrl+Shift+R)
2. **Go to tenant detail page** → Users tab
3. **Login Email should show**: `owner-test-1759905296975@example.com` ✅
4. **All tenants should be fixed**, not just this one

## Verify It Worked

Run this query:
```sql
SELECT 
  ap.restaurant_name,
  ap.login_email,
  p.email as profile_email,
  CASE WHEN ap.login_email = p.email THEN '✅' ELSE '❌' END
FROM auto_provisioning ap
JOIN profiles p ON ap.user_id = p.user_id;
```

All rows should show ✅

## Prevention for Future

Make sure `fix-provision-tenant-with-auto-provisioning.sql` is deployed to the database. This includes the profile creation step:

```sql
-- 4. Create or update profile for owner
INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
VALUES (p_owner_user_id, p_owner_email, 'Owner', '', 'owner')
ON CONFLICT (user_id) DO NOTHING;
```

All future tenants will automatically have profiles created! 🚀

---

## TL;DR - Quick Fix

1. Run `FINAL-FIX-create-owner-profiles.sql` in Supabase SQL Editor
2. Hard refresh admin UI (Ctrl+Shift+R)
3. Login emails will now show correctly ✅

The script creates the missing profiles using the correct user_id and email from `auto_provisioning`.
