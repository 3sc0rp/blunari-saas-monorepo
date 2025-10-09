# 🚨 CRITICAL: Apply Database Migration NOW

## Status
- ✅ Edge function deployed (password generation working)
- ⚠️ **DATABASE MIGRATION PENDING** - MUST RUN NOW

## Why This Is Critical

Without the database migration:
- ❌ New tenants won't get auto_provisioning records (won't show in UI)
- ❌ Existing tenants still missing (9 exist, only 5 show)
- ❌ Login emails still show admin@blunari.ai instead of owner email

## How to Apply Migration

### Step 1: Open Supabase SQL Editor
**URL**: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new

### Step 2: Copy SQL File Content
**File**: `scripts/fixes/APPLY-ALL-FIXES.sql`

### Step 3: Paste and Run
1. Paste the entire SQL content into the editor
2. Click "Run" button
3. Wait for execution (should take 5-10 seconds)

### Step 4: Verify Results
Look for these success messages in the output:
```
✅ provision_tenant function updated
✅ All tenants already have auto_provisioning records! (or "Created X records")
✅ All fixes applied successfully!
```

## What The Migration Does

### Fix 1: Update provision_tenant() Function
- Ensures new tenants get auto_provisioning records
- Creates profiles for owner users
- Marks as completed with proper timestamps

### Fix 2: Create Missing auto_provisioning Records
- Finds tenants without auto_provisioning records
- Creates records with completed status
- Links to first SUPER_ADMIN as provisioner

### Fix 3: Create Missing Owner Profiles
- Finds owner users without profiles
- Creates profiles with login_email from auto_provisioning
- Fixes "login email shows admin@blunari.ai" issue

### Verification Reports
The script includes several queries that show:
- Tenant visibility status (with/without auto_provisioning)
- Email display status (correct/missing/wrong)
- Summary counts

## After Running Migration

### Test Immediately
1. **Navigate to Admin Dashboard**: https://admin.blunari.ai
2. **Check Tenants Page**: Should show all 9 tenants (not just 5)
3. **Open Tenant Detail**: Login email should show owner email (not admin email)
4. **Create New Tenant**: Should work without errors and display credentials

### Expected Results
```
Before Migration:
- Tenants showing: 5 out of 9
- Login emails: admin@blunari.ai (wrong)
- New provisions: Won't get auto_provisioning records

After Migration:
- Tenants showing: 9 out of 9 ✅
- Login emails: owner@restaurant.com (correct) ✅
- New provisions: Get auto_provisioning + profiles ✅
```

## Troubleshooting

### If Migration Fails

**Error: "function provision_tenant already exists"**
- **Solution**: The error handler drops old versions first, but if it fails, run:
  ```sql
  DROP FUNCTION IF EXISTS provision_tenant(jsonb, text, uuid);
  ```
  Then re-run the full migration.

**Error: "duplicate key value violates unique constraint"**
- **Solution**: This means records already exist (safe to ignore)
- Check verification queries to confirm data is correct

**Error: "relation 'auto_provisioning' does not exist"**
- **Solution**: The table doesn't exist. This is a critical issue.
- Check: Was the initial schema migration run?
- Fix: Run `supabase db reset` or create table manually

### If You See Warnings

**WARNING**: "All tenants already have auto_provisioning records!"
- **Meaning**: Fix 2 found nothing to fix (already done)
- **Action**: This is OK, continue to verification

**WARNING**: "0 rows inserted" (for profiles)
- **Meaning**: All profiles already exist
- **Action**: Check verification queries to see if emails are correct

## Rollback (If Needed)

### If Something Goes Wrong
The migration is designed to be safe:
- Uses `CREATE OR REPLACE` for function (can run multiple times)
- Uses `ON CONFLICT DO NOTHING` for records (no duplicates)
- Does NOT delete any data

### To Rollback Function Only
```sql
-- Restore previous version (without auto_provisioning support)
-- Find old version in: supabase/migrations/previous_version.sql
CREATE OR REPLACE FUNCTION provision_tenant(...)
-- (paste old function code)
```

**Note**: You CANNOT easily rollback data changes (created records)

## Success Criteria

After running migration, you should see:

✅ **Function updated** - "provision_tenant function updated ✅"  
✅ **Records created** - "Created X auto_provisioning records" OR "All already have records"  
✅ **Profiles created** - "X rows inserted" OR "0 rows" (if already exist)  
✅ **All tenants visible** - Count query shows 9 tenants with auto_provisioning  
✅ **Correct emails** - Count query shows correct_emails = total_tenants

## Next Steps After Migration

1. ✅ **Test provisioning** - Create a test tenant
2. ✅ **Verify credentials display** - Should show email + password
3. ✅ **Test owner login** - Use provided credentials
4. 🧹 **Clean up test tenants** - Delete test data after verification
5. 📝 **Update documentation** - Mark migration as complete

---

**Status**: Migration ready to run  
**Priority**: HIGH - Blocks full functionality  
**Risk**: LOW - Safe to run, uses conflict resolution  
**Time**: 5-10 seconds execution time

**Run Now**: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
