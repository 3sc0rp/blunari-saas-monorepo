# 🔄 Restart Admin Dashboard to See Password Feature

## Why You Need to Restart

The password generation feature code changes were made to:
- ✅ Edge function (tenant-provisioning) - **JUST REDEPLOYED**
- ✅ TypeScript types (admin.ts) - Needs rebuild
- ✅ UI component (TenantProvisioningWizard.tsx) - Needs rebuild

The admin dashboard is currently running with the OLD code before the password feature was added.

---

## Quick Restart Steps

### Option 1: Restart Current Terminal (Recommended)

1. **Find the terminal running the admin dashboard**
   - Look for terminal with `npm run dev` or `turbo dev`
   - Usually shows: `VITE v5.x.x ready in xxx ms`

2. **Stop the server**
   - Press `Ctrl+C` in that terminal

3. **Restart the server**
   ```bash
   npm run dev
   # OR
   turbo dev
   ```

4. **Wait for build to complete**
   - Should see: `VITE v5.x.x ready in xxx ms`
   - Then: `Local: http://localhost:xxxx`

5. **Hard refresh the browser**
   - Press `Ctrl+Shift+R` (Windows)
   - Or `Cmd+Shift+R` (Mac)

---

### Option 2: From PowerShell

```powershell
# Stop any running dev servers
Get-Process node | Where-Object { $_.Id -eq 38644 } | Stop-Process -Force

# Navigate to project
cd "c:\Users\Drood\Desktop\Blunari SAAS"

# Start dev server
npm run dev
```

---

## After Restart: How to Test

### Test 1: Create New Tenant
1. Go to: http://localhost:5173 (or your admin dashboard URL)
2. Log in as admin: `admin@blunari.ai` / `admin123`
3. Navigate to: **Admin → Tenants → Create New Tenant**
4. Fill in the form:
   - Restaurant Name: "Test Password Feature"
   - Owner Email: `test-pwd-feature-${Date.now()}@example.com` (unique email!)
   - Slug: (auto-generated)
5. Click "Create Tenant"

### Test 2: Verify Credentials Display

After successful provisioning, you should see:

```
┌─────────────────────────────────────────┐
│ 🛡️  Owner Login Credentials              │
│                                          │
│ Save these credentials immediately.      │
│ The password will not be displayed again.│
│                                          │
│ Email                                    │
│ ┌────────────────────┐  ┌──────┐        │
│ │ test-pwd...@ex.com │  │ Copy │        │
│ └────────────────────┘  └──────┘        │
│                                          │
│ Password (Temporary)                     │
│ ┌────────────────────┐  ┌──────┐        │
│ │ X7k#mN2@pQ9wR5!d   │  │ Copy │        │
│ └────────────────────┘  └──────┘        │
│                                          │
│ ⚠️ Important: Save these credentials     │
│ immediately.                             │
└─────────────────────────────────────────┘
```

**What to look for**:
- ✅ Amber/yellow alert box with shield icon
- ✅ Email field with copy button
- ✅ Password field showing 16-character password
- ✅ Copy button for password
- ✅ Security warning at bottom

### Test 3: Verify Password Works

1. Copy the password using the copy button
2. Open client dashboard in incognito window
3. Log in with:
   - Email: (the owner email from provisioning)
   - Password: (the copied password)
4. Should log in successfully!

---

## Troubleshooting

### Issue: Still Don't See Credentials

**Check 1: Verify Edge Function Deployed**
```bash
cd "c:\Users\Drood\Desktop\Blunari SAAS"
supabase functions list | findstr "tenant-provisioning"
```
Should show: `tenant-provisioning` with recent timestamp

**Check 2: Verify Frontend Code Built**
- Look at terminal output after restart
- Should see: `✓ built in XXXms`
- Should NOT see any TypeScript errors

**Check 3: Clear Browser Cache**
- Hard refresh: `Ctrl+Shift+R`
- Or: Clear all browser data for localhost
- Or: Try incognito/private window

**Check 4: Check Browser Console**
- Press `F12` to open DevTools
- Go to Console tab
- Look for errors after provisioning
- Should see network request to tenant-provisioning with 200 status

### Issue: Got Error During Provisioning

**Check Edge Function Logs**:
```bash
# In Supabase dashboard
# Go to: Edge Functions → tenant-provisioning → Logs
# Look for recent errors
```

**Common Issues**:
- "email_confirm: false" in logs → Edge function not updated (redeploy)
- "ownerCredentials is undefined" → Frontend not rebuilt (restart)
- "Cannot read property 'password'" → Type mismatch (check imports)

---

## Expected Before/After

### BEFORE Restart
- ❌ No credentials section after provisioning
- ❌ Just shows: Tenant ID, Slug, Primary URL
- ❌ Owner can't log in (no password set)

### AFTER Restart
- ✅ Credentials section with amber alert box
- ✅ Shows: Email + 16-char password with copy buttons
- ✅ Security warning displayed
- ✅ Owner can log in immediately with password

---

## Quick Checklist

- [ ] Stop dev server (`Ctrl+C`)
- [ ] Restart dev server (`npm run dev`)
- [ ] Wait for build to complete
- [ ] Hard refresh browser (`Ctrl+Shift+R`)
- [ ] Test provisioning with NEW owner email
- [ ] Verify credentials display
- [ ] Test owner login with password

---

**Time**: 2-3 minutes for restart + test  
**Current Status**: Edge function deployed ✅, Frontend needs restart ⏳
