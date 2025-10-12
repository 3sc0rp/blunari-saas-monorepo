# Production Tenant Resolution Fix - Action Plan

## 🚨 CRITICAL ISSUE IDENTIFIED

Your production app is using **hardcoded demo tenant fallbacks** instead of resolving each user's real tenant ID from the database.

## Root Cause Analysis

### The Problem Chain:
1. ✅ Users authenticate successfully
2. ✅ App queries `auto_provisioning` table for user's `tenant_id`
3. ❌ **IF query fails or returns no data** → App falls through to fallback logic
4. ❌ Fallback logic returns demo tenant (`f47ac10b-58cc-4372-a567-0e02b2c3d479`)
5. ❌ All users see the same demo data instead of their own data

### Why This Happens:
- `useTenant` hook has multiple fallback mechanisms for "development mode"
- These fallbacks kick in when database query doesn't return a tenant
- Possible reasons database query fails:
  - User doesn't have entry in `auto_provisioning` table
  - User's provisioning status is not 'completed'
  - User's `tenant_id` in `auto_provisioning` doesn't exist in `tenants` table
  - RLS policies blocking the query

## 🔍 IMMEDIATE DIAGNOSIS STEPS

### Step 1: Check Your Browser Console
**Refresh the app** and look for these new logs:

```
🔍 [useTenant] Resolving tenant for user: {
  userId: "...",
  email: "your-email@example.com"
}

📊 [useTenant] Auto-provisioning query result: {
  hasData: true/false,      ← Should be TRUE
  hasTenantId: true/false,  ← Should be TRUE
  tenantId: "...",          ← Should be YOUR tenant UUID, not demo
  error: null
}

✅ [useTenant] Successfully resolved real tenant: {
  id: "...",
  slug: "...",
  name: "..."
}
```

**What to check:**
- Is `hasData: false`? → User not in `auto_provisioning` table
- Is `hasTenantId: false`? → Entry exists but no `tenant_id`
- Is `tenantId` the demo UUID? → Wrong tenant assigned
- Is there an `error`? → Database query failed

### Step 2: Run Database Diagnostic SQL

1. Open Supabase SQL Editor
2. Run the script: `CHECK-TENANT-DATA.sql`
3. Check the results:

**Section 1 - All Users and Tenants:**
```sql
-- Should show YOUR email with YOUR tenant, not demo tenant
-- If tenant_id is NULL → User not provisioned
-- If tenant_slug is 'demo' → User has wrong tenant
```

**Section 2 - Orphaned Users:**
```sql
-- Should be EMPTY
-- If you see users here → They need tenant provisioning
```

**Section 3 - Incomplete Provisioning:**
```sql
-- Should be EMPTY
-- If you see users here → Their provisioning failed
```

### Step 3: Check Analytics Logs

Open browser Network tab and check:
```
POST /functions/v1/widget-analytics

Request Payload:
{
  "tenantId": "???"  ← Is this YOUR tenant or demo tenant?
}
```

## 🔧 FIXES BASED ON DIAGNOSIS

### Fix 1: User Has No Tenant (Most Likely)

**Symptoms:**
- `auto_provisioning` query returns `hasData: false`
- User email shows in "Orphaned Users" query

**Solution:**
You need to create a tenant for each user. Choose one:

**Option A - Manual Tenant Creation (Recommended for few users):**
```sql
-- 1. Create tenant for user
INSERT INTO tenants (slug, name, timezone, currency)
VALUES (
  'user-unique-slug',  -- Make this unique per user
  'User Restaurant Name',
  'America/New_York',
  'USD'
)
RETURNING id;  -- Copy this UUID

-- 2. Link user to tenant
INSERT INTO auto_provisioning (user_id, tenant_id, status)
VALUES (
  'user-uuid-from-auth-users',  -- Get from Section 1 query
  'tenant-uuid-from-step-1',     -- UUID from above
  'completed'
);
```

**Option B - Automated Bulk Creation (for many users):**
Uncomment and run the fix script in `CHECK-TENANT-DATA.sql` (Section 6)

### Fix 2: Tenant Exists But Status Not 'completed'

**Symptoms:**
- User shows in "Incomplete Provisioning" query
- `status` is 'pending' or 'failed'

**Solution:**
```sql
UPDATE auto_provisioning
SET status = 'completed'
WHERE user_id = 'user-uuid-here'
  AND status != 'completed';
```

### Fix 3: RLS Policy Blocking Query

**Symptoms:**
- Console shows database error
- Error mentions permissions or RLS

**Solution:**
```sql
-- Check current policies
SELECT * FROM pg_policies
WHERE tablename = 'auto_provisioning';

-- Add policy to allow users to read their own provisioning
CREATE POLICY "Users can read own provisioning"
ON auto_provisioning
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### Fix 4: Remove Demo Fallback Logic (Production Hardening)

**After confirming all users have tenants**, update `useTenant.ts`:

```typescript
// In production, NEVER fall back to demo tenant
// Instead, redirect to setup/onboarding page

if (!tenantById) {
  console.error('User has no tenant assigned');
  navigate('/setup-account');  // Create this page
  return;
}
```

## 📊 VALIDATION STEPS

After applying fixes:

1. **Clear browser cache** (hard refresh: Ctrl+Shift+R)
2. **Check console logs** - should show your real tenant ID
3. **Check analytics** - tenantId in request should be yours
4. **Test with multiple users** - each should see their own data
5. **Check Supabase logs** - no more fallback tenant ID

## 🎯 SUCCESS CRITERIA

✅ Each user's console shows their unique tenant ID
✅ No logs mentioning demo tenant or fallback
✅ Widget analytics work with user's real tenant ID
✅ Each account sees only their own data
✅ No 400 errors from Edge Function

## 📝 MAINTENANCE NOTES

### For New User Signups:
Ensure your signup flow includes:
1. Create user in `auth.users`
2. Create tenant in `tenants`
3. Create link in `auto_provisioning` with `status='completed'`

### Database Schema Required:
```sql
-- Ensure these tables exist with correct structure:
- auth.users (Supabase managed)
- tenants (id, slug, name, timezone, currency)
- auto_provisioning (user_id, tenant_id, status)
- widget_analytics_logs (for analytics)
- widget_events (for analytics)
```

## 🆘 If Still Not Working

1. Copy console logs showing tenant resolution
2. Copy SQL query results from `CHECK-TENANT-DATA.sql`
3. Check if RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'auto_provisioning';`
4. Verify user session: Check Network tab for auth headers
5. Test direct database query in SQL Editor:
   ```sql
   SELECT * FROM auto_provisioning 
   WHERE user_id = 'your-user-id';
   ```

## Files Modified

- ✅ `useTenant.ts` - Added comprehensive logging
- ✅ `useWidgetAnalytics.ts` - Fixed body stringification + logging
- ✅ `BookingsTabbed.tsx` - Added tenant info logging
- 📄 `CHECK-TENANT-DATA.sql` - Database diagnostic queries

## Next Steps

1. ✅ Code changes deployed (body fix + logging)
2. ⏭️ **YOU**: Refresh browser and check console logs
3. ⏭️ **YOU**: Run `CHECK-TENANT-DATA.sql` in Supabase
4. ⏭️ **YOU**: Report back with findings
5. ⏭️ **WE**: Apply appropriate fix based on diagnosis
