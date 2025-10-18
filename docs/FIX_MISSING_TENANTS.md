# Fix: 9 Tenants Exist But Only 5 Show in UI

## Problem

**Sidebar shows**: 9 tenants  
**Tenants Directory shows**: 5 tenants  
**Missing**: 4 tenants

## Root Cause

The `TenantsPage.tsx` uses an **INNER JOIN** with the `auto_provisioning` table:

```typescript
auto_provisioning!inner(user_id)
```

This means only tenants with a matching `auto_provisioning` record are displayed. The 4 missing tenants were created before the `provision_tenant` function was updated to create these records.

## Solution

You need to create `auto_provisioning` records for the 4 existing tenants that don't have them.

### Option 1: Quick Fix (Recommended)

Run this SQL in Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Copy the contents of `create-missing-autoprov-records.sql`
3. Click **RUN**
4. Refresh your admin UI

### Option 2: Manual Check First

If you want to see which tenants are missing records first:

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Run this query:

```sql
SELECT 
  t.id,
  t.name,
  t.slug,
  t.status,
  t.created_at,
  CASE 
    WHEN ap.id IS NULL THEN '❌ Missing auto_provisioning'
    ELSE '✅ Has auto_provisioning'
  END as status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC;
```

This will show you which 4 tenants are missing records.

## What the Fix Does

The `create-missing-autoprov-records.sql` script:

1. Finds all tenants without `auto_provisioning` records
2. Creates a record for each missing tenant with:
   - `user_id`: First SUPER_ADMIN user (as the provisioner)
   - `tenant_id`: The tenant's ID
   - `restaurant_name`: The tenant's name
   - `restaurant_slug`: The tenant's slug
   - `status`: 'completed'
   - `login_email` & `business_email`: From tenant's email
   - Timestamps matching the tenant's creation time

3. Shows a summary of how many records were created

## After Running the Fix

1. **Refresh the admin UI** (Ctrl+Shift+R)
2. **Check Tenant Management** - should now show all 9 tenants
3. **Verify the count** - sidebar badge should match directory count

## Why This Happened

The tenants were likely created through one of these methods:

1. **Direct database insert** (bypassed the provision_tenant function)
2. **Old version of provision_tenant** (before auto_provisioning was added)
3. **Manual testing** during development
4. **Database migration/seeding** without auto_provisioning records

## Prevention

Going forward, all tenants created through the provisioning UI will automatically have `auto_provisioning` records because:

1. ✅ Edge function is updated
2. ✅ Database function (`provision_tenant`) creates the record
3. ✅ All new tenants will be visible immediately

## Alternative: Change UI Query (Not Recommended)

If you don't want to create the records, you could change the TenantsPage query from:

```typescript
auto_provisioning!inner(user_id)  // INNER JOIN - excludes tenants without record
```

to:

```typescript
auto_provisioning(user_id)  // LEFT JOIN - includes all tenants
```

But this is **not recommended** because:
- The auto_provisioning table tracks important metadata
- Future features may depend on this data
- It's better to have complete data

## Files Created

1. **find-missing-autoprov.sql** - Query to see which tenants are missing records
2. **create-missing-autoprov-records.sql** - Script to create missing records (USE THIS)

---

## Quick Summary

**Run this in Supabase SQL Editor**:
1. Open `create-missing-autoprov-records.sql`
2. Copy all contents
3. Paste in Supabase SQL Editor
4. Click RUN
5. Refresh admin UI
6. All 9 tenants should now appear! ✅
