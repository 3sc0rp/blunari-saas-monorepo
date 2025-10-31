# Testing V2 Tenant Provisioning System

## Prerequisites
1. Wait for Vercel deployment to complete (~2-4 minutes)
2. Admin dashboard URL: **https://admin.blunari.ai**
3. Login with your admin credentials

## Test Scenarios

### ✅ Test 1: Happy Path - Create New Tenant

**Steps:**
1. Navigate to **https://admin.blunari.ai/admin/tenants**
2. Click **"New Tenant"** or **"Add Tenant"** button
3. You should see the **new single-page V2 form** (not the old 6-step wizard)
4. Fill in the form:
   - **Tenant Name**: "Test Restaurant ABC"
   - **Slug**: "test-restaurant-abc" (will auto-generate from name)
   - **Owner Email**: Use a NEW email (e.g., `test-owner-${Date.now()}@example.com`)
   - **Owner Name**: "John Doe"
   - **Timezone**: Select your timezone
   - **Currency**: USD
   - **Contact Email**: (optional)
   - **Phone**: (optional)

5. Click **"Create Tenant"**

**Expected Results:**
- ✅ Real-time validation shows green checkmarks for email/slug availability
- ✅ Progress indicator shows stages (Validating → Creating → Verifying)
- ✅ Success screen appears with:
  - Tenant details
  - Owner credentials (email + auto-generated password)
  - Copy buttons for credentials
  - "View Tenant" and "Create Another" buttons
- ✅ Total time < 2 seconds

**Verify in Database:**
```sql
-- Check audit log
SELECT * FROM tenant_provisioning_audit_v2 
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- status: 'completed'
-- duration_ms: < 2000
-- No error_code or error_message

-- Check tenant was created
SELECT id, name, slug, email, owner_id, status 
FROM tenants 
WHERE slug = 'test-restaurant-abc';

-- Check owner profile
SELECT user_id, email, role, onboarding_completed
FROM profiles
WHERE email LIKE '%test-owner%';

-- Check auto_provisioning
SELECT tenant_id, user_id, status, completed_at
FROM auto_provisioning
WHERE tenant_slug = 'test-restaurant-abc';
```

---

### ❌ Test 2: Duplicate Slug Error

**Steps:**
1. Try to create another tenant with the **same slug** from Test 1
2. Enter "test-restaurant-abc" in the slug field
3. Wait for real-time validation (debounced 500ms)

**Expected Results:**
- ✅ Red error message appears: "Slug 'test-restaurant-abc' is already used by 'Test Restaurant ABC'"
- ✅ Suggestion provided: "Try: test-restaurant-abc-2"
- ✅ Submit button remains disabled
- ✅ Can click suggestion to auto-fill

---

### ❌ Test 3: Duplicate Email Error

**Steps:**
1. Try to create a tenant with the **same owner email** from Test 1
2. Enter the email used in Test 1

**Expected Results:**
- ✅ Red error message appears: "Email is already in use"
- ✅ Shows conflict details (which table has the email)
- ✅ Submit button remains disabled

---

### 🔒 Test 4: Permission Check (Non-Admin User)

**Steps:**
1. If you have a non-admin user account, login with it
2. Try to navigate to **https://admin.blunari.ai/admin/tenants/provision**

**Expected Results:**
- ✅ Redirected to Unauthorized page OR
- ✅ Protected route blocks access
- ✅ Edge Function returns 403 Forbidden if API called directly

---

### ⚡ Test 5: Real-time Validation

**Steps:**
1. Start filling the form
2. Type a slug like "test" (too short)
3. Type "Test Restaurant!" (invalid characters)
4. Type "admin" (reserved keyword)

**Expected Results:**
- ✅ Immediate feedback on each validation error
- ✅ Error messages are user-friendly
- ✅ Valid slug shows green checkmark
- ✅ Auto-sanitization removes invalid characters

---

### 🔄 Test 6: Rollback on Failure

**Steps:**
1. Create a tenant, but simulate a failure by:
   - Opening browser DevTools → Network tab
   - Block the Edge Function response OR
   - Use an invalid email format in the API call directly

**Expected Results:**
- ✅ Error message displayed to user
- ✅ Audit log shows status: 'failed'
- ✅ No orphaned tenant records in database
- ✅ No orphaned auth users
- ✅ Rollback completed successfully

**Verify:**
```sql
SELECT * FROM tenant_provisioning_audit_v2 
WHERE status = 'failed' 
ORDER BY created_at DESC LIMIT 1;

-- Check no orphaned data
SELECT * FROM tenants 
WHERE owner_id IS NULL 
AND created_at > NOW() - INTERVAL '1 hour';
```

---

## Performance Benchmarks

After running several tests, verify performance:

```sql
-- Average provisioning time (should be < 1000ms)
SELECT 
  AVG(duration_ms) as avg_ms,
  MIN(duration_ms) as min_ms,
  MAX(duration_ms) as max_ms,
  COUNT(*) as total_provisions
FROM tenant_provisioning_audit_v2
WHERE status = 'completed'
AND created_at > NOW() - INTERVAL '1 day';

-- Success rate (should be > 95%)
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM tenant_provisioning_audit_v2
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY status
ORDER BY count DESC;

-- Check for orphaned auth users (should be 0)
SELECT COUNT(*) as orphaned_users
FROM auth.users au
WHERE au.id NOT IN (
  SELECT DISTINCT owner_id FROM tenants WHERE owner_id IS NOT NULL
  UNION
  SELECT DISTINCT user_id FROM profiles
  UNION
  SELECT DISTINCT user_id FROM employees
)
AND au.email NOT LIKE '%@blunari%'
AND au.created_at > NOW() - INTERVAL '1 day';
```

---

## UI/UX Checks

### Visual Inspection:
- ✅ Form layout is clean and modern
- ✅ Progress indicator animates smoothly
- ✅ Success screen shows all relevant information
- ✅ Error messages are clear and actionable
- ✅ Loading states prevent duplicate submissions
- ✅ Responsive on mobile/tablet
- ✅ Keyboard navigation works (Tab, Enter)
- ✅ Copy buttons work for credentials

### Accessibility:
- ✅ Screen reader announces form errors
- ✅ Focus indicators visible
- ✅ ARIA labels present
- ✅ Color contrast sufficient

---

## Edge Cases to Test

1. **Very Long Names**
   - Tenant name: 200+ characters
   - Should truncate or show validation error

2. **Special Characters in Email**
   - Test with: `user+tag@example.com`
   - Should be accepted (valid email format)

3. **International Characters**
   - Tenant name: "Restaurant Café"
   - Slug should sanitize to: "restaurant-cafe"

4. **Rapid Form Submission**
   - Click submit multiple times quickly
   - Should prevent duplicate submissions (idempotency)

5. **Browser Back/Forward**
   - Create tenant → Success screen → Browser back
   - Should handle gracefully

---

## Monitoring (First Week)

Run this daily for 7 days:

```sql
-- Daily provisioning report
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(duration_ms) FILTER (WHERE status = 'completed') as avg_duration_ms,
  COUNT(DISTINCT admin_user_id) as unique_admins
FROM tenant_provisioning_audit_v2
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Error analysis
SELECT 
  error_code,
  error_message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurrence
FROM tenant_provisioning_audit_v2
WHERE status = 'failed'
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY error_code, error_message
ORDER BY occurrences DESC;
```

---

## Success Criteria

✅ **System is ready for production when:**
- Happy path completes in < 2 seconds
- Success rate > 95%
- Zero orphaned auth users or tenant records
- All validation tests pass
- UI is responsive and accessible
- Error messages are user-friendly
- Audit logs capture all stages
- Rollback works correctly on failures

---

## Rollback Plan (If Issues Found)

If V2 has critical issues:

1. **Revert routing in App.tsx:**
   ```bash
   git revert 1ce317a2
   git push origin master
   ```

2. **Redeploy old Edge Function:**
   ```bash
   cd supabase/functions/tenant-provisioning
   supabase functions deploy tenant-provisioning
   ```

3. **Notify team and investigate issues**

4. **Fix issues in V2 and redeploy when ready**

---

## Contact for Issues

- Check audit logs first: `SELECT * FROM tenant_provisioning_audit_v2 ORDER BY created_at DESC LIMIT 10;`
- Review Edge Function logs: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
- Monitor Vercel deployment: https://vercel.com/deewav3s-projects/admin-dashboard
