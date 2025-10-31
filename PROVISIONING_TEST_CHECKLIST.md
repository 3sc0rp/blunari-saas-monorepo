# Tenant Provisioning - Comprehensive Test Checklist
**Date**: October 30, 2025
**Status**: Ready for Testing

## ✅ Pre-Flight Checks (COMPLETED)

### Database Constraints
- [x] `tenants.owner_id` has UNIQUE constraint (prevents duplicate owner associations)
- [x] `check_owner_email_availability()` function exists and checks all tables
- [x] `verify_provisioning_completion()` function exists
- [x] `rollback_failed_provisioning()` function exists
- [x] `log_provisioning_audit()` function exists
- [x] `tenant_provisioning_audit` table exists with correct schema

### Edge Function Deployment
- [x] Edge Function deployed to production (kbfbbkcaxhzlnbqxwgoz)
- [x] Uses correct database schema (address as JSONB)
- [x] Creates auth user FIRST (gets real owner_id)
- [x] Validates email before any creation
- [x] Implements verification after database updates
- [x] Implements rollback on failure
- [x] Logs audit trail at every stage
- [x] Does NOT return password in response

### Data Cleanup
- [x] Removed duplicate tenant associations (naturevillage2024@gmail.com)
- [x] Only legitimate tenants remain
- [x] Orphaned auth users can be cleaned via CLEANUP script

## 🧪 Testing Plan

### Test 1: Happy Path - Successful Provisioning
**Email**: `test-success-oct30-2025@example.com`
**Expected**:
1. Email validation passes
2. Auth user created with real ID
3. Tenant record created with `status='active'`
4. Auto_provisioning record created with `status='completed'`
5. Profile created with `role='tenant_owner'`
6. Provisioning request logged
7. Verification passes
8. Audit log shows: `initiated` → `auth_user_created` → `database_updated` → `completed`
9. Response shows `setupLinkSent: true` (NO password)
10. HTTP 200 status

**SQL to verify**:
```sql
-- Check tenant was created
SELECT id, name, slug, owner_id, status, created_at 
FROM tenants 
WHERE email = 'test-success-oct30-2025@example.com';

-- Check audit trail
SELECT action, owner_email, created_at 
FROM tenant_provisioning_audit 
WHERE owner_email = 'test-success-oct30-2025@example.com'
ORDER BY created_at ASC;

-- Check auth user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'test-success-oct30-2025@example.com';

-- Check auto_provisioning
SELECT user_id, tenant_id, status 
FROM auto_provisioning 
WHERE tenant_id = (SELECT id FROM tenants WHERE email = 'test-success-oct30-2025@example.com');
```

---

### Test 2: Email Already Exists
**Email**: `deewav3@gmail.com` (existing user)
**Expected**:
1. Email validation fails immediately
2. NO auth user created
3. NO database records created
4. Audit log shows: `initiated` only (or nothing)
5. Error response: `EMAIL_UNAVAILABLE`
6. HTTP 400 status

---

### Test 3: Slug Already Exists
**Email**: `test-duplicate-slug@example.com`
**Slug**: `droodwick` (existing slug)
**Expected**:
1. Email validation passes
2. Auth user created
3. Tenant creation fails (duplicate slug)
4. Error response: `DATABASE_CREATION_FAILED`
5. Audit log shows: `initiated` → `auth_user_created` → `failed`
6. Auth user left orphaned (manual cleanup needed)
7. HTTP 500 status

---

### Test 4: Invalid Data (Missing Required Fields)
**Email**: (empty)
**Expected**:
1. Validation fails before any creation
2. Error response: `OWNER_EMAIL_REQUIRED`
3. HTTP 400 status

---

### Test 5: Rollback Mechanism
This is hard to test manually, but verification covers it:
- If tenant/auto_provisioning/profile creation fails after auth user
- Rollback should soft-delete tenant and cleanup records
- Audit log should show `rolled_back`

---

## 📊 Current Database State

**Run these queries to see current state:**

```sql
-- All tenants
SELECT name, slug, email, owner_id, status, created_at 
FROM tenants 
ORDER BY created_at DESC;

-- All auth users (recent)
SELECT id, email, created_at 
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Recent audit logs
SELECT action, tenant_slug, owner_email, admin_email, created_at 
FROM tenant_provisioning_audit 
ORDER BY created_at DESC 
LIMIT 20;

-- Orphaned auth users (no tenant)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN tenants t ON t.owner_id = u.id
WHERE t.id IS NULL
AND u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;
```

---

## 🔒 Security Verification

- [ ] Password NOT returned in API response
- [ ] Email uniqueness enforced across ALL tables
- [ ] One auth user = One tenant (database constraint)
- [ ] RLS policies allow tenant isolation
- [ ] Audit trail captures all actions
- [ ] Admin-only access to provisioning endpoint

---

## 🚀 Production Deployment Checklist

- [x] Edge Function deployed
- [x] Database migration applied
- [x] UNIQUE constraint added
- [x] Cleanup script available
- [ ] Test provisioning in production
- [ ] Verify audit logs work
- [ ] Document cleanup process for team

---

## 📝 Known Issues & Workarounds

### Issue: Orphaned Auth Users
**Problem**: If provisioning fails after auth user creation, user is left in auth.users
**Workaround**: Run `CLEANUP_orphaned_auth_users.sql` periodically
**Future Fix**: Implement auth user deletion in rollback (requires additional permissions)

### Issue: Duplicate Slug Detection
**Problem**: Slug uniqueness checked at database level (constraint), not validated beforehand
**Impact**: Auth user created before slug conflict detected
**Workaround**: Cleanup orphaned user afterward
**Future Fix**: Add slug availability check BEFORE auth user creation

---

## ✅ Success Criteria

A successful provisioning test should result in:
1. ✅ Tenant created with `status='active'`
2. ✅ Auth user created and linked via `owner_id`
3. ✅ Auto_provisioning record with `status='completed'`
4. ✅ Profile created with correct role
5. ✅ Complete audit trail in `tenant_provisioning_audit`
6. ✅ NO password in API response
7. ✅ Tenant immediately accessible (RLS allows 'pending' and 'completed')

---

## 🧹 Cleanup After Testing

```sql
-- Delete test tenants
DELETE FROM tenants WHERE email LIKE '%test%' OR email LIKE '%example.com';

-- Delete orphaned auth users
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id FROM auth.users u
  LEFT JOIN tenants t ON t.owner_id = u.id
  WHERE t.id IS NULL
  AND u.created_at > NOW() - INTERVAL '1 day'
);
```
