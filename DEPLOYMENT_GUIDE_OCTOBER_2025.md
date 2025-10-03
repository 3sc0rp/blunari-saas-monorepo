# Blunari SaaS - October 2025 Deployment Guide

## 🎯 Overview

This deployment includes **5 major feature implementations** that enhance the Blunari SaaS platform:

1. ✅ **Server-Persisted Notification Read State** - Multi-device sync
2. ✅ **Secure Staff Invitation System** - Tokenized email invites
3. ✅ **Admin Users Migration** - Sunset legacy admin_users table
4. ✅ **Timezone-Safe Date Handling** - Fix UTC drift issues
5. ✅ **Email Notification Infrastructure** - Multi-provider email service

---

## 📋 Quick Deployment Checklist

- [ ] Apply database migrations (3 total)
- [ ] Deploy edge functions (2 total)
- [ ] Configure email service (optional)
- [ ] Test staff invitation flow
- [ ] Verify notification sync across devices
- [ ] Update environment variables

---

## 🗄️ Database Migrations

### Migration 1: Notification Reads Table
**File:** `supabase/migrations/20251003000000_add_notification_reads_table.sql`

**What it does:**
- Creates `notification_reads` table for server-side read state
- Adds RLS policies for user isolation
- Creates 4 helper RPCs for notification management

**Apply via:**
```bash
# Supabase Dashboard
SQL Editor → Paste contents → Run

# Or via CLI
cd apps/admin-dashboard
npx supabase db push
```

**Verification:**
```sql
-- Check table exists
SELECT * FROM information_schema.tables WHERE table_name = 'notification_reads';

-- Check RPC functions
SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';
```

---

### Migration 2: Sunset Admin Users
**File:** `supabase/migrations/20251003010000_sunset_admin_users.sql`

**What it does:**
- Updates `has_admin_access()` to use `employees` table exclusively
- Creates `admin_users_compat` view for backward compatibility
- Migrates existing `admin_users` data to `employees`
- Adds deprecation warnings

**Apply via:**
```bash
npx supabase db push
```

**Verification:**
```sql
-- Check migration status
SELECT * FROM check_admin_users_deprecation();

-- Verify has_admin_access uses employees
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'has_admin_access';
```

---

## 🔧 Edge Functions Deployment

### Function 1: invite-staff
**Location:** `supabase/functions/invite-staff/index.ts`

**Dependencies:**
- `supabase/functions/_shared/emailService.ts`

**Deploy:**
```bash
npx supabase functions deploy invite-staff --project-ref YOUR_PROJECT_REF
```

**Environment Variables:**
```bash
# Required
npx supabase secrets set ADMIN_DASHBOARD_URL=https://admin.yourdomain.com

# Optional (for email)
npx supabase secrets set EMAIL_PROVIDER=resend
npx supabase secrets set RESEND_API_KEY=re_xxxxx
npx supabase secrets set EMAIL_FROM=noreply@yourdomain.com
npx supabase secrets set EMAIL_FROM_NAME="Blunari Team"

# Or disable email temporarily
npx supabase secrets set EMAIL_ENABLED=false
```

**Test:**
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/invite-staff' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com", "role": "SUPPORT"}'
```

---

### Function 2: accept-staff-invitation
**Location:** `supabase/functions/accept-staff-invitation/index.ts`

**Deploy:**
```bash
npx supabase functions deploy accept-staff-invitation --project-ref YOUR_PROJECT_REF
```

**Test:**
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/accept-staff-invitation' \
  -H 'Content-Type: application/json' \
  -d '{"token": "INVITATION_TOKEN", "password": "SecurePass123!"}'
```

---

## 📧 Email Service Configuration

### Supported Providers

**Resend (Recommended)**
```bash
npx supabase secrets set EMAIL_PROVIDER=resend
npx supabase secrets set RESEND_API_KEY=re_xxxxx
```

**SendGrid**
```bash
npx supabase secrets set EMAIL_PROVIDER=sendgrid
npx supabase secrets set SENDGRID_API_KEY=SG.xxxxx
```

**Mailgun**
```bash
npx supabase secrets set EMAIL_PROVIDER=mailgun
npx supabase secrets set MAILGUN_API_KEY=xxxxx
npx supabase secrets set MAILGUN_DOMAIN=mg.yourdomain.com
```

**Disable Email (Development)**
```bash
npx supabase secrets set EMAIL_ENABLED=false
```

When disabled, invitation links are returned in the API response and logged to console.

---

## 🎨 Frontend Updates

### Client Dashboard Changes
- **File:** `apps/client-dashboard/src/hooks/useTenantNotifications.ts`
  - Added server sync for notification read state
  - Graceful fallback to localStorage

- **File:** `apps/client-dashboard/src/utils/dateUtils.ts` (NEW)
  - Timezone-aware date utilities
  - Fixes UTC drift issues

- **File:** `apps/client-dashboard/src/hooks/useRealtimeCommandCenter.ts`
  - Updated to use timezone-safe date ranges

- **File:** `apps/client-dashboard/src/pages/CommandCenter.tsx`
  - Initializes dates in tenant timezone

### Admin Dashboard Changes
- **File:** `apps/admin-dashboard/src/contexts/AuthContext.tsx`
  - Removed `admin_users` fallback
  - Uses `employees` table exclusively

- **File:** `apps/admin-dashboard/src/components/employees/InviteEmployeeDialog.tsx`
  - Updated to call `invite-staff` edge function
  - Enhanced error handling

- **File:** `apps/admin-dashboard/src/pages/AcceptInvitation.tsx` (NEW)
  - Public invitation acceptance page
  - Password setup for new users

- **File:** `apps/admin-dashboard/src/components/employees/InvitationsList.tsx` (NEW)
  - Invitation management UI
  - Copy invitation links
  - View status (pending/accepted/expired)

- **File:** `apps/admin-dashboard/src/pages/EmployeesPage.tsx`
  - Integrated `InvitationsList` component

- **File:** `apps/admin-dashboard/src/App.tsx`
  - Added `/accept-invitation` route

---

## 🧪 Testing Guide

### Test 1: Notification Read Sync

**Client Dashboard:**
1. Log in as tenant user on Device A
2. Mark notification as read
3. Log in with same account on Device B
4. Verify notification shows as read ✅

**Database Check:**
```sql
SELECT * FROM notification_reads 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;
```

---

### Test 2: Staff Invitation Flow

**Send Invitation:**
1. Log in to admin dashboard as `SUPER_ADMIN` or `ADMIN`
2. Navigate to `/admin/employees`
3. Click "Invite Employee"
4. Fill form: `test@example.com`, Role: `SUPPORT`
5. Submit
6. Check console for invitation link (if email disabled)

**Accept Invitation:**
1. Open invitation link in incognito window
2. Should see AcceptInvitation page with email/role
3. Enter password (min 8 chars) twice
4. Click "Accept & Join Team"
5. Should redirect to dashboard

**Verification:**
```sql
-- Check employee created
SELECT * FROM employees WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);

-- Check invitation accepted
SELECT * FROM employee_invitations WHERE email = 'test@example.com';
```

---

### Test 3: Timezone-Safe Dates

**Command Center:**
1. Set tenant timezone to non-UTC (e.g., `America/New_York`)
2. Create booking for "today" at 11 PM local time
3. Verify it appears in today's list (not tomorrow)

**Code Test:**
```typescript
import { getTodayInTimezone, getDateRangeInTimezone } from '@/utils/dateUtils';

const today = getTodayInTimezone('America/New_York');
const range = getDateRangeInTimezone('2025-10-03', 'America/New_York');

console.log('Today in NY:', today);
console.log('Date range:', range);
```

---

### Test 4: Admin Users Migration

**Check Migration:**
```sql
-- Check if any code still references admin_users
SELECT * FROM check_admin_users_deprecation();

-- Verify has_admin_access uses employees
SELECT has_admin_access(); -- Should return true/false based on employees table

-- Check compatibility view
SELECT * FROM admin_users_compat WHERE user_id = auth.uid();
```

---

## 🔄 Rollback Procedures

### Rollback Notification Reads
```sql
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID);
DROP FUNCTION IF EXISTS mark_notification_unread(UUID);
DROP FUNCTION IF EXISTS mark_notifications_read(UUID[], UUID);
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
DROP TABLE IF EXISTS notification_reads;
```

Frontend will automatically fall back to localStorage.

### Rollback Admin Users Migration
```sql
-- Revert has_admin_access to check admin_users
CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  );
END;
$$;
```

### Rollback Edge Functions
```bash
npx supabase functions delete invite-staff
npx supabase functions delete accept-staff-invitation
```

---

## 📊 Monitoring & Observability

### Key Metrics to Monitor

**Notification Sync:**
```sql
-- Daily notification reads
SELECT DATE(created_at), COUNT(*) 
FROM notification_reads 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at);
```

**Staff Invitations:**
```sql
-- Invitation acceptance rate
SELECT 
  COUNT(*) as total_sent,
  COUNT(accepted_at) as accepted,
  ROUND(100.0 * COUNT(accepted_at) / COUNT(*), 2) as acceptance_rate_pct
FROM employee_invitations;
```

**Edge Function Logs:**
```bash
# View invite-staff logs
npx supabase functions logs invite-staff

# View accept-staff-invitation logs
npx supabase functions logs accept-staff-invitation
```

---

## 🐛 Troubleshooting

### Issue: "notification_reads table not found"
**Cause:** Migration not applied yet  
**Fix:** Apply migration #1  
**Impact:** Non-breaking, falls back to localStorage

### Issue: "invite-staff returns 403 FORBIDDEN"
**Cause:** User doesn't have ADMIN or SUPER_ADMIN role  
**Fix:** 
```sql
-- Check user role
SELECT role, status FROM employees WHERE user_id = 'YOUR_USER_ID';

-- Grant ADMIN role if needed
UPDATE employees SET role = 'ADMIN', status = 'ACTIVE' 
WHERE user_id = 'YOUR_USER_ID';
```

### Issue: "Email not sending"
**Cause:** Email service not configured or EMAIL_ENABLED=false  
**Fix:** Set up email provider secrets (see Email Service Configuration)  
**Workaround:** Invitation link is logged to console

### Issue: "Invitation link expired"
**Cause:** Invitations expire after 7 days  
**Fix:** Send a new invitation  
**Prevention:** Add reminder emails before expiry (future enhancement)

### Issue: "Timezone dates still wrong"
**Cause:** Tenant timezone not set correctly  
**Fix:** 
```sql
-- Check tenant timezone
SELECT id, name, timezone FROM tenants;

-- Update if needed
UPDATE tenants SET timezone = 'America/New_York' WHERE id = 'YOUR_TENANT_ID';
```

---

## 📈 Performance Considerations

### Database Indexes
All necessary indexes are created by migrations:
- `notification_reads`: user_id, tenant_id, notification_id, created_at
- `employee_invitations`: email, invitation_token, expires_at

### Query Optimization
- Notification reads use RLS for security (small performance overhead acceptable)
- Date range queries use GTE/LTE for index utilization
- Invitation lookups by token use unique index

### Caching Strategy
- Admin role cached in localStorage (10-min TTL, 5-min revalidation)
- Notification reads synced asynchronously (fire-and-forget)
- Date ranges computed in useMemo hooks

---

## 🔐 Security Checklist

- [x] All RLS policies tested and verified
- [x] Edge functions validate user authentication
- [x] Invitation tokens are cryptographically random (UUID v4)
- [x] Passwords minimum 8 characters
- [x] Role hierarchy enforced (only SUPER_ADMIN can invite SUPER_ADMIN)
- [x] Security events logged for all invite actions
- [x] Email service credentials stored as secrets
- [x] Invitation links expire after 7 days
- [x] One-time use enforced via accepted_at timestamp

---

## 📝 Environment Variables Reference

### Admin Dashboard
```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_ALLOWED_DOMAINS=blunari.ai,yourcompany.com

# Edge Functions (Supabase Secrets)
ADMIN_DASHBOARD_URL=https://admin.yourdomain.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Blunari Team
EMAIL_ENABLED=true  # Set to false to disable email
```

### Client Dashboard
```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📚 Documentation Updates

### New Documentation Files
- `IMPLEMENTATION_SUMMARY_2025_10_03.md` - Detailed implementation guide
- `QUICK_START_GUIDE.md` - Quick reference for features
- `DEPLOYMENT_GUIDE_OCTOBER_2025.md` - This file

### Updated Files
- `README.md` - Should add link to new features
- API documentation - Should document new edge functions

---

## 🚀 Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor edge function logs for errors
- [ ] Test invitation flow end-to-end
- [ ] Verify notification sync on multiple devices
- [ ] Check database performance metrics

### Short-term (Week 1)
- [ ] Gather feedback from team on invitation flow
- [ ] Monitor invitation acceptance rate
- [ ] Check for any timezone-related issues
- [ ] Review security event logs

### Medium-term (Month 1)
- [ ] Add email templates customization
- [ ] Implement invitation reminder emails
- [ ] Add bulk staff import feature
- [ ] Create invitation analytics dashboard

---

## 🎯 Success Criteria

✅ **Notification Sync**
- Users can mark notifications read on any device
- Read state syncs within 5 seconds
- Zero data loss vs localStorage-only

✅ **Staff Invitations**
- Invitations sent successfully via email
- Acceptance flow completes without errors
- New employees can sign in immediately
- Invitation links work across all browsers

✅ **Admin Migration**
- No references to `admin_users` in active code
- All admin checks use `employees` table
- Backward compatibility maintained via view

✅ **Timezone Handling**
- Bookings appear on correct day in local timezone
- No UTC drift for edge cases (11 PM bookings)
- Date filters work correctly for all timezones

---

## 📞 Support & Contact

**Issues:** Open GitHub issue with `[Deployment]` prefix  
**Urgent:** Contact via Slack #blunari-deployments  
**Documentation:** See IMPLEMENTATION_SUMMARY_2025_10_03.md

---

**Deployment Version:** 1.0.0  
**Date:** October 3, 2025  
**Prepared by:** AI Assistant (Claude Sonnet 4.5)  
**Review Status:** ⏳ Pending human review

