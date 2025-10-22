# Tenant Provisioning Fix - Quick Checklist

## 🚀 Deployment Steps

### ✅ Step 1: Run Migration (MUST DO FIRST)

**Where**: Supabase Dashboard → SQL Editor  
**File**: `supabase/migrations/20251022_fix_tenant_provisioning_atomic.sql`

```
1. Open: https://supabase.com/dashboard/project/[project-id]/sql
2. Copy ALL 374 lines from the migration file
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success" confirmation
```

**Verify**:
```sql
SELECT * FROM check_owner_email_availability('test@example.com');
-- Should return: available=true, reason='Email is available'
```

---

### ✅ Step 2: Deploy Edge Function (ALREADY DONE ✓)

```powershell
cd supabase/functions/tenant-provisioning
supabase functions deploy tenant-provisioning
```

**Status**: ✅ Completed (terminal shows exit code 0)

---

### ✅ Step 3: Update Admin Dashboard (ALREADY DONE ✓)

**File**: `apps/admin-dashboard/src/components/admin/TenantProvisioningWizard.tsx`

**Status**: ✅ Added 4 new error code handlers:
- EMAIL_UNAVAILABLE
- EMAIL_VALIDATION_FAILED
- DUPLICATE_REQUEST  
- AUTH_USER_CREATION_FAILED

---

### ⏳ Step 4: Test Provisioning

#### Test 1: Happy Path ✅
```
Admin Dashboard → Provision Tenant
  Name: Test Restaurant
  Slug: test-restaurant-2025
  Owner Email: owner-test-2025@example.com (MUST be unique!)
  
Expected: Success + owner credentials displayed
```

#### Test 2: Duplicate Email ❌
```
Try to provision with existing email (e.g., admin@blunari.ai)
Expected: Clear error "Email Already In Use"
```

#### Test 3: Duplicate Slug ❌
```
Try to provision with existing slug
Expected: Clear error "Slug already taken"
```

---

## 📊 Monitoring

After deployment, run this daily:

```sql
-- Check for failed provisioning attempts
SELECT 
  created_at,
  tenant_slug,
  owner_email,
  error_message
FROM provisioning_requests
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Success Indicators

- [ ] Migration runs without errors in Supabase
- [ ] Test 1 (happy path) creates tenant successfully  
- [ ] Test 2 (duplicate email) shows clear error, NO orphan tenant
- [ ] Test 3 (duplicate slug) shows clear error, NO orphan tenant
- [ ] Owner credentials displayed after success
- [ ] No "500 Internal Server Error" messages

---

## ⚠️ If Migration Fails

**Common issue**: "cannot insert multiple commands into a prepared statement"

**Solution**: Make sure you're using **Supabase Dashboard SQL Editor**, NOT `supabase db push`

**Still failing?** Break migration into chunks:
1. Run STEP 1 (table creation) separately
2. Run STEP 2 (functions) separately  
3. Run STEP 3-5 separately

---

## 🔄 Rollback (If Needed)

```sql
DROP FUNCTION IF EXISTS provision_tenant_atomic CASCADE;
DROP FUNCTION IF EXISTS check_owner_email_availability CASCADE;
DROP FUNCTION IF EXISTS mark_provisioning_failed CASCADE;
DROP TABLE IF EXISTS provisioning_requests CASCADE;
ALTER TABLE tenants ALTER COLUMN owner_id SET NOT NULL;
```

---

## 📝 Git Commit

```powershell
git add .
git commit -m "fix: implement atomic tenant provisioning with rollback support

- Add provision_tenant_atomic() function for all-or-nothing provisioning
- Add email validation to prevent shared owner accounts
- Add provisioning_requests table for idempotency tracking
- Refactor tenant-provisioning Edge Function to use atomic operations
- Add new error codes to admin dashboard
- Fixes 500 errors and orphaned tenant issues"

git push origin master
```

---

**🎯 Current Status**: Ready for Step 1 (Run Migration in Supabase Dashboard)
