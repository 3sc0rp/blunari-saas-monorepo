# Vercel Environment Variables Setup Guide

## 🎯 Critical Production Configuration

This guide walks you through setting up environment variables in the Vercel dashboard for **client-dashboard** and **admin-dashboard**.

---

## Client Dashboard Environment Variables

### Access Vercel Dashboard
1. Go to: https://vercel.com/deewav3s-projects/client-dashboard
2. Click **Settings** → **Environment Variables**

### Required Variables

#### Core Supabase Configuration
```bash
VITE_SUPABASE_URL=https://kbfbbkcaxhzlnbqxwgoz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ4MTg2MTQsImV4cCI6MjA0MDM5NDYxNH0.W1_mT7WXrQrVvH9LZDDLphqBVyLEH3OBx-0k3fFuD-o
VITE_CLIENT_API_BASE_URL=https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1
```

#### Tenant Configuration
```bash
VITE_TENANT_RESOLVER=slug
```

#### Application Environment
```bash
VITE_APP_ENV=production
VITE_ENABLE_MOCK_DATA=false
```

#### Error Tracking (RECOMMENDED)
```bash
VITE_SENTRY_DSN=<your-sentry-dsn-here>
```

**To get your Sentry DSN:**
1. Create a free account at https://sentry.io
2. Create a new project: "blunari-client-dashboard"
3. Select "React" as platform
4. Copy the DSN (format: `https://xxx@xxx.ingest.sentry.io/xxx`)

#### Optional Analytics Debug (DEV ONLY)
```bash
# Do NOT set this in production
# VITE_ANALYTICS_DEBUG=false
```

---

## Admin Dashboard Environment Variables

### Access Vercel Dashboard
1. Go to: https://vercel.com/deewav3s-projects/admin-dashboard
2. Click **Settings** → **Environment Variables**

### Required Variables

#### Core Supabase Configuration
```bash
VITE_SUPABASE_URL=https://kbfbbkcaxhzlnbqxwgoz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ4MTg2MTQsImV4cCI6MjA0MDM5NDYxNH0.W1_mT7WXrQrVvH9LZDDLphqBVyLEH3OBx-0k3fFuD-o
```

#### Background Ops Configuration
```bash
VITE_BACKGROUND_OPS_URL=https://background-ops.fly.dev
VITE_BACKGROUND_OPS_API_KEY=<your-background-ops-api-key>
VITE_BACKGROUND_OPS_SIGNING_SECRET=<your-signing-secret>
```

#### Application Environment
```bash
VITE_APP_ENV=production
```

#### Error Tracking (RECOMMENDED)
```bash
VITE_SENTRY_DSN=<your-sentry-dsn-here>
```

**To get your Sentry DSN:**
1. Create project: "blunari-admin-dashboard"
2. Select "React" as platform
3. Copy the DSN

---

## 🚀 How to Add Variables in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. **Navigate to project settings**:
   - Client: https://vercel.com/deewav3s-projects/client-dashboard/settings/environment-variables
   - Admin: https://vercel.com/deewav3s-projects/admin-dashboard/settings/environment-variables

2. **For each variable**:
   - Click **Add New**
   - Enter **Key** (e.g., `VITE_APP_ENV`)
   - Enter **Value** (e.g., `production`)
   - Select **All Environments** (Production, Preview, Development)
   - Click **Save**

3. **Trigger redeployment**:
   - After adding all variables, go to **Deployments**
   - Click the **⋮** menu on latest deployment
   - Select **Redeploy**

### Method 2: Via Vercel CLI (Advanced)

```powershell
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add VITE_APP_ENV production
vercel env add VITE_SENTRY_DSN <your-dsn>

# Pull to verify
vercel env pull
```

---

## ✅ Verification Checklist

After setting up environment variables:

### Client Dashboard
- [ ] `VITE_SUPABASE_URL` set
- [ ] `VITE_SUPABASE_ANON_KEY` set
- [ ] `VITE_CLIENT_API_BASE_URL` set
- [ ] `VITE_TENANT_RESOLVER` set to `slug`
- [ ] `VITE_APP_ENV` set to `production`
- [ ] `VITE_ENABLE_MOCK_DATA` set to `false`
- [ ] `VITE_SENTRY_DSN` set (recommended)
- [ ] Redeployed after adding variables

### Admin Dashboard
- [ ] `VITE_SUPABASE_URL` set
- [ ] `VITE_SUPABASE_ANON_KEY` set
- [ ] `VITE_BACKGROUND_OPS_URL` set
- [ ] `VITE_BACKGROUND_OPS_API_KEY` set
- [ ] `VITE_BACKGROUND_OPS_SIGNING_SECRET` set
- [ ] `VITE_APP_ENV` set to `production`
- [ ] `VITE_SENTRY_DSN` set (recommended)
- [ ] Redeployed after adding variables

---

## 🧪 Testing After Setup

### 1. Check Build Logs
- Go to **Deployments** tab
- Click on latest deployment
- Verify no environment variable warnings
- Look for: `✓ Built successfully`

### 2. Test Application
- Visit: https://app.blunari.ai
- Open browser console (F12)
- Look for:
  - No `import.meta.env.VITE_*` errors
  - Sentry initialized message (if DSN configured)
  - Successful API calls to Supabase

### 3. Verify Production Mode
Check that debug features are disabled:
- `/test-widget` route should return 404
- Console should have minimal logging
- Sentry should capture errors (test by triggering one)

---

## 🔒 Security Notes

### Safe for Client-Side
- ✅ `VITE_SUPABASE_ANON_KEY` - Public key, safe to expose
- ✅ `VITE_SUPABASE_URL` - Public URL
- ✅ `VITE_SENTRY_DSN` - Public DSN

### NEVER Expose
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Never use in frontend
- ❌ Database passwords
- ❌ Private API keys

### Why VITE_ Prefix?
Vite only exposes environment variables that start with `VITE_` to the client bundle. This prevents accidentally exposing secrets.

---

## 🆘 Troubleshooting

### "Environment variable undefined"
**Problem**: `import.meta.env.VITE_XXX` returns `undefined`

**Solution**:
1. Verify variable is added in Vercel dashboard
2. Check it has `VITE_` prefix
3. Redeploy after adding variable
4. Clear browser cache

### "Sentry not initializing"
**Problem**: No Sentry events captured

**Solution**:
1. Verify `VITE_SENTRY_DSN` is set
2. Check DSN format: `https://xxx@xxx.ingest.sentry.io/xxx`
3. Look for initialization message in console:
   ```
   [Sentry] Initialized in production mode
   ```

### "Still seeing console.log in production"
**Problem**: Debug logs still appearing

**Solution**:
1. Verify `VITE_APP_ENV=production` is set
2. Check `import.meta.env.DEV` returns `false`
3. Trigger new deployment (git push or manual redeploy)

---

## 📚 Additional Resources

- **Vercel Environment Variables Docs**: https://vercel.com/docs/projects/environment-variables
- **Vite Environment Variables**: https://vitejs.dev/guide/env-and-mode.html
- **Sentry React Setup**: https://docs.sentry.io/platforms/javascript/guides/react/
- **Supabase Client Keys**: https://supabase.com/docs/guides/api/api-keys

---

**Last Updated**: October 13, 2025  
**Next Review**: After production testing
