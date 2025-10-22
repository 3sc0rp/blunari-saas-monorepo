# Quick Test Guide - Tenant Owner ID Fix

## What Was Fixed

- ✅ `provision_tenant` now sets `owner_id` when creating tenants
- ✅ `manage-tenant-credentials` has better error messages
- ✅ New tenants will have proper owner linkage

## Quick Test (5 minutes)

### 1. Create a New Tenant

1. Go to **Admin Dashboard** → Tenant Management → Add New Tenant
2. Fill in tenant details:
   - Name: "Test Restaurant"
   - Slug: "test-restaurant"
   - Owner Email: Use a NEW email (not existing user)
   - Timezone: Select any
   - Currency: USD

3. Click "Create Tenant"
4. ✅ **Expected**: Success toast, tenant appears in list

### 2. Verify owner_id is Set

**Option A: Via Admin Dashboard** (if you have tenant detail view)
- Click on the newly created tenant
- Check if owner information is displayed

**Option B: Via Supabase SQL Editor**
```sql
SELECT 
  id, name, slug, owner_id, email, created_at
FROM tenants 
WHERE slug = 'test-restaurant'
ORDER BY created_at DESC 
LIMIT 1;
```

✅ **Expected**: `owner_id` should be a valid UUID (not NULL)

### 3. Verify Auth User Exists

```sql
-- Check if owner_id corresponds to real auth user
SELECT 
  t.name as tenant_name,
  t.owner_id,
  p.email as owner_email,
  p.role as owner_role
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.slug = 'test-restaurant';
```

✅ **Expected**: 
- `owner_id`: Valid UUID
- `owner_email`: The email you entered
- `owner_role`: 'owner'

### 4. Test Email Update

1. In Admin Dashboard → Tenant Management
2. Find the test tenant → Click "Manage Credentials" or similar
3. Try to update the email to a different address
4. ✅ **Expected**: Success toast "Email updated successfully"

**If it fails**, check:
- Is the new email already used by another user?
- Check Edge Function logs with correlation ID
- See error message (should be clear now, not generic)

### 5. Verify Email Update Applied

```sql
SELECT 
  t.name,
  t.email as tenant_email,
  p.email as profile_email
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.slug = 'test-restaurant';
```

✅ **Expected**: Both `tenant_email` and `profile_email` should match the NEW email

## Fix Existing Tenants

If you have tenants created **before this fix**, they will have NULL `owner_id`.

### Quick Check

```sql
-- How many tenants need fixing?
SELECT COUNT(*) as tenants_without_owner
FROM tenants
WHERE owner_id IS NULL;
```

### Apply Fix

Run the script: **`FIX_EXISTING_TENANTS_OWNER_ID.sql`**

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `FIX_EXISTING_TENANTS_OWNER_ID.sql`
3. Run in SQL Editor
4. Review "Preview" section before running UPDATE
5. Run UPDATE statement
6. Verify all tenants now have `owner_id`

## Common Errors & Solutions

### Error: "Email already registered to another user"

**Cause**: The email you're trying to update to is already used by another auth user.

**Solution**: Use a different email address.

### Error: "Tenant owner user account not found"

**Cause**: The tenant's `owner_id` doesn't correspond to any auth user.

**Solution**: 
1. Check if tenant has `owner_id` set:
   ```sql
   SELECT id, name, owner_id FROM tenants WHERE slug = 'problem-tenant';
   ```
2. If NULL, run the fix script: `FIX_EXISTING_TENANTS_OWNER_ID.sql`
3. If not NULL but invalid UUID, manually fix:
   ```sql
   -- Find correct owner from auto_provisioning
   SELECT tenant_id, user_id FROM auto_provisioning WHERE tenant_id = 'tenant-uuid';
   
   -- Update tenant
   UPDATE tenants SET owner_id = 'correct-user-uuid' WHERE id = 'tenant-uuid';
   ```

### Error: Generic "Error updating user"

**Cause**: Could be various auth issues.

**Solution**:
1. Check Edge Function logs in Supabase Dashboard
2. Look for correlation ID in error response
3. Search logs by correlation ID: `[CREDENTIALS][correlation-id]`
4. Error details will show specific issue

## Edge Function Logs

To debug issues, check logs:

1. Supabase Dashboard → Edge Functions → manage-tenant-credentials
2. Click "Logs" tab
3. Look for `[CREDENTIALS][correlation-id]` entries
4. Error logs show:
   - User ID being updated
   - Exact auth error returned
   - Email update success/failure

## Success Criteria

✅ New tenant created with `owner_id` populated
✅ `owner_id` matches valid auth user in profiles table
✅ Email can be updated successfully
✅ Email update reflects in both tenants and profiles tables
✅ Existing tenants (if any) fixed with manual script

## Next Session Quick Start

If you need to resume work on this:

1. **Verify Fix Deployed**:
   ```bash
   git log --oneline | head -5
   # Should show: "fix(tenant): Add owner_id to provision_tenant..."
   ```

2. **Check Migration Applied**:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   WHERE version = '20251022000001';
   ```

3. **Test Tenant Creation**: Follow steps above

## Files Reference

- **Migration**: `supabase/migrations/20251022000001_fix_provision_tenant_owner_id.sql`
- **Edge Function**: `supabase/functions/manage-tenant-credentials/index.ts`
- **Fix Script**: `FIX_EXISTING_TENANTS_OWNER_ID.sql`
- **Full Docs**: `TENANT_OWNER_ID_FIX_COMPLETE.md`
