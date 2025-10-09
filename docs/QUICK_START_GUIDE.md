# Quick Start Guide - New Features

## 🚀 What's New

### 1. Server-Persisted Notification Read State
Notifications now sync across devices! Read state is stored server-side while maintaining localStorage fallback.

### 2. Secure Staff Invitation System
Invite internal staff via tokenized email invitations with role-based access control.

---

## ⚡ Quick Deploy

### Step 1: Apply Database Migration
```bash
# Via Supabase Dashboard (recommended for first time)
1. Go to SQL Editor
2. Copy contents of: supabase/migrations/20251003000000_add_notification_reads_table.sql
3. Click "Run"

# Or via CLI
cd apps/admin-dashboard
npx supabase db push
```

### Step 2: Deploy Edge Functions
```bash
# Deploy both functions
npx supabase functions deploy invite-staff --project-ref YOUR_PROJECT_REF
npx supabase functions deploy accept-staff-invitation --project-ref YOUR_PROJECT_REF

# Optional: Set environment variable for invitation links
npx supabase secrets set ADMIN_DASHBOARD_URL=https://admin.yourdomain.com
```

### Step 3: Test It Out

**Test Notifications:**
1. Log into client dashboard
2. Mark a notification as read
3. Log in on another device → should show as read ✅

**Test Staff Invite:**
1. Log into admin dashboard as SUPER_ADMIN or ADMIN
2. Go to `/employees` → Click "Invite Employee"
3. Fill form → Submit
4. Check browser console for invitation link
5. Use link in test script or API call

---

## 🧪 Quick Test

```bash
# Install dependencies if needed
npm install @supabase/supabase-js

# Run test script
ADMIN_EMAIL=your-admin@company.com \
ADMIN_PASSWORD=your-password \
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
node scripts/test-staff-invite.mjs
```

Expected output:
```
🧪 Testing Staff Invite Flow
============================================================
✅ Authenticated as: your-admin@company.com
✅ Invitation created successfully
✅ Invitation accepted successfully
✅ Employee record verified
🎉 All tests passed successfully!
```

---

## 📋 Files Changed

### New Files
- `supabase/migrations/20251003000000_add_notification_reads_table.sql` - Database schema
- `supabase/functions/invite-staff/index.ts` - Invitation creation
- `supabase/functions/accept-staff-invitation/index.ts` - Invitation acceptance
- `scripts/test-staff-invite.mjs` - Test script
- `IMPLEMENTATION_SUMMARY_2025_10_03.md` - Full documentation

### Modified Files
- `apps/client-dashboard/src/hooks/useTenantNotifications.ts` - Added server sync
- `apps/admin-dashboard/src/components/employees/InviteEmployeeDialog.tsx` - Updated to use new edge function

---

## 🔍 Quick Verification

### Check Notification Sync
```sql
-- See your notification reads
SELECT * FROM notification_reads WHERE user_id = auth.uid();
```

### Check Staff Invitations
```sql
-- See pending invitations
SELECT * FROM employee_invitations WHERE accepted_at IS NULL;

-- See recent employees
SELECT e.*, u.email FROM employees e 
JOIN auth.users u ON e.user_id = u.id 
ORDER BY e.created_at DESC LIMIT 5;
```

---

## ⚠️ Important Notes

1. **Email Not Implemented Yet**: Invitation links are logged to console. Add email service integration in production.

2. **Backward Compatible**: All changes are additive. No breaking changes to existing functionality.

3. **Graceful Degradation**: If migration not applied, notifications fall back to localStorage-only mode.

4. **Security**: Only SUPER_ADMIN and ADMIN can invite staff. All actions are logged to `security_events`.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "notification_reads table not found" | Migration not applied yet. Run Step 1 above. System will work with localStorage until then. |
| "invite-staff returns 403" | User is not SUPER_ADMIN or ADMIN. Check `employees` table for role. |
| "Edge function not found" | Deploy edge functions (Step 2 above). |
| "Token expired" | Tokens expire after 7 days. Create a new invitation. |

---

## 📞 Next Steps

1. ✅ Deploy to staging environment
2. ⏳ Add email integration (SendGrid/Mailgun)
3. ⏳ Create `/accept-invitation` UI page
4. ⏳ Add invitation management table in admin dashboard

---

**For detailed documentation, see:** `IMPLEMENTATION_SUMMARY_2025_10_03.md`

