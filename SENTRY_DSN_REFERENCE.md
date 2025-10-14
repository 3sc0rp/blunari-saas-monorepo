# Sentry DSN Reference

**Created**: October 13, 2025

---

## 🔐 Sentry DSNs

### Client Dashboard ✅
```
https://cd0a59092de2b3cc44ceb2078be5d2b7@o4509964985892864.ingest.us.sentry.io/4510184776138752
```

### Admin Dashboard ⏳ (Not created yet)
```
Create second Sentry project for admin dashboard
```

---

## ✅ Vercel Configuration

### Client Dashboard
**URL**: https://vercel.com/deewav3s-projects/client-dashboard/settings/environment-variables

**Variables to add**:
1. `VITE_SENTRY_DSN` = `https://cd0a59092de2b3cc44ceb2078be5d2b7@o4509964985892864.ingest.us.sentry.io/4510184776138752` (All environments)
2. `VITE_APP_ENV` = `production` (Production only)

### Admin Dashboard ⏳
**Not configured yet**

1. Create new Sentry project: "blunari-admin-dashboard"
2. Select platform: React
3. Copy the DSN
4. Come back here and add variables to Vercel

---

## 🚀 After Adding Variables

### Redeploy Client Dashboard
1. Go to: https://vercel.com/deewav3s-projects/client-dashboard/deployments
2. Click ⋮ on latest deployment
3. Select "Redeploy"

### Redeploy Admin Dashboard
1. Go to: https://vercel.com/deewav3s-projects/admin-dashboard/deployments
2. Click ⋮ on latest deployment
3. Select "Redeploy"

---

## 🧪 Verification

After redeployment completes:

### Test Client Dashboard
```javascript
// Open https://app.blunari.ai console
console.log(import.meta.env.VITE_SENTRY_DSN);
// Should show: https://cd0a59092de2b3cc44ceb2078be5d2b7@...

// Test error tracking
throw new Error('Testing Sentry - Client Dashboard');
// Check Sentry dashboard after 30 seconds
```

### Test Admin Dashboard
⏳ Configure admin dashboard Sentry first

---

## 📊 Sentry Dashboard Links

- **Organization**: https://sentry.io/organizations/o4509964985892864/
- **Client Dashboard Project**: https://sentry.io/organizations/o4509964985892864/projects/4510184776138752/
- **Admin Dashboard Project**: ⏳ Not created yet

---

## ✅ Checklist

**Client Dashboard:**
- [ ] Added `VITE_SENTRY_DSN` to client-dashboard Vercel
- [ ] Added `VITE_APP_ENV=production` to client-dashboard Vercel
- [ ] Redeployed client-dashboard
- [ ] Verified Sentry initialization in console
- [ ] Tested error tracking

**Admin Dashboard:**
- [ ] Create Sentry project for admin-dashboard
- [ ] Get admin dashboard DSN
- [ ] Add `VITE_SENTRY_DSN` to admin-dashboard Vercel
- [ ] Add `VITE_APP_ENV=production` to admin-dashboard Vercel
- [ ] Redeploy admin-dashboard
- [ ] Verify Sentry initialization in console
- [ ] Test error tracking

**Once all checked**: ✅ Production hardening complete! (A+ grade)

---

**Security Note**: These DSNs are safe to commit to git as they are public client keys. However, NEVER commit `SUPABASE_SERVICE_ROLE_KEY` or other service-role secrets.
