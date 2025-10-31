# Tenant Provisioning V2 - Deployment Checklist

**Date**: October 31, 2025  
**Status**: Ready for Deployment

---

## ✅ Pre-Deployment Checklist

- [x] Database migration created (`20251031000000_professional_tenant_provisioning_v2.sql`)
- [x] Edge Function created (`tenant-provisioning-v2/index.ts`)
- [x] Admin UI component created (`TenantProvisioningFormV2.tsx`)
- [x] Admin page created (`TenantProvisioningPageV2.tsx`)
- [x] Documentation written (`PROFESSIONAL_TENANT_PROVISIONING_V2_DOCUMENTATION.md`)
- [ ] All files reviewed and approved
- [ ] Ready to deploy

---

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration

```powershell
# From project root
cd "c:\Users\Drood\Desktop\Blunari SAAS"

# Apply migration
supabase db push
```

**Verification:**
```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'tenant_provisioning_audit_v2';

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%v2%' AND routine_schema = 'public';

-- Test validation functions
SELECT * FROM validate_owner_email_realtime('test@example.com');
SELECT * FROM validate_tenant_slug_realtime('test-slug');
```

### Step 2: Deploy Edge Function

```powershell
# Deploy Edge Function
cd supabase/functions
supabase functions deploy tenant-provisioning-v2
```

**Verification:**
```powershell
# Test Edge Function (replace with your project URL and admin token)
curl -X POST "https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/tenant-provisioning-v2" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "basics": {
      "name": "Test Restaurant API",
      "slug": "test-restaurant-api-oct31",
      "timezone": "UTC",
      "currency": "USD"
    },
    "owner": {
      "email": "test-api-oct31@example.com"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "tenantId": "...",
    "ownerId": "...",
    "slug": "test-restaurant-api-oct31",
    "primaryUrl": "https://app.blunari.ai/test-restaurant-api-oct31",
    "message": "Tenant provisioned successfully! Password reset email will be sent to the owner."
  }
}
```

### Step 3: Update Admin Dashboard Routing

**File**: `apps/admin-dashboard/src/App.tsx` (or your routing file)

Add this route:
```tsx
import TenantProvisioningPageV2 from "@/pages/TenantProvisioningPageV2";

// In your routes
<Route path="/admin/tenants/provision-v2" element={<TenantProvisioningPageV2 />} />
```

**File**: `apps/admin-dashboard/src/pages/TenantsPage.tsx`

Update the "Provision New Tenant" button (around line 537):
```tsx
<Button
  onClick={() => navigate("/admin/tenants/provision-v2")}  // Changed from /provision
  className="shadow-lg hover:shadow-xl transition-shadow"
>
  <Plus className="h-4 w-4 mr-2" />
  Provision New Tenant
</Button>
```

### Step 4: Test Locally

```powershell
cd apps/admin-dashboard
npm run dev
```

Open: http://localhost:5174/admin/tenants/provision-v2

**Manual Test Checklist:**
- [ ] Page loads without errors
- [ ] Form fields render correctly
- [ ] Auto-slug generation works (type in name, slug auto-fills)
- [ ] Real-time email validation works (type email, see checkmark)
- [ ] Real-time slug validation works (type slug, see checkmark)
- [ ] Error validation works (try duplicate slug/email, see red X)
- [ ] Submit button disabled when validation fails
- [ ] Submit button enabled when all valid
- [ ] Submit form with valid data
- [ ] Progress bar shows during submission
- [ ] Success screen shows after completion
- [ ] Copy buttons work on success screen

### Step 5: Deploy Frontend

```powershell
# Commit changes
git add .
git commit -m "feat: professional tenant provisioning v2 - complete rewrite with atomic operations, real-time validation, and comprehensive audit logging"
git push origin master
```

**Vercel will automatically:**
1. Detect the push
2. Build the admin-dashboard
3. Deploy to production (https://admin.blunari.ai)

**Monitor Deployment:**
- Check Vercel dashboard: https://vercel.com/deewav3s-projects/admin-dashboard/deployments
- Look for latest deployment
- Wait for "Ready" status (usually 2-4 minutes)

### Step 6: Verify Production Deployment

1. Navigate to: https://admin.blunari.ai/admin/tenants/provision-v2
2. Login as admin
3. Test provisioning with real data:
   - Use a unique email (not used before)
   - Use a unique slug
   - Fill in all fields
   - Submit
4. Verify success screen shows
5. Check tenant created in database:
   ```sql
   SELECT * FROM tenants ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM auto_provisioning ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM tenant_provisioning_audit_v2 ORDER BY created_at DESC LIMIT 1;
   ```

---

## 🧪 Post-Deployment Testing

### Test 1: Happy Path - Complete Provisioning

**Steps:**
1. Go to https://admin.blunari.ai/admin/tenants/provision-v2
2. Fill in form:
   - Restaurant Name: "Test Restaurant Oct 31 2025"
   - Slug: (auto-generated)
   - Owner Email: "test-oct31-2025-prod@example.com"
   - Owner Name: "Test Owner"
   - Timezone: America/New_York
   - Currency: USD
   - Description: "Production test restaurant"
3. Click "Create Tenant"
4. Verify success screen appears
5. Copy Tenant ID
6. Navigate to tenant details page
7. Verify all information correct

**Expected Result:** ✅ Tenant created successfully, all data present, audit log created

### Test 2: Duplicate Slug Error

**Steps:**
1. Go to provisioning page
2. Try to create tenant with slug from Test 1
3. Verify real-time validation shows error
4. Verify suggestion provided
5. Click suggestion
6. Verify validation passes with new slug

**Expected Result:** ✅ Error caught before submission, suggestion works

### Test 3: Duplicate Email Error

**Steps:**
1. Go to provisioning page
2. Try to create tenant with email from Test 1
3. Verify real-time validation shows error
4. Verify conflict details shown
5. Change to new email
6. Verify validation passes

**Expected Result:** ✅ Error caught before submission, clear message shown

### Test 4: Permission Check

**Steps:**
1. Logout
2. Login as non-admin user
3. Try to access /admin/tenants/provision-v2

**Expected Result:** ✅ Permission denied or redirected

### Test 5: Edge Function Error Handling

**Using curl (or Postman):**

```powershell
# Test with duplicate slug
curl -X POST "https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/tenant-provisioning-v2" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "basics": {
      "name": "Test Duplicate",
      "slug": "test-restaurant-oct-31-2025",
      "timezone": "UTC",
      "currency": "USD"
    },
    "owner": {
      "email": "unique-email@example.com"
    }
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "SLUG_UNAVAILABLE",
    "message": "Slug \"test-restaurant-oct-31-2025\" is already used by \"Test Restaurant Oct 31 2025\"",
    "hint": "Please choose a different slug"
  }
}
```

---

## 📊 Monitoring

### Check Audit Logs

```sql
-- Recent provisions
SELECT 
  tenant_name,
  tenant_slug,
  owner_email,
  status,
  duration_ms,
  created_at
FROM tenant_provisioning_audit_v2
ORDER BY created_at DESC
LIMIT 10;

-- Success rate (last 24 hours)
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*),
    2
  ) as success_rate_percent
FROM tenant_provisioning_audit_v2
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Average provisioning time
SELECT 
  AVG(duration_ms) as avg_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_ms,
  MAX(duration_ms) as max_ms
FROM tenant_provisioning_audit_v2
WHERE status = 'completed'
AND created_at > NOW() - INTERVAL '24 hours';
```

### Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
2. Click "tenant-provisioning-v2"
3. Click "Logs" tab
4. Look for any errors or warnings

### Check for Orphaned Data

```sql
-- Should return 0 rows
SELECT * FROM tenants WHERE owner_id IS NULL AND created_at > NOW() - INTERVAL '1 hour';

-- Should return 0 rows
SELECT * FROM auto_provisioning 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
AND created_at > NOW() - INTERVAL '1 hour';
```

---

## ✅ Post-Deployment Checklist

### Day 1 (Immediate)
- [ ] Database migration applied successfully
- [ ] Edge Function deployed successfully
- [ ] Frontend deployed successfully
- [ ] Manual test: Happy path works
- [ ] Manual test: Error scenarios work
- [ ] No errors in Edge Function logs
- [ ] Audit logs populating correctly
- [ ] No orphaned data

### Week 1 (Ongoing)
- [ ] Monitor audit logs daily
- [ ] Check success rate (should be >95%)
- [ ] Review average provisioning time (should be <1000ms)
- [ ] Verify no orphaned auth users
- [ ] Check for any support tickets related to provisioning
- [ ] Train other admins on new interface

### Week 2 (Stabilization)
- [ ] No critical issues reported
- [ ] Success rate remains high
- [ ] Performance metrics stable
- [ ] Ready to deprecate V1

---

## 🔄 Rollback Plan (If Needed)

If critical issues arise with V2:

### Quick Rollback Steps:

1. **Revert Frontend Navigation:**
   ```tsx
   // In TenantsPage.tsx, change back to:
   onClick={() => navigate("/admin/tenants/provision")}
   ```

2. **Redeploy Frontend:**
   ```powershell
   git add apps/admin-dashboard/src/pages/TenantsPage.tsx
   git commit -m "rollback: revert to v1 provisioning temporarily"
   git push origin master
   ```

3. **Users will use V1 again**
   - V1 still exists at `/admin/tenants/provision`
   - V1 Edge Function still deployed
   - No data loss

### Keep V2 Deployed:
- Don't remove V2 Edge Function
- Don't rollback database migration
- V2 remains available at `/admin/tenants/provision-v2` for debugging
- Can switch back when issue resolved

---

## 📞 Support Contacts

If issues arise during deployment:

1. **Check Documentation:**
   - PROFESSIONAL_TENANT_PROVISIONING_V2_DOCUMENTATION.md
   - This deployment checklist

2. **Check Logs:**
   - Supabase Edge Function logs
   - Browser console (F12)
   - Database audit logs

3. **Database Queries:**
   - Run monitoring queries above
   - Check for orphaned records
   - Review recent audit logs

4. **Rollback if Needed:**
   - Follow rollback plan above
   - Document issue for future fix

---

## 🎉 Success Criteria

Deployment is successful when:

- ✅ All tests pass
- ✅ No errors in Edge Function logs (24 hours)
- ✅ No orphaned auth users (24 hours)
- ✅ Success rate >95% (24 hours)
- ✅ Average provisioning time <1000ms
- ✅ Audit logs show complete trail
- ✅ No support tickets related to provisioning
- ✅ Admins successfully using new interface

**When all criteria met:** Mark V2 as stable, plan V1 deprecation

---

**Checklist Version**: 1.0  
**Last Updated**: October 31, 2025  
**Status**: Ready for Deployment ✅
