# Manual Deployment Guide - Supabase Dashboard

## 🎯 Current Error
```
Restaurant Unavailable
HTTP 400: INVALID_ACTION: Invalid action specified
```

**Cause:** Edge function needs to be updated with the new `tenant` action handler.

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in if not already signed in
3. Select your project: **kbfbbkcaxhzlnbqxwgoz**

### Step 2: Navigate to Edge Functions
1. In the left sidebar, click **Edge Functions**
2. Find and click on **widget-booking-live** function
3. Click the **Edit** button (pencil icon) or **Deploy new version**

### Step 3: Get the Updated Code
The updated function code is located at:
```
apps/client-dashboard/supabase/functions/widget-booking-live/index.ts
```

### Step 4: Copy the Code
Open the file in your editor and copy **THE ENTIRE CONTENTS** from line 1 to the end.

**Important:** Make sure to copy the complete file, including:
- Import statements at the top
- All helper functions
- The complete serve() function with all action handlers

### Step 5: Paste into Supabase Dashboard
1. In the Supabase Dashboard editor, **clear all existing code**
2. Paste the entire copied code
3. Verify the code includes the new section around line 295:
   ```typescript
   if (action === "tenant") {
     console.log('[widget-booking-live] tenant lookup', ...);
     // ... tenant handler code
   }
   ```

### Step 6: Set Environment Variables (if needed)
Make sure these secrets are set in the edge function:
- `WIDGET_JWT_SECRET` (or `VITE_JWT_SECRET`)
- `USE_LOCAL_BOOKING` = `true`

To check/set secrets:
1. Go to Project Settings → Edge Functions → Secrets
2. Add if missing:
   - Key: `WIDGET_JWT_SECRET`
   - Value: `dev-jwt-secret-change-in-production-2025`

### Step 7: Deploy
1. Click **Deploy** or **Save & Deploy**
2. Wait for deployment to complete (usually 10-30 seconds)
3. Look for success message

### Step 8: Verify Deployment
Run the test script:
```bash
node test-widget-simple.mjs
```

**Expected Result:**
```
✅ TEST PASSED: Tenant lookup successful
📦 Tenant Data:
  ID: [tenant-id]
  Name: [restaurant-name]
  Slug: test-restaurant
```

---

## 🔍 What Changed in the Code

The key addition is the new `tenant` action handler (around line 295-332):

```typescript
if (action === "tenant") {
  console.log('[widget-booking-live] tenant lookup', { requestId, tenant: resolvedTenantId });
  
  // Fetch or use already resolved tenant
  if (!resolvedTenant) {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, name, timezone, currency, business_hours')
      .eq('id', resolvedTenantId)
      .maybeSingle();
    
    if (tenantError || !tenant) {
      return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404, requestId);
    }
    resolvedTenant = tenant;
  }
  
  const responseData = {
    tenant_id: resolvedTenant.id,
    slug: resolvedTenant.slug,
    name: resolvedTenant.name,
    timezone: resolvedTenant.timezone || 'UTC',
    currency: resolvedTenant.currency || 'USD',
    business_hours: resolvedTenant.business_hours || [],
    branding: {
      primary_color: '#3b82f6',
      secondary_color: '#1e40af',
    },
    features: {
      deposit_enabled: false,
      revenue_optimization: true,
    },
  };
  
  return new Response(
    JSON.stringify(responseData),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } }
  );
} else if (action === "search") {
  // ... existing search handler
```

This handler:
1. ✅ Validates the widget token
2. ✅ Resolves the tenant from the database
3. ✅ Returns formatted tenant information
4. ✅ Enables the booking widget to load restaurant info

---

## ⚠️ Troubleshooting

### Issue: "Permission Denied" when deploying
**Solution:** Contact your project owner to grant you deployment permissions or ask them to deploy.

### Issue: Code editor shows syntax errors
**Solution:** Make sure you copied the ENTIRE file, including all imports and helper functions.

### Issue: Test still fails after deployment
**Solutions:**
1. Wait 30 seconds for deployment to propagate
2. Check edge function logs in Supabase Dashboard
3. Verify `WIDGET_JWT_SECRET` matches between client and function
4. Ensure tenant slug exists in database

### Issue: "Tenant not found" error
**Solution:** 
1. Check that a tenant exists in the database with the slug you're testing
2. Create a test tenant in the database if needed:
   ```sql
   INSERT INTO tenants (slug, name, timezone, currency, status)
   VALUES ('test-restaurant', 'Test Restaurant', 'UTC', 'USD', 'active');
   ```

---

## 📊 Quick Reference

**Project Details:**
- Project Ref: `kbfbbkcaxhzlnbqxwgoz`
- Supabase URL: `https://kbfbbkcaxhzlnbqxwgoz.supabase.co`
- Edge Function: `widget-booking-live`
- Function Path: `apps/client-dashboard/supabase/functions/widget-booking-live/index.ts`

**Test Commands:**
```bash
# Quick test
node test-widget-simple.mjs

# Full test suite (requires service key)
node test-booking-widget-complete.mjs

# Check logs
npx supabase functions logs widget-booking-live --project-ref kbfbbkcaxhzlnbqxwgoz
```

---

## ✅ Success Indicators

After successful deployment, you should see:

1. **In Test Output:**
   ```
   ✅ TEST PASSED: Tenant lookup successful
   🎉 All checks passed!
   ```

2. **In Browser:**
   - Restaurant name loads correctly
   - No "Restaurant Unavailable" error
   - Booking widget shows party size selection

3. **In Logs:**
   ```
   [widget-booking-live] tenant lookup
   Tenant resolved: true Name: Test Restaurant
   ```

---

## 🎉 After Successful Deployment

Once deployed and tested successfully:

1. ✅ Widget will load restaurant information correctly
2. ✅ Public booking widgets will work
3. ✅ Dashboard bookings continue to work
4. ✅ All authentication flows are secured
5. ✅ Ready for production use

Then you can:
- Test the full booking flow in the browser
- Create actual reservations through the widget
- Monitor edge function logs for any issues

---

**Need Help?**
- Check `DEPLOYMENT-STATUS.md` for more details
- Review `BOOKING-WIDGET-DEBUG-SUMMARY.md` for technical background
- All code changes are in GitHub: https://github.com/3sc0rp/blunari-saas-monorepo

**Status:** Ready for manual deployment via Supabase Dashboard
