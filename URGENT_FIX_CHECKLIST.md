# 🔴 URGENT: Tenant Provisioning Fix Checklist

**Status**: System is BROKEN - Migration not deployed  
**Impact**: 100% of provisioning attempts failing with 500 error  
**Time to Fix**: 30 minutes for critical path

---

## Step 1: Deploy Migration (BLOCKING - 10 minutes)

### Action
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Navigate to: **SQL Editor** → **New Query**
3. Copy ENTIRE contents of: `supabase/migrations/20251022_fix_tenant_provisioning_atomic.sql`
4. Paste into SQL Editor
5. Click **Run** button

### Verify Success
```sql
-- Run this query to confirm functions exist:
SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters
FROM pg_proc 
WHERE proname IN (
  'provision_tenant_atomic', 
  'check_owner_email_availability',
  'mark_provisioning_failed'
)
AND pronamespace = 'public'::regnamespace;

-- Expected: 3 rows returned
```

### Expected Output
```
function_name                      | parameters
-----------------------------------|------------------------------------------
provision_tenant_atomic            | p_idempotency_key uuid, p_admin_user_id uuid, ...
check_owner_email_availability     | p_email text
mark_provisioning_failed           | p_idempotency_key uuid, p_error_message text, ...
```

❌ **If this fails**, provisioning will continue to fail with:
```
ERROR: function "provision_tenant_atomic" does not exist
```

---

## Step 2: Verify tenants Table Has Required Columns (5 minutes)

### Check Current Schema
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Required Columns
- `owner_id` (UUID, nullable) - Links to auth.users
- `email` (TEXT, nullable) - Owner contact email

### If Missing, Add Them
```sql
-- Add owner_id column if missing
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Add email column if missing
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add unique constraint on email
ALTER TABLE tenants 
ADD CONSTRAINT tenants_email_unique UNIQUE (email);
```

---

## Step 3: Drop Old provision_tenant() Function (2 minutes)

### Why?
Old function from August 2025 creates tenants WITHOUT email validation and owner_id. Will cause conflicts.

### Command
```sql
-- Drop old function (if exists)
DROP FUNCTION IF EXISTS public.provision_tenant(
  UUID,  -- p_user_id
  TEXT,  -- p_restaurant_name
  TEXT,  -- p_restaurant_slug
  TEXT,  -- p_timezone
  TEXT   -- p_currency
) CASCADE;

-- Verify it's gone
SELECT proname FROM pg_proc 
WHERE proname = 'provision_tenant'
AND pronamespace = 'public'::regnamespace;

-- Expected: 0 rows (function deleted)
```

---

## Step 4: Test Basic Provisioning (5 minutes)

### Manual Test via SQL
```sql
-- Test email availability check
SELECT check_owner_email_availability('test-tenant-' || NOW()::TEXT || '@example.com');
-- Expected: { "available": true, "reason": null }

-- Test atomic provisioning (will fail auth user creation, but database should work)
SELECT provision_tenant_atomic(
  p_idempotency_key := gen_random_uuid(),
  p_admin_user_id := (SELECT id FROM auth.users LIMIT 1),  -- Use any existing admin
  p_tenant_name := 'Test Tenant',
  p_tenant_slug := 'test-tenant-' || extract(epoch from now())::TEXT,
  p_owner_email := 'test-owner-' || extract(epoch from now())::TEXT || '@example.com',
  p_owner_password := 'TempPassword123!',
  p_tenant_data := '{
    "timezone": "America/New_York",
    "currency": "USD",
    "primary_phone": "+1234567890"
  }'::jsonb
);

-- Expected: JSONB with tenant_id, owner_id (placeholder UUID), success: true
```

### Test via Admin Dashboard
1. Login to admin dashboard (http://localhost:5174)
2. Navigate to **Tenants** → **Create New Tenant**
3. Fill out form:
   - Tenant Name: "Test Restaurant"
   - Slug: "test-restaurant-" + timestamp
   - Owner Email: UNIQUE email (e.g., owner-test@example.com)
   - Owner Password: "SecurePass123!"
4. Click **Create Tenant**
5. ✅ Should see success screen with credentials
6. ❌ If 500 error, check Supabase Functions logs

---

## Step 5: Verify No Orphaned Tenants (3 minutes)

### Check for Stuck Provisions
```sql
-- Find tenants stuck in 'provisioning' status
SELECT 
  id,
  name,
  slug,
  owner_id,
  status,
  created_at,
  (NOW() - created_at) AS stuck_for
FROM tenants
WHERE status = 'provisioning'
ORDER BY created_at DESC;

-- Expected: 0 rows (or very recent ones < 5 minutes old)
```

### Cleanup Stuck Tenants (if any)
```sql
-- Delete tenants stuck > 1 hour in provisioning
DELETE FROM tenants
WHERE status = 'provisioning'
AND created_at < NOW() - INTERVAL '1 hour'
RETURNING id, name, slug;

-- Cleanup related auto_provisioning records
DELETE FROM auto_provisioning
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '1 hour'
RETURNING id, restaurant_slug;
```

---

## Step 6: Monitor Edge Function Logs (5 minutes)

### Check Recent Invocations
1. Open Supabase Dashboard → **Edge Functions**
2. Click on **tenant-provisioning** function
3. View **Logs** tab
4. Look for recent invocations

### Success Pattern
```
INFO: Email validation passed for: owner@example.com
INFO: Atomic provisioning succeeded, tenant_id: abc-123-...
INFO: Auth user created successfully, user_id: xyz-789-...
INFO: Tenant provisioning completed successfully
```

### Failure Pattern (Should Not Happen After Fixes)
```
ERROR: function "provision_tenant_atomic" does not exist
ERROR: Email already in use: owner@example.com
ERROR: Auth user creation failed: ...
```

---

## Post-Deployment Validation Checklist

- [ ] Migration deployed successfully (3 functions exist)
- [ ] `tenants` table has `owner_id` and `email` columns
- [ ] Old `provision_tenant()` function deleted
- [ ] Email availability check works (test query returns available=true)
- [ ] Test provisioning via SQL succeeds
- [ ] Test provisioning via Admin UI succeeds
- [ ] No orphaned tenants in database
- [ ] Edge Function logs show successful invocations
- [ ] Owner credentials displayed correctly in UI
- [ ] Created tenant appears in tenants list with status='active'

---

## Rollback Plan (If Something Breaks)

### Option A: Rollback Migration
```sql
-- Drop new functions
DROP FUNCTION IF EXISTS provision_tenant_atomic CASCADE;
DROP FUNCTION IF EXISTS check_owner_email_availability CASCADE;
DROP FUNCTION IF EXISTS mark_provisioning_failed CASCADE;

-- Drop new table
DROP TABLE IF EXISTS provisioning_requests CASCADE;

-- Restore old provision_tenant() function
-- (Copy from supabase/migrations/20250828063705_258ca430-1ae8-4fbe-b13b-2c19c568c6f2.sql)
```

### Option B: Revert Edge Function Deployment
```powershell
cd supabase/functions/tenant-provisioning
git log --oneline  # Find commit before refactor
git checkout <previous-commit-hash> index.ts
supabase functions deploy tenant-provisioning
```

### Option C: Disable Provisioning in UI
```typescript
// In TenantProvisioningWizard.tsx, add temporary check:
if (true) {  // Emergency kill switch
  return (
    <Alert variant="destructive">
      <AlertTitle>Provisioning Temporarily Disabled</AlertTitle>
      <AlertDescription>
        Tenant provisioning is undergoing maintenance. Please try again later.
      </AlertDescription>
    </Alert>
  );
}
```

---

## Success Criteria

✅ **Provisioning works end-to-end**:
1. Admin fills form → clicks Create Tenant
2. Edge Function validates email availability
3. Database creates tenant atomically
4. Auth user created successfully
5. All records updated with real auth user ID
6. UI displays success with credentials
7. Tenant appears in list with status='active'
8. Owner can login with generated credentials

❌ **Known Limitations After This Fix**:
- Auth user creation failures still cause orphaned tenants (requires Step 4 from main audit)
- No automatic cleanup of old failed provisions (requires cron job)
- Idempotency key not restored from draft (requires UI changes)

---

## Timeline

- **Start**: Now
- **Step 1** (Deploy migration): +10 minutes
- **Step 2** (Verify schema): +15 minutes
- **Step 3** (Drop old function): +17 minutes
- **Step 4** (Test provisioning): +22 minutes
- **Step 5** (Check orphaned): +25 minutes
- **Step 6** (Monitor logs): +30 minutes
- **Complete**: 30 minutes total

---

## Next Steps (After Basic Fix)

See `DEEP_AUDIT_TENANT_PROVISIONING_COMPLETE.md` for:
- **High Priority**: Add rollback for auth user creation failures
- **Medium Priority**: Add unique constraint on email
- **Low Priority**: Add cleanup job, performance monitoring, tests

---

## Support

If you encounter issues:
1. Check Supabase Dashboard → Edge Functions → Logs
2. Check Supabase Dashboard → Database → Logs
3. Check browser console for client-side errors
4. Review `DEEP_AUDIT_TENANT_PROVISIONING_COMPLETE.md` for detailed analysis
5. Check `DEPLOYMENT_GUIDE_TENANT_PROVISIONING_FIX.md` for deployment details
