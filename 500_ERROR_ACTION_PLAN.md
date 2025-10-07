# 🔥 500 ERROR - DEBUG & FIX ACTION PLAN

## 🎯 Quick Diagnosis

The 500 error when updating tenant credentials is most likely caused by **profiles with NULL user_id**.

## 📋 Step-by-Step Fix

### Step 1: Run Diagnostic (2 minutes)

1. Open Supabase Dashboard: https://app.supabase.com
2. Go to project: `kbfbbkcaxhzlnbqxwgoz`
3. Click **SQL Editor** → **New Query**
4. Copy and paste the contents of **`DIAGNOSTIC_500_ERROR.sql`**
5. Click **Run**

**What you'll see:**
```
✅ OK or ❌ PROBLEM: X profiles have NULL user_id
```

If you see profiles with NULL user_id, that's the cause of the 500 error!

### Step 2: Check Which Tenants Are Affected

The diagnostic script will show you a list like:
```
Tenant Name    | Email                | Status
---------------|---------------------|-------------------
Restaurant A   | owner@restaurant.com | ⚠️  NULL user_id
Café B         | cafe@example.com     | ⚠️  NULL user_id
```

**These are the tenants that will get 500 errors when updating credentials.**

### Step 3: Fix Each Affected Tenant

#### Option A: Use Admin Dashboard (EASIEST - 1 minute per tenant)

1. Log into Admin Dashboard
2. Go to **Tenants** page
3. Click on the affected tenant
4. Go to **User Management** tab
5. Click **"Regenerate Credentials"** button
6. This creates a new auth user and links everything correctly
7. Test by updating email or password - should work now!

#### Option B: Bulk Fix via SQL (ADVANCED)

If many tenants are affected AND you know auth users exist:

1. Open `FIX_NULL_USER_IDS.sql`
2. Find the commented section:
```sql
UPDATE profiles p
SET user_id = au.id
FROM auth.users au
WHERE p.email = au.email
  AND p.user_id IS NULL;
```
3. Uncomment and run it
4. This links profiles to existing auth users

⚠️ **WARNING**: Only do this if auth users actually exist!

### Step 4: Verify the Fix

1. Run `DIAGNOSTIC_500_ERROR.sql` again
2. Should show: `✅ NO ISSUES FOUND`
3. Test updating a tenant's email in Admin Dashboard
4. Should work without 500 error!

## 🔍 Alternative: Check Edge Function Logs

If the diagnostic shows no issues, check the actual error:

1. Supabase Dashboard → **Edge Functions**
2. Click **manage-tenant-credentials**
3. Click **Logs** tab
4. Look for recent errors with `[CREDENTIALS]` prefix
5. Share the error message for further debugging

## 📊 What Each Script Does

| Script | Purpose | Where to Run |
|--------|---------|--------------|
| `DIAGNOSTIC_500_ERROR.sql` | Identifies the problem | Supabase SQL Editor |
| `FIX_NULL_USER_IDS.sql` | Shows how to fix (manual) | Supabase SQL Editor |
| `SUPABASE_DATABASE_UPDATE.sql` | Updates DB structure | Supabase SQL Editor (already done?) |
| `500_ERROR_TROUBLESHOOTING.md` | Complete guide | Read for more details |

## 🎯 Most Likely Scenario

**Problem**: Old profiles created before the `user_id` column was added properly

**Symptom**: 500 error when trying to update tenant credentials

**Root Cause**: 
- Profile exists with email
- But `user_id` is NULL
- Edge function tries to update auth user
- Can't find user because `user_id` is NULL
- Returns 500 error

**Solution**: 
- Use "Regenerate Credentials" for each affected tenant
- Or bulk link profiles to auth users if they exist

## ✅ Success Criteria

You'll know it's fixed when:
1. ✅ `DIAGNOSTIC_500_ERROR.sql` shows no NULL user_id profiles
2. ✅ You can update tenant email without 500 error
3. ✅ You can update tenant password without 500 error
4. ✅ No errors in browser console

## 🆘 Still Getting 500 Error?

If you've fixed all NULL user_id profiles and still get 500 error:

1. Check edge function logs (see section above)
2. Verify edge function is deployed:
```powershell
cd "C:\Users\Drood\Desktop\Blunari SAAS\apps\admin-dashboard"
supabase functions deploy manage-tenant-credentials
```
3. Hard refresh browser (Ctrl+Shift+R)
4. Share the edge function error logs

## 📝 Quick Commands

**Check function status:**
```powershell
cd "C:\Users\Drood\Desktop\Blunari SAAS\apps\admin-dashboard"
supabase functions list | Select-String "manage-tenant-credentials"
```

**Redeploy function:**
```powershell
cd "C:\Users\Drood\Desktop\Blunari SAAS\apps\admin-dashboard"
supabase functions deploy manage-tenant-credentials
```

---

## 🚀 Next Action

**Run `DIAGNOSTIC_500_ERROR.sql` in Supabase SQL Editor and share the results!**

This will tell us exactly what's wrong and how to fix it.
