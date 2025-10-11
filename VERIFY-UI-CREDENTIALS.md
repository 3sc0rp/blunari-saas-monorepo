# UI Credentials Verification Guide

## 🎯 What Was Changed

Updated `TenantConfiguration.tsx` to correctly read tenant owner credentials using the new admin/tenant separation architecture.

### Previous Behavior:
- ❌ Read from `auto_provisioning` first
- ❌ Fell back to `tenant.email`
- ❌ Never checked `tenant.owner_id`

### New Behavior:
- ✅ **PRIORITY 1**: Read from `tenant.owner_id` (new separation architecture)
- ✅ **PRIORITY 2**: Fall back to `auto_provisioning`
- ✅ **PRIORITY 3**: Last resort - use `tenant.email`

---

## 🔍 Verification Steps

### Step 1: Clear Browser Cache
The admin dashboard might be showing cached data.

**Windows (Chrome/Edge):**
```
Ctrl + Shift + Delete
→ Select "Cached images and files"
→ Clear data
```

**Or hard refresh:**
```
Ctrl + Shift + R
```

**Firefox:**
```
Ctrl + Shift + Delete
→ Check "Cache"
→ Clear Now
```

---

### Step 2: Verify Database State

Run this in Supabase SQL Editor:

```sql
-- Check tenant owner setup for "droodwick"
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.owner_id,
  au.email as owner_email,
  ap.user_id as autoprov_user_id,
  CASE 
    WHEN t.owner_id = ap.user_id THEN '✅ SYNCED'
    WHEN t.owner_id IS NULL THEN '❌ NO OWNER'
    WHEN ap.user_id IS NULL THEN '⚠️  NO AUTO-PROV'
    ELSE '⚠️  MISMATCH'
  END as sync_status
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
WHERE t.name = 'droodwick';
```

**Expected Result for "droodwick":**
```
tenant_name: droodwick
owner_id: 4acd8f0e-e7a8-4860-8f20-6ea74b3d48a6
owner_email: deewav3@gmail.com
autoprov_user_id: 4acd8f0e-e7a8-4860-8f20-6ea74b3d48a6
sync_status: ✅ SYNCED
```

---

### Step 3: Check Admin Dashboard

1. **Navigate to Admin Dashboard:**
   ```
   https://admin.blunari.ai
   ```

2. **Login as Admin:**
   ```
   Email: drood.tech@gmail.com
   (Your admin credentials)
   ```

3. **Open Tenant Configuration:**
   - Go to "Tenants" section
   - Select "droodwick" tenant
   - Click "Configuration" tab

4. **Verify "Login Credentials" Section Shows:**
   ```
   Owner Email: deewav3@gmail.com  ← Should be tenant owner, NOT admin
   ```

5. **Check Browser Console:**
   - Press F12 → Console tab
   - Look for logs starting with `[CREDENTIALS]`
   - Should see: `✅ Using owner from tenant.owner_id: deewav3@gmail.com`

---

### Step 4: Test Credential Changes

#### Test 1: Change Email (Safe Test)
1. Click "Edit" button next to Owner Email
2. Enter a test email: `test-owner@example.com`
3. Click "Save"
4. **Expected Behavior:**
   - Edge Function creates NEW auth user (separate from admin)
   - Updates `tenant.owner_id` to new user ID
   - Admin email (`drood.tech@gmail.com`) remains unchanged
   - UI shows new email

5. **Verify in Database:**
```sql
-- Check admin email is unchanged
SELECT email FROM auth.users 
WHERE id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
-- Should return: drood.tech@gmail.com

-- Check tenant owner updated
SELECT t.owner_id, au.email 
FROM tenants t
JOIN auth.users au ON au.id = t.owner_id
WHERE t.name = 'droodwick';
-- Should return new email: test-owner@example.com
```

#### Test 2: Generate Password
1. Click "Generate New Password" button
2. **Expected Behavior:**
   - New password generated
   - Automatically copied to clipboard
   - Password shown in password field
   - Admin password unchanged

---

## 🐛 Troubleshooting

### Issue: UI Still Shows Admin Email

**Symptom:** Login Credentials shows `drood.tech@gmail.com` instead of `deewav3@gmail.com`

**Possible Causes:**
1. Browser cache not cleared
2. Component not re-fetching data
3. Database not synced properly

**Solution:**
```powershell
# 1. Hard refresh browser
Ctrl + Shift + R

# 2. Check database
# Run SIMPLE-SEPARATION-CHECK.sql in Supabase

# 3. Check Edge Function logs
# Supabase → Edge Functions → manage-tenant-credentials → Logs
# Look for: "✅ Created new tenant owner" or errors

# 4. Verify tenant has owner_id
# Run in Supabase SQL Editor:
SELECT id, name, owner_id FROM tenants WHERE name = 'droodwick';
```

---

### Issue: "admin@unknown.com" Placeholder Shown

**Symptom:** UI shows `admin@unknown.com` in credentials

**Cause:** 
- `tenant.owner_id` is NULL
- `auto_provisioning` record not found
- `tenant.email` is NULL

**Solution:**
```sql
-- Check what's missing
SELECT 
  t.name,
  t.owner_id,
  t.email,
  ap.user_id as autoprov_user_id
FROM tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
WHERE t.name = 'droodwick';

-- If owner_id is NULL, try changing email via UI
-- The Edge Function will auto-create an owner
```

---

### Issue: Console Shows Wrong Priority

**Symptom:** Console logs show:
```
[CREDENTIALS] No owner_id, checking auto_provisioning...
```

**Cause:** `tenantData.owner_id` is NULL even though database has it

**Solution:**
1. Check that migration was applied:
```sql
-- Verify owner_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name = 'owner_id';
```

2. If column exists but value is NULL:
```sql
-- Manually sync from auto_provisioning
UPDATE tenants t
SET owner_id = ap.user_id
FROM auto_provisioning ap
WHERE ap.tenant_id = t.id
  AND ap.status = 'completed'
  AND t.owner_id IS NULL;
```

---

### Issue: Edge Function Returns Error

**Common Errors:**

#### "Tenant is incorrectly linked to admin user"
```
Cause: tenant.owner_id points to an admin user
Solution: Edge Function will auto-create separate owner on next email change
```

#### "Failed to update auto_provisioning"
```
Cause: auto_provisioning table conflict
Solution: Non-critical - tenant.owner_id is still updated, UI will work
Check: Look for ✅ Tenant owner_id updated in logs
```

#### "Column 'display_name' does not exist"
```
Cause: Old version of Edge Function deployed
Solution: Redeploy Edge Function (commit fb51e444 or later)
```

---

## 📊 Expected Console Output

When UI loads credentials, you should see:

**Scenario 1: tenant.owner_id exists (✅ IDEAL)**
```javascript
[CREDENTIALS] Found tenant.owner_id: 4acd8f0e-e7a8-4860-8f20-6ea74b3d48a6
[CREDENTIALS] ✅ Using owner from tenant.owner_id: deewav3@gmail.com
```

**Scenario 2: Only auto_provisioning exists**
```javascript
[CREDENTIALS] No owner_id, checking auto_provisioning...
[CREDENTIALS] ✅ Using owner from auto_provisioning: deewav3@gmail.com
```

**Scenario 3: No owner found**
```javascript
[CREDENTIALS] No owner_id, checking auto_provisioning...
[CREDENTIALS] No owner found, falling back to tenant.email
[CREDENTIALS] Using tenant.email as fallback: some@email.com
```

---

## 🎯 Success Criteria

- [x] UI component updated to read from `tenant.owner_id` first
- [ ] Browser cache cleared
- [ ] UI shows `deewav3@gmail.com` for droodwick tenant
- [ ] Console shows: `✅ Using owner from tenant.owner_id`
- [ ] Admin email unchanged: `drood.tech@gmail.com`
- [ ] Email change creates separate owner (not admin)

---

## 🔄 Next Steps After Verification

### If Everything Works:
1. ✅ Mark "UI Verification" as complete in CONTINUATION_PROMPT
2. 🧹 Clean up "Test Restaurant" tenant (optional)
3. 📝 Update project documentation

### If Issues Found:
1. 🐛 Document issue in this file
2. 🔍 Check Edge Function logs
3. 💾 Run SIMPLE-SEPARATION-CHECK.sql
4. 🔧 Apply fixes as needed

---

## 📝 Files Modified

### Updated:
- `apps/admin-dashboard/src/components/tenant/TenantConfiguration.tsx`
  - Changed credential loading priority
  - Now reads from `tenant.owner_id` first

### Related Files:
- `supabase/functions/manage-tenant-credentials/index.ts` (already deployed)
- `supabase/migrations/20251010120000_add_owner_id_to_tenants.sql` (already applied)

---

## 🔗 Quick Links

- **Full Context**: `CONTINUATION_PROMPT_ADMIN_TENANT_SEPARATION.md`
- **Diagnostics**: `SIMPLE-SEPARATION-CHECK.sql`
- **Architecture**: `ADMIN_TENANT_SEPARATION_FIX.md`
- **Testing Guide**: `ADMIN_TENANT_SEPARATION_COMPLETE.md`

---

**Status**: UI code updated, awaiting verification in browser. ⏳
