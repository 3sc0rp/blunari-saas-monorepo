# Fix: Login Email Shows admin@blunari.ai - Owner Profiles Missing

## Problem Analysis

The query showed:
```
Fixed records: 0
Still mismatched: 1
```

This means the UPDATE query couldn't find matching profiles for the owner emails. The root cause is:

**Owner users don't have profiles in the `profiles` table!**

## Why This Happens

When tenants are provisioned, two things should happen:
1. ✅ Owner user is created in `auth.users` (Supabase auth)
2. ❌ Profile is NOT created in `profiles` table (missing!)

The admin UI looks up the email from `profiles` based on `auto_provisioning.user_id`, so it falls back to showing the admin's email.

## The Complete Fix (2 Steps)

### Step 1: Create Missing Owner Profiles

Run **`create-missing-owner-profiles.sql`** in Supabase SQL Editor:

This will:
1. Show which owner users are missing profiles
2. Create profiles for all owners from `auto_provisioning` data
3. Set their email to match `login_email`
4. Set role to 'owner'
5. Verify all owners now have profiles

### Step 2: Update auto_provisioning.user_id (If Needed)

After creating profiles, run **`fix-autoprov-user-id-mismatch.sql`** again:

This ensures `auto_provisioning.user_id` points to the correct owner.

## Quick Steps

1. **Open Supabase SQL Editor**:  
   https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new

2. **Run `create-missing-owner-profiles.sql`**:
   - Copy entire file contents
   - Paste in SQL editor
   - Click **RUN**
   - Should see: "Owners without profiles: 0" ✅

3. **Hard refresh admin UI** (Ctrl+Shift+R)

4. **Check tenant detail page**:
   - Login Email should now show the owner email! ✅

## What Each Script Does

### `create-missing-owner-profiles.sql` (Run This First)
```sql
-- Creates profiles for owner users who don't have them
INSERT INTO profiles (user_id, email, first_name, last_name, role)
SELECT user_id, login_email, 'Owner', '', 'owner'
FROM auto_provisioning
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auto_provisioning.user_id);
```

### `fix-autoprov-user-id-mismatch.sql` (Optional - Run After)
```sql
-- Updates auto_provisioning.user_id to match the correct owner
UPDATE auto_provisioning
SET user_id = profiles.user_id
WHERE auto_provisioning.login_email = profiles.email;
```

## Expected Results

### Before Fix:
```
auto_provisioning.user_id → admin UUID (6a853fe6...)
  ↓
profiles WHERE user_id = 6a853fe6...
  ↓
email = "admin@blunari.ai" ❌
```

### After Fix:
```
1. Create profile for owner:
   profiles.user_id = owner UUID (7668eada...)
   profiles.email = "owner-test@example.com"

2. auto_provisioning.user_id → owner UUID (7668eada...)
   ↓
   profiles WHERE user_id = 7668eada...
   ↓
   email = "owner-test@example.com" ✅
```

## Why Profiles Were Missing

Possible reasons:
1. **Old provisioning function**: Didn't create profiles automatically
2. **Trigger not working**: Profile creation trigger may not be set up
3. **Manual tenant creation**: Tenants created before profile logic was added
4. **Database migration**: Profiles table added later

## Prevention for Future Tenants

The updated `provision_tenant` function (in `fix-provision-tenant-with-auto-provisioning.sql`) includes:

```sql
-- 4. Create or update profile for owner
INSERT INTO public.profiles (
  user_id,
  email,
  first_name,
  last_name,
  role
)
VALUES (
  p_owner_user_id,
  p_owner_email,
  SPLIT_PART(COALESCE(p_tenant_data->>'owner_name', 'Owner'), ' ', 1),
  NULLIF(SPLIT_PART(COALESCE(p_tenant_data->>'owner_name', 'Owner'), ' ', 2), ''),
  'owner'
)
ON CONFLICT (user_id) DO NOTHING;
```

**Make sure this function is deployed** by running:
- `fix-provision-tenant-with-auto-provisioning.sql` ✅

All new tenants will automatically have profiles created! 🚀

## Verification

After running the fix, check:

1. **Profiles exist**:
```sql
SELECT COUNT(*) FROM profiles WHERE role = 'owner';
```

2. **Login emails match**:
```sql
SELECT 
  ap.login_email,
  p.email,
  CASE WHEN ap.login_email = p.email THEN '✅' ELSE '❌' END
FROM auto_provisioning ap
JOIN profiles p ON ap.user_id = p.user_id;
```

3. **Admin UI**: Tenant detail page → Users tab → Login Email shows owner email ✅

## Files Summary

1. **check-missing-owner-profiles.sql** - Diagnostic query
2. **create-missing-owner-profiles.sql** - **RUN THIS FIRST** ⭐
3. **fix-autoprov-user-id-mismatch.sql** - Run after if needed
4. **fix-provision-tenant-with-auto-provisioning.sql** - Deploys updated function

---

## TL;DR

**Problem**: Owner users don't have profiles → Login email shows admin instead

**Solution**: Run `create-missing-owner-profiles.sql` to create the missing profiles

**Result**: Login email will show the correct owner email! ✅
