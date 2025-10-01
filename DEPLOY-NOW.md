# 🚀 DEPLOY NOW - Fix the "INVALID_ACTION" Error

## ❌ Current Error:
```
HTTP 400: INVALID_ACTION: Invalid action specified
Restaurant Unavailable
```

## ✅ Solution: Deploy Updated Edge Function (5 minutes)

---

## 📋 **Quick Deploy - Follow These Steps:**

### Step 1: Open Supabase Dashboard in Browser

Click this link or copy-paste into your browser:
```
https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions/widget-booking-live
```

### Step 2: Edit the Function

1. You should see the **widget-booking-live** function page
2. Click the **"Edit function"** button (or pencil icon)
3. This will open the code editor

### Step 3: Get the Updated Code

Open this file in VS Code or your editor:
```
C:\Users\Drood\Desktop\Blunari SAAS\apps\client-dashboard\supabase\functions\widget-booking-live\index.ts
```

**OR** use this command to open it:
```powershell
code "apps\client-dashboard\supabase\functions\widget-booking-live\index.ts"
```

### Step 4: Copy & Paste

1. **In your editor:** Select ALL the code (Ctrl+A) and Copy (Ctrl+C)
2. **In Supabase Dashboard:** Select all existing code (Ctrl+A) and Delete
3. **Paste** the new code (Ctrl+V)

### Step 5: Verify the New Code

Scroll to around **line 295** and verify you see this:
```typescript
if (action === "tenant") {
  console.log('[widget-booking-live] tenant lookup', { requestId, tenant: resolvedTenantId });
```

If you see this, you have the right code! ✅

### Step 6: Deploy

1. Click the **"Deploy"** or **"Save & Deploy"** button
2. Wait 30 seconds for deployment to complete
3. You should see a success message

### Step 7: Test It

Run this command in PowerShell:
```powershell
node test-widget-simple.mjs
```

**Expected Result:**
```
✅ TEST PASSED: Tenant lookup successful
📦 Tenant Data:
  ID: [some-id]
  Name: [restaurant-name]
  Slug: test-restaurant

🎉 All checks passed!
```

### Step 8: Test in Browser

Refresh your booking widget page - the error should be gone! 🎉

---

## 🔍 **What if Supabase Dashboard shows "Access Denied"?**

If you can't edit the function in the dashboard, you have 2 options:

### Option A: Get Access
Contact the project owner and ask them to:
1. Add you as a "Developer" in Project Settings → Team
2. Or deploy the function for you

### Option B: Request Owner to Deploy
Send them this message:

```
Hi! I need help deploying an updated edge function. 

Please:
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions/widget-booking-live
2. Click "Edit function"
3. Copy ALL code from: apps/client-dashboard/supabase/functions/widget-booking-live/index.ts
4. Paste it into the dashboard editor (replace all existing code)
5. Click "Deploy"

This fixes a critical bug where the booking widget shows "INVALID_ACTION" error.

The changes are already committed to GitHub in commit f3970068.
```

---

## 📦 **Alternative: Use GitHub to Deploy**

If your Supabase project is connected to GitHub, you can:

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
2. Check if GitHub integration is enabled
3. The function should auto-deploy from your latest commit

---

## ⚡ **Super Quick Summary:**

1. Open: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions/widget-booking-live
2. Click "Edit"
3. Copy code from: `apps/client-dashboard/supabase/functions/widget-booking-live/index.ts`
4. Paste into dashboard
5. Click "Deploy"
6. Test with: `node test-widget-simple.mjs`
7. Done! ✅

---

## 🎯 **Why This Fixes the Error:**

The current deployed edge function doesn't have the `tenant` action handler.

When the booking widget tries to call:
```javascript
action: 'tenant'  // ❌ Current function doesn't recognize this
```

The function returns: "INVALID_ACTION"

After deployment, the function will recognize the `tenant` action and return the restaurant information correctly. ✅

---

## 📞 **Still Stuck?**

If you complete the deployment but still see errors:

1. **Wait 60 seconds** - deployment needs time to propagate
2. **Clear browser cache** - Old code might be cached
3. **Check the test script** - Run `node test-widget-simple.mjs` to verify
4. **Check logs:** 
   ```powershell
   npx supabase functions logs widget-booking-live --project-ref kbfbbkcaxhzlnbqxwgoz
   ```

---

## ✅ **Success Checklist:**

After deployment, you should have:

- [ ] No more "INVALID_ACTION" error
- [ ] Restaurant name loads in widget
- [ ] Test script passes with ✅
- [ ] Can proceed to booking form
- [ ] Everything works! 🎉

---

**Time Required:** 5-10 minutes  
**Difficulty:** Easy - just copy & paste!  
**Risk:** None - this only fixes the bug  

**Let's do this!** 🚀
