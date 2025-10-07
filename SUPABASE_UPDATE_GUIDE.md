# Supabase Database Update Guide

## 🎯 Purpose
This guide ensures your Supabase database is properly configured for the new tenant credential management system.

## ✅ What's Been Fixed (Code Side)

### Edge Functions - DEPLOYED ✅
1. **tenant-provisioning** - Creates unique owner users for each tenant
2. **manage-tenant-credentials** - Uses correct `user_id` column for updates

### React Components - COMMITTED ✅
1. **TenantUserManagement.tsx** - Fixed hook dependencies
2. **TenantDetailPage.tsx** - Added component key for proper re-rendering

## 🔧 What Needs to be Done (Database Side)

### Step 1: Run the Database Update Script

**Location:** `SUPABASE_DATABASE_UPDATE.sql`

**How to run:**
1. Open Supabase Dashboard: https://app.supabase.com
2. Go to your project: `kbfbbkcaxhzlnbqxwgoz`
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `SUPABASE_DATABASE_UPDATE.sql`
6. Click **Run** (or press Ctrl+Enter)

**What this script does:**
- ✅ Verifies `profiles.user_id` column exists (links to auth.users)
- ✅ Creates necessary indexes on `profiles.email` and `profiles.user_id`
- ✅ Updates RLS policies for service role access
- ✅ Ensures foreign key constraints are in place
- ✅ Provides a summary report of the database state

### Step 2: Review the Summary Report

After running the script, check the output:

```
✅ PASS - profiles table structure correct
✅ PASS - profiles RLS policies (3 policies)
⚠️  WARNING - X tenants need unique credentials
⚠️  WARNING - Y profiles missing user_id
```

### Step 3: Fix Existing Tenants (If Needed)

If the report shows tenants with `admin@blunari.ai` email:

**Option A: Via Admin Dashboard (RECOMMENDED)**
1. Log into admin dashboard
2. Go to "Tenants" page
3. For each tenant with `admin@blunari.ai`:
   - Click on the tenant
   - Go to "User Management" tab
   - Click "Regenerate Credentials"
   - This will create a unique owner user with new credentials

**Option B: Re-provision Tenant**
1. Delete the problematic tenant (if safe to do so)
2. Create a new tenant through the provisioning system
3. The new system will automatically create unique credentials

## 📋 Database Schema Verification

### Profiles Table Structure
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- ← CRITICAL
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Required indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);
```

**Key Points:**
- `profiles.id` = Profile record's own UUID
- `profiles.user_id` = Links to `auth.users.id` (used for Auth operations)
- When updating credentials, ALWAYS use `user_id` column

### RLS Policies

**Profiles Table:**
```sql
-- Service role (edge functions) has full access
CREATE POLICY "Service role has full access to profiles" 
ON profiles FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Tenants Table:**
```sql
-- Service role has full access
CREATE POLICY "Service role has full access to tenants" 
ON tenants FOR ALL TO service_role 
USING (true) WITH CHECK (true);
```

**Auto Provisioning Table:**
```sql
-- Service role has full access
CREATE POLICY "Service role has full access to auto_provisioning" 
ON auto_provisioning FOR ALL TO service_role 
USING (true) WITH CHECK (true);
```

## 🔍 Verification Checklist

After running the update script, verify:

- [ ] `profiles.user_id` column exists
- [ ] Indexes on `profiles.user_id` and `profiles.email` exist
- [ ] Service role policies exist on all 3 tables
- [ ] Foreign key from `profiles.user_id` to `auth.users.id` exists
- [ ] No tenants have `admin@blunari.ai` email (or if they do, you have a plan to fix them)
- [ ] No profiles have `NULL` user_id

## 🚨 Common Issues

### Issue 1: Tenants still showing admin@blunari.ai
**Cause:** These are OLD tenants created before the fix  
**Solution:** Use "Regenerate Credentials" in admin dashboard

### Issue 2: 500 Error when updating credentials
**Cause:** RLS policies blocking service role, or wrong column usage  
**Solution:** Run the database update script, redeploy edge functions

### Issue 3: Profiles with NULL user_id
**Cause:** Profiles created before user_id column was added  
**Solution:** These need to be fixed via Auth API (contact support or manually fix)

## 📊 Testing the Fix

### Test 1: Create New Tenant
```bash
# Should create unique owner user automatically
1. Go to admin dashboard
2. Click "Create New Tenant"
3. Fill in details (use unique email)
4. Submit
5. Check that email !== 'admin@blunari.ai'
```

### Test 2: Update Credentials
```bash
1. Open any tenant
2. Go to "User Management" tab
3. Try updating email
4. Try updating password
5. Should succeed with 200 OK (no 500 error)
```

### Test 3: Verify in Database
```sql
-- Check recent tenants have unique emails
SELECT id, name, email, created_at 
FROM tenants 
ORDER BY created_at DESC 
LIMIT 5;

-- Check profiles have user_id
SELECT id, user_id, email 
FROM profiles 
WHERE user_id IS NOT NULL
LIMIT 5;
```

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ Database update script runs without errors
2. ✅ Summary report shows all checks passing
3. ✅ New tenants get unique credentials automatically
4. ✅ Email/password updates work without 500 errors
5. ✅ No tenants showing `admin@blunari.ai` (or you have a plan to fix them)

## 📝 Notes

- The database update script is **idempotent** (safe to run multiple times)
- Service role key is used by edge functions to bypass RLS
- Always test in a non-production environment first (if possible)
- Keep backups before making schema changes

## 🆘 Need Help?

If you encounter issues:
1. Check the edge function logs in Supabase Dashboard
2. Review the summary report from the database update script
3. Verify edge functions are deployed with latest code
4. Check browser console for React errors

## 📚 Related Files

- `SUPABASE_DATABASE_UPDATE.sql` - Main database update script
- `DEFINITIVE_500_ERROR_FIX.md` - Detailed history of the bug fix
- `supabase/functions/tenant-provisioning/index.ts` - Creates owner users
- `supabase/functions/manage-tenant-credentials/index.ts` - Updates credentials
- `TenantUserManagement.tsx` - React component for credential management
