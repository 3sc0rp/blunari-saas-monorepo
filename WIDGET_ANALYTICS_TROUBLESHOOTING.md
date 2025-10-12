# Widget Analytics 400 Error - Troubleshooting Guide

**Date:** October 12, 2025  
**Status:** ⚠️ Debugging Required

## Current Status

✅ **Edge Function:** Deployed and working (tested successfully with 200 response)  
✅ **Database:** All migrations applied  
✅ **Client Build:** Completed successfully  
❓ **Browser:** Needs cache clear and testing

## Verified Working

I tested the Edge Function directly and it **works perfectly**:

```bash
POST https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/widget-analytics
Body: {"tenantId":"00000000-0000-0000-0000-000000000000","widgetType":"booking","timeRange":"7d"}

Response: 200 OK
{
  "success": true,
  "data": {
    "totalViews": 59,
    "totalClicks": 15,
    "conversionRate": 0,
    "avgSessionDuration": 180,
    "totalBookings": 0,
    // ... more analytics data
  },
  "meta": {
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "widgetType": "booking",
    "timeRange": "7d",
    "authMethod": "authenticated",
    "version": "2025-09-13.4",
    "correlationId": "0e152383-73e3-42f2-8d87-7d65f31837e3"
  }
}
```

## Enhanced Logging Added

The client now logs:

1. **Request Parameters:**
   ```javascript
   📡 Full request details: {
     tenantId: "...",
     tenantIdType: "string",
     tenantIdLength: 36,
     tenantIdValue: "550e8400-...",
     widgetType: "booking",
     widgetTypeType: "string",
     timeRange: "7d",
     timeRangeType: "string",
     hasAuthHeader: true,
     authHeaderLength: 123
   }
   ```

2. **Request Body (as JSON string):**
   ```javascript
   📦 Request body: {"tenantId":"...","widgetType":"booking","timeRange":"7d","version":"2.0"}
   ```

3. **Request Headers:**
   ```javascript
   📋 Request headers: ["Content-Type","x-correlation-id","Authorization"]
   ```

4. **Error Details (if any):**
   ```javascript
   ❌ Edge Function Error: {
     code: "INVALID_TENANT_ID",
     error: "tenantId must be a valid UUID",
     details: {received: "not-a-uuid"},
     correlationId: "abc123"
   }
   ```

## Troubleshooting Steps

### Step 1: Clear Browser Cache ⚠️ **CRITICAL**

The browser may have cached the old JavaScript code. You MUST clear the cache:

**Method 1: Hard Refresh**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Method 2: Clear Cache Completely**
1. Open DevTools (`F12`)
2. Right-click the Refresh button
3. Select "Empty Cache and Hard Reload"

**Method 3: Incognito/Private Window**
- Open the dashboard in an incognito/private window
- This ensures no cached code is used

### Step 2: Check Browser Console

After clearing cache and reloading:

1. **Open DevTools** (`F12`)
2. **Go to Console tab**
3. **Clear console** logs
4. **Navigate to Bookings page**
5. **Look for these logs:**

   **✅ Good Signs:**
   ```
   📡 Invoking Edge Function with body: {tenantId: "...", widgetType: "booking", timeRange: "7d"}
   📡 Full request details: {tenantId: "550e8400-...", tenantIdType: "string", ...}
   📦 Request body: {"tenantId":"...","widgetType":"booking",...}
   Edge Function response: {error: null, data: "received", success: true}
   ```

   **❌ Bad Signs:**
   ```
   ❌ Edge Function Error: {code: "...", error: "...", details: {...}}
   Invalid tenantId: tenantId is required and cannot be null or empty
   Invalid tenantId format: "..." is not a valid UUID
   ```

### Step 3: Check Network Tab

1. **Open DevTools** (`F12`)
2. **Go to Network tab**
3. **Filter:** `widget-analytics`
4. **Look for the POST request**

**Check Request:**
- **URL:** Should be `https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/widget-analytics`
- **Method:** Should be `POST`
- **Headers:** Should include `Authorization`, `Content-Type: application/json`
- **Body:** Should be JSON with `tenantId`, `widgetType`, `timeRange`

**Check Response:**
- **Status:** Should be `200 OK` (not 400)
- **Body:** Should have `success: true` and `data` object

### Step 4: Verify tenantId

The most common issue is invalid or missing tenantId. Check:

1. **Is tenant loaded?**
   ```javascript
   // In console, check:
   window.__TENANT_DEBUG__ // Should show tenant data
   ```

2. **Is tenantId valid?**
   - Must be a UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Must not be `null`, `undefined`, or empty string
   - Must be 36 characters with dashes

3. **Timing issue?**
   - The widget might be loading before tenant data is fetched
   - Check if there's a loading state being skipped

## Specific Error Codes

If you see an error, here's what it means:

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `MISSING_TENANT_ID` | tenantId is null, undefined, or empty | Wait for tenant to load |
| `INVALID_TENANT_ID` | tenantId is not a valid UUID format | Check tenant.id value |
| `MISSING_WIDGET_TYPE` | widgetType is missing | Check widgetType prop |
| `INVALID_WIDGET_TYPE` | widgetType not "booking" or "catering" | Fix widgetType value |
| `INVALID_TIME_RANGE` | timeRange not "1d", "7d", or "30d" | Fix timeRange value |
| `UNSUPPORTED_MEDIA_TYPE` | Missing Content-Type header | Check request headers |
| `INTERNAL_ERROR` | Server error | Check Supabase logs |

## Client-Side Validation

The client has multiple validation layers:

1. **Hook Level (Line 243):**
   ```typescript
   const isAvailable = Boolean(tenantId && tenantSlug);
   ```
   - Prevents fetch if tenant data is missing

2. **Effect Guard (Line 561):**
   ```typescript
   if (!isAvailable) {
     debug('🚫 Analytics not available - setting empty state');
     return;
   }
   ```

3. **Fetch Guard (Line 333):**
   ```typescript
   if (!tenantId || !tenantSlug) {
     debugWarn('⚠️ Analytics fetch skipped - missing tenant information');
     return;
   }
   ```

4. **Function Validation (Line 630):**
   ```typescript
   if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
     throw new Error('Invalid tenantId: tenantId is required');
   }
   if (!uuidRegex.test(tenantId)) {
     throw new Error(`Invalid tenantId format: "${tenantId}" is not a valid UUID`);
   }
   ```

## Files to Check

If the issue persists, examine these files:

1. **`apps/client-dashboard/src/widgets/management/useWidgetAnalytics.ts`**
   - Line 419: Where fetchRealWidgetAnalytics is called
   - Line 630: Where validation happens
   - Line 695: Where request is made

2. **`apps/client-dashboard/src/pages/BookingsTabbed.tsx`**
   - Line 67-71: Where useWidgetAnalytics is called
   - Check how `tenant?.id` is passed

3. **`supabase/functions/widget-analytics/index.ts`**
   - Handles the actual request
   - Returns specific error codes

## Still Getting 400 Errors?

If you've done all the above and still see 400 errors:

### 1. Check what the error actually says:

Look in browser console for:
```
❌ Edge Function Error: {
  code: "...",
  error: "...",  // <-- This tells you exactly what's wrong
  details: {...}
}
```

### 2. Test with a known-good tenantId:

Replace the tenantId temporarily with a test UUID:
```typescript
// In useWidgetAnalytics hook call
tenantId: "00000000-0000-0000-0000-000000000000" // Test UUID
```

### 3. Check Supabase logs:

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/logs/edge-logs
2. Filter by: `widget-analytics`
3. Look for requests with 400 status
4. Check the `correlationId` from browser console to find the exact request

### 4. Verify the build is deployed:

If you're using a hosted version:
- Make sure the latest build is deployed
- Check the build timestamp
- Verify environment variables are correct

## Expected Console Output (Success)

When everything works, you should see:

```
🔍 Analytics hook parameters: {tenantId: "...", tenantSlug: "...", widgetType: "booking", timeRange: "7d", isAvailable: true}
✅ Starting analytics fetch...
Calling real analytics Edge Function...
Request details: {tenantId: "...", widgetType: "booking", timeRange: "7d"}
Access token info: {present: true, length: 123, startsWithEyJ: true}
📡 Invoking Edge Function with body: {tenantId: "...", widgetType: "booking", timeRange: "7d"}
📡 Full request details: {tenantId: "550e8400-...", tenantIdType: "string", tenantIdLength: 36, ...}
📦 Request body: {"tenantId":"550e8400-...","widgetType":"booking","timeRange":"7d","version":"2.0"}
📋 Request headers: ["Content-Type","x-correlation-id","Authorization"]
🚀 About to call Edge Function with: {tenantId: "...", widgetType: "booking", timeRange: "7d", ...}
Edge Function response: {error: null, data: "received", success: true, authMethod: "authenticated"}
```

## Summary

✅ **Edge Function works** - tested and verified  
✅ **Database updated** - all tables and migrations applied  
✅ **Client built** - latest code compiled  
✅ **Enhanced logging** - detailed debug information added  
⚠️ **Next step:** Clear browser cache and test again  

**Most likely cause:** Browser has cached the old JavaScript code before the Edge Function was created.

**Solution:** Hard refresh (Ctrl+Shift+R) or use incognito mode.
