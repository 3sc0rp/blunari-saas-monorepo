# 500 Error Troubleshooting Guide

## Current Situation

You're getting a 500 error when trying to update tenant credentials. The edge function `manage-tenant-credentials` is returning an error.

## Quick Diagnostics

### Step 1: Check Supabase Edge Function Logs

1. Go to https://app.supabase.com
2. Open project: `kbfbbkcaxhzlnbqxwgoz`
3. Click **Edge Functions** in sidebar
4. Click **manage-tenant-credentials**
5. Click **Logs** tab
6. Look for recent errors with `[CREDENTIALS]` prefix

**What to look for:**
- Lines starting with `[CREDENTIALS]` show the function's progress
- Any `ERROR` or `WARN` messages
- The specific line where it fails

### Step 2: Common Issues & Solutions

#### Issue A: Profile has NULL user_id
**Symptoms:** Logs show "Profile found" but user_id is null  
**Cause:** Old profiles created before user_id column was added  
**Solution:**
```sql
-- Run in Supabase SQL Editor to check
SELECT id, user_id, email 
FROM profiles 
WHERE user_id IS NULL;

-- If any found, they need manual fixing
-- Each profile needs to be linked to the correct auth user
```

#### Issue B: Auth user doesn't exist
**Symptoms:** Logs show "User not found" or auth error  
**Cause:** Profile exists but no corresponding auth user  
**Solution:** Use "Regenerate Credentials" which creates a new auth user

#### Issue C: RLS Policy Blocking Update
**Symptoms:** Permission denied error in logs  
**Cause:** Service role policy not applied  
**Solution:** Re-run `SUPABASE_DATABASE_UPDATE.sql`

#### Issue D: Wrong Column Being Used
**Symptoms:** "No rows updated" or similar  
**Cause:** Code using wrong column for lookup  
**Check:** Edge function should use `.eq("user_id", tenantOwnerId)` not `.eq("id", ...)`

### Step 3: Test Specific Tenant

Run the test script:

```powershell
cd "C:\Users\Drood\Desktop\Blunari SAAS\apps\admin-dashboard"
deno run --allow-net --allow-env test-credential-update.mjs
```

This will:
1. Ask for your admin credentials
2. Show available tenants
3. Let you test updating one
4. Show detailed error if it fails
5. Check the profile data structure

### Step 4: Manual Check via SQL

Run this in Supabase SQL Editor:

```sql
-- Check a specific tenant's profile data
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  p.id as profile_id,
  p.user_id as profile_user_id,
  au.email as auth_email
FROM tenants t
LEFT JOIN profiles p ON p.email = t.email
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE t.email != 'admin@blunari.ai'
LIMIT 5;
```

**What to check:**
- Does tenant have an email?
- Does profile exist for that email?
- Does profile have user_id?
- Does auth user exist for that user_id?

### Step 5: Check Function Deployment

Verify the latest version is deployed:

```powershell
cd "C:\Users\Drood\Desktop\Blunari SAAS\apps\admin-dashboard"
supabase functions deploy manage-tenant-credentials
```

Then test again.

## Most Likely Causes (in order)

1. **Profile has NULL user_id** (90% likely)
   - Old profiles from before the fix
   - Need to be migrated or regenerated

2. **Auth user doesn't exist** (5% likely)
   - Profile exists but auth user was deleted
   - Need to create new auth user

3. **Permission issue** (3% likely)
   - RLS policy not applied correctly
   - Re-run database update script

4. **Function not redeployed** (2% likely)
   - Old version still running
   - Redeploy the function

## Quick Fix

If you just need to get one tenant working:

1. Go to Admin Dashboard
2. Find the problematic tenant
3. Click "User Management" tab
4. Click "Regenerate Credentials"
5. This creates a fresh auth user and updates everything

## Next Steps

**Share the edge function logs** so I can see the exact error. Look for:
- `[CREDENTIALS]` messages
- The last line before the error
- Any error messages or stack traces

This will tell us exactly which scenario we're dealing with.
