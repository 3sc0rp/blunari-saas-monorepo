# ✅ Remaining Fixes - Execution Checklist

**Date**: October 22, 2025  
**Status**: Ready to Execute  
**Estimated Time**: 30 minutes

---

## 🎯 Critical Action Required

### P0: Execute Tenant Owner Separation

**Current State**: 🔴 All production tenants share the same owner user  
**Risk**: CRITICAL - Security violation, cross-tenant access  
**Status**: ✅ Code deployed, ⏳ Awaiting execution

---

## 📋 Step-by-Step Execution

### Step 1: Verify Current State (2 minutes)

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql
   ```

2. Open `VERIFY_TENANT_OWNERS.sql` in your workspace

3. Run the **SUMMARY QUERY** (bottom of file):
   ```sql
   SELECT 
     COUNT(*) as total_tenants,
     COUNT(DISTINCT owner_id) as unique_owners,
     CASE 
       WHEN COUNT(*) = COUNT(DISTINCT owner_id) THEN '✅ ALL UNIQUE'
       ELSE '⚠️ SHARED OWNERS DETECTED'
     END as status
   FROM tenants
   WHERE owner_id IS NOT NULL;
   ```

4. **Expected BEFORE fix**: 
   - `total_tenants` = 4
   - `unique_owners` = 1
   - `status` = "⚠️ SHARED OWNERS DETECTED"

5. Run **Query 1** to see detailed status

---

### Step 2: Execute Tenant Separation (10 minutes)

1. Open Admin Dashboard in browser:
   ```
   https://admin.blunari.ai
   ```

2. Login with your admin credentials

3. Open Developer Console: `F12` (or `Ctrl+Shift+J` on Windows)

4. Click the **Console** tab

5. Open `EXECUTE_TENANT_OWNER_SEPARATION.js` from your workspace

6. **Copy the ENTIRE script** (Ctrl+A, Ctrl+C)

7. **Paste into browser console** (Ctrl+V)

8. **Press Enter** to execute

9. **Watch the console output**:
   - It will show progress for each tenant
   - Display generated passwords
   - Provide verification results

10. **CRITICAL**: Copy all passwords to secure location (password manager, encrypted file)

---

### Step 3: Save Credentials Securely (5 minutes)

The script output will show something like:

```
Tenant: Warrior Factory (wfactory)
  Email: wfactory@blunari.ai
  Password: Abc123XyzDef456!
  User ID: 12345678-1234-1234-1234-123456789012

Tenant: Nature Village (nature-village)
  Email: nature-village@blunari.ai
  Password: Xyz789AbcGhi012@
  User ID: 87654321-4321-4321-4321-210987654321
```

**Save Format** (recommended):
```
Tenant: [Tenant Name]
Login URL: https://app.blunari.ai
Email: [email from script]
Temporary Password: [password from script]
Status: Needs password change on first login
Date: October 22, 2025
```

---

### Step 4: Verify Separation Complete (3 minutes)

1. Go back to Supabase SQL Editor

2. Run the **SUMMARY QUERY** again:
   ```sql
   SELECT 
     COUNT(*) as total_tenants,
     COUNT(DISTINCT owner_id) as unique_owners,
     CASE 
       WHEN COUNT(*) = COUNT(DISTINCT owner_id) THEN '✅ ALL UNIQUE'
       ELSE '⚠️ SHARED OWNERS DETECTED'
     END as status
   FROM tenants
   WHERE owner_id IS NOT NULL;
   ```

3. **Expected AFTER fix**:
   - `total_tenants` = 4
   - `unique_owners` = 4 ✅
   - `status` = "✅ ALL UNIQUE" ✅

4. Run **Query 2** (owner sharing summary):
   ```sql
   SELECT 
     owner_id,
     COUNT(*) as tenant_count,
     array_agg(name ORDER BY name) as tenant_names
   FROM tenants
   WHERE owner_id IS NOT NULL
   GROUP BY owner_id
   HAVING COUNT(*) > 1;
   ```

5. **Expected**: 0 rows ✅ (no shared owners)

---

### Step 5: Test Login for Each Tenant (10 minutes)

For each tenant credential set:

1. Open incognito/private browser window

2. Go to: `https://app.blunari.ai`

3. Click "Sign In"

4. Enter credentials from Step 3

5. **Verify**:
   - ✅ Login successful
   - ✅ Dashboard loads
   - ✅ Only that tenant's data visible
   - ✅ Can navigate to bookings, tables, etc.

6. Logout and repeat for next tenant

7. **Document any login issues** in results table below

---

## 📊 Results Tracking

| Tenant Name | Email | Password Saved | Login Tested | Owner Notified | Status |
|-------------|-------|----------------|--------------|----------------|--------|
| Warrior Factory | wfactory@blunari.ai | ⏳ | ⏳ | ⏳ | ⏳ |
| Nature Village | nature-village@blunari.ai | ⏳ | ⏳ | ⏳ | ⏳ |
| Dpizza | dpizza@blunari.ai | ⏳ | ⏳ | ⏳ | ⏳ |
| [Tenant 4] | [email]@blunari.ai | ⏳ | ⏳ | ⏳ | ⏳ |

**Mark each step**:
- ⏳ = Pending
- ✅ = Complete
- ❌ = Failed (document reason)

---

## 🚨 Troubleshooting

### Issue: Script fails with "Email already exists"

**Cause**: That tenant already has unique owner (good!)

**Action**: 
- Note which tenant succeeded
- Continue with remaining tenants
- Script is idempotent - safe to re-run

---

### Issue: Login fails with "Invalid credentials"

**Cause**: Possible typo in password or user not created

**Action**:
1. Check Supabase Auth users:
   ```
   https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/auth/users
   ```
2. Verify user exists with correct email
3. Reset password manually in Auth dashboard
4. Test login again

---

### Issue: Tenant sees wrong data after login

**Cause**: RLS policy issue or `auto_provisioning` not updated

**Action**:
1. Run in SQL Editor:
   ```sql
   SELECT * FROM auto_provisioning WHERE tenant_id = '[tenant-id]';
   ```
2. Verify `user_id` matches new owner's ID
3. If not, update manually:
   ```sql
   UPDATE auto_provisioning
   SET user_id = '[new-owner-id]',
       login_email = '[new-email]'
   WHERE tenant_id = '[tenant-id]';
   ```

---

## ✅ Success Criteria

- [x] ✅ fix-tenant-owner Edge Function deployed
- [ ] ⏳ Script executed successfully for all tenants
- [ ] ⏳ All passwords saved securely
- [ ] ⏳ SQL verification shows unique owners
- [ ] ⏳ All tenant logins tested successfully
- [ ] ⏳ Credentials sent to tenant owners

---

## 📧 Notify Tenant Owners (After Testing)

**Email Template**:

```
Subject: Important: Your Blunari Account Credentials Have Been Updated

Dear [Tenant Name] Team,

As part of a security enhancement, we've created a dedicated owner account 
for your restaurant on the Blunari platform.

Your New Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: https://app.blunari.ai
Email: [email]
Temporary Password: [password]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT - First Login Steps:
1. Use the credentials above to login
2. You will be prompted to change your password
3. Choose a strong, unique password
4. Save your new password securely

This change does not affect any of your:
• Existing bookings
• Restaurant tables
• Menu items
• Customer data
• Analytics history

Everything remains exactly as before - only the login credentials have changed 
for enhanced security.

If you have any questions or issues logging in, please contact support.

Best regards,
Blunari Team
```

---

## 🎉 Completion

Once all checkboxes are ✅:

1. Update `IMPLEMENTATION_COMPLETE.md`:
   - Change "⏳ AWAITING EXECUTION" to "✅ COMPLETE"
   - Add execution date and results

2. Commit final status:
   ```powershell
   git add -A
   git commit -m "fix: Complete tenant owner separation - all tenants now have unique owners"
   git push origin master
   ```

3. **CELEBRATE** 🎊 - All critical security issues resolved!

---

## Next Session Tasks (Optional Enhancements)

After tenant separation is complete, these can be done in future sessions:

### P1: Integrate Rate Limiting (3 hours)
- Add rate limit checks to Edge Functions
- Test 429 responses when limits exceeded

### P1: Integrate Audit Logging (4 hours)
- Add `log_admin_action()` calls to all admin operations
- Create admin dashboard page for audit logs

### P2: Standardize Error Responses (6 hours)
- Create shared error utility
- Update all Edge Functions

### P2: Add Integration Tests (8 hours)
- Deno tests for Edge Functions
- Test critical security paths

---

**Ready to Execute?** Start with Step 1! ⬆️
