# 🚀 QUICK START - Production Configuration

**Time Required**: 30 minutes  
**Status**: Code ready, needs manual Vercel configuration

---

## ✅ What's Already Done (Automatic)

- Debug routes disabled in production
- Console logs cleaned up (DEV-gated)
- Changes deployed via Git push
- Vercel auto-deploying now

**Monitor**: https://vercel.com/deewav3s-projects/client-dashboard/deployments

---

## 🎯 What You Need To Do (Manual)

### 1️⃣ Create Sentry Account (5 min)

1. **Go to**: https://sentry.io/signup/
2. **Sign up** (free plan is fine)
3. **Create project**: `blunari-client-dashboard`
   - Platform: **React**
4. **Copy DSN**: `https://xxx@xxx.ingest.sentry.io/xxx`
5. **Create project**: `blunari-admin-dashboard`
   - Platform: **React**
6. **Copy DSN**: `https://xxx@xxx.ingest.sentry.io/xxx`

---

### 2️⃣ Configure Client Dashboard Vercel (5 min)

1. **Go to**: https://vercel.com/deewav3s-projects/client-dashboard/settings/environment-variables

2. **Add these variables** (click "Add New" for each):

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SENTRY_DSN` | `https://xxx@xxx.ingest.sentry.io/xxx` | All |
| `VITE_APP_ENV` | `production` | Production |

3. **Click Save** after each

---

### 3️⃣ Configure Admin Dashboard Vercel (5 min)

1. **Go to**: https://vercel.com/deewav3s-projects/admin-dashboard/settings/environment-variables

2. **Add these variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SENTRY_DSN` | `https://xxx@xxx.ingest.sentry.io/xxx` | All |
| `VITE_APP_ENV` | `production` | Production |

3. **Click Save** after each

---

### 4️⃣ Redeploy Both Dashboards (5 min)

#### Client Dashboard
1. Go to: https://vercel.com/deewav3s-projects/client-dashboard/deployments
2. Click **⋮** on latest deployment
3. Select **"Redeploy"**
4. Wait 2-4 minutes

#### Admin Dashboard
1. Go to: https://vercel.com/deewav3s-projects/admin-dashboard/deployments
2. Click **⋮** on latest deployment
3. Select **"Redeploy"**
4. Wait 2-4 minutes

---

### 5️⃣ Quick Verification (10 min)

#### Test Client Dashboard

1. **Open**: https://app.blunari.ai
2. **Press F12** (open console)
3. **Run this**:
   ```javascript
   console.log(import.meta.env.VITE_APP_ENV);
   // Expected: "production"
   ```
4. **Look for**: "Sentry initialized" message
5. **Check**: Minimal console output (no debug logs)

#### Test Debug Route Disabled

1. **Try to access**: https://app.blunari.ai/test-widget
2. **Expected**: 404 Not Found or redirected

#### Test Sentry Error Tracking

1. **Open console** and run:
   ```javascript
   throw new Error('Testing Sentry');
   ```
2. **Wait 30 seconds**
3. **Check Sentry dashboard**: https://sentry.io/issues/
4. **Expected**: See "Testing Sentry" error

---

## ✅ Success Checklist

After completing steps 1-5:

- [ ] Sentry DSN configured for both dashboards
- [ ] VITE_APP_ENV set to "production"
- [ ] Both dashboards redeployed
- [ ] Console shows "production" mode
- [ ] /test-widget returns 404
- [ ] Sentry captures test error
- [ ] Minimal console logging

**If all checked**: ✅ **Production hardening complete!**

---

## 🆘 Quick Troubleshooting

### "Sentry not initialized"
- Check: VITE_SENTRY_DSN is set in Vercel
- Verify: Redeployment completed successfully
- Try: Hard refresh (Ctrl+Shift+R)

### "Still seeing console.log"
- Check: VITE_APP_ENV returns "production"
- Verify: Latest commit (b0b3464b) is deployed
- Try: Clear cache and hard reload

### "/test-widget still accessible"
- Check: Environment is "production" not "preview"
- Verify: Deployment used production branch
- Try: Incognito mode

---

## 📚 Detailed Guides

For more information, see:

- **Full Vercel setup**: `VERCEL_ENV_SETUP_GUIDE.md`
- **Rate limiting**: `SUPABASE_RATE_LIMITING_GUIDE.md`
- **Complete testing**: `PRODUCTION_TESTING_COMPLETE_CHECKLIST.md`
- **Full summary**: `PRODUCTION_READINESS_COMPLETE.md`

---

## 🎯 After This Quick Start

### Optional but Recommended (This Week)

1. **Enable Supabase rate limiting** (20 min)
   - See: `SUPABASE_RATE_LIMITING_GUIDE.md`
   - Go to Supabase → Settings → API
   - Set: 60 req/min per IP

2. **Complete production testing** (2-3 hours)
   - See: `PRODUCTION_TESTING_COMPLETE_CHECKLIST.md`
   - Test all user flows
   - Document any issues

3. **Set up monitoring** (30 min)
   - Configure Sentry alerts
   - Set up uptime monitoring (optional)
   - Create runbook for common issues

---

**Created**: October 13, 2025  
**Commit**: b0b3464b  
**Status**: Ready for manual configuration
