# Widget Analytics 400 Bad Request - Fixed

**Date:** October 12, 2025  
**Status:** ✅ **RESOLVED**  
**Commits:** 1bf85e18, 6ba307eb, 3874d5b3

## Problem

The client dashboard was showing a 400 Bad Request error when trying to load widget analytics:

```
POST https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/widget-analytics 400 (Bad Request)
```

## Root Cause

The **`widget-analytics` Edge Function did not exist** in the Supabase project. The client code was attempting to call this endpoint, but it returned a 400 error because the function wasn't deployed.

## Solution

### 1. Created the Edge Function (Commit: 1bf85e18)

Created `supabase/functions/widget-analytics/index.ts` with:

- **Full Request Validation:**
  - Validates `tenantId` (required, must be UUID)
  - Validates `widgetType` ('booking' or 'catering')
  - Validates `timeRange` ('1d', '7d', or '30d')
  - Validates Content-Type header
  
- **Error Handling:**
  - Returns specific error codes: `MISSING_TENANT_ID`, `INVALID_TENANT_ID`, `MISSING_WIDGET_TYPE`, `INVALID_WIDGET_TYPE`, `INVALID_TIME_RANGE`, etc.
  - Includes `correlationId` in all responses for debugging
  - Logs errors with full context

- **Analytics Data Generation:**
  - Queries `widget_events` table for views, clicks, session data
  - Queries `bookings` or `catering_orders` for conversion metrics
  - Calculates: totalViews, totalClicks, conversionRate, avgSessionDuration, completionRate
  - Widget-specific: avgPartySize (booking), avgOrderValue (catering)
  - Generates daily stats for time range
  - Identifies peak hours and top traffic sources

- **CORS Support:**
  - Handles OPTIONS preflight requests
  - Returns proper CORS headers for cross-origin requests
  - Created `_shared/cors.ts` utility

- **Anonymous Access:**
  - Config file (`config.toml`) sets `verify_jwt = false`
  - Supports both authenticated and anonymous requests
  - Logs auth method in response metadata

### 2. Created Database Tables (Migration: 20251012000000)

**`widget_analytics_logs` table:**
- Tracks all analytics API requests
- Fields: correlation_id, tenant_id, widget_type, time_range, auth_method, duration_ms, success, error_code, request_origin, ip_address
- RLS policies: Service role full access, tenant admins can view their logs

**`widget_events` table:**
- Tracks widget interactions (views, clicks, submissions)
- Fields: tenant_id, widget_type, event_type, session_id, session_duration, source, metadata
- RLS policies: Service role full access, anyone can insert (for tracking), tenant admins can view

**Indexes:**
- tenant_id, widget_type, event_type, created_at, session_id
- Optimized for analytics queries

### 3. Enhanced Error Logging (Commit: 6ba307eb)

Updated `useWidgetAnalytics.ts` to:

- Parse Edge Function error response body
- Log structured error details: code, error message, details, correlationId
- Show full request parameters: tenantId (with type), widgetType, timeRange
- Display auth header presence and length

### 4. Added Client-Side Validation (Commit: 3874d5b3)

Added validation in `fetchRealWidgetAnalytics()`:

- Check tenantId is not null or empty
- Validate tenantId matches UUID format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`)
- Throw descriptive errors before making API call
- Prevents invalid requests from reaching Edge Function

## Deployment

1. ✅ Edge Function deployed: `supabase functions deploy widget-analytics`
2. ✅ Database migration applied: `supabase db push`
3. ✅ Changes committed and pushed to GitHub

## Testing the Fix

### Expected Behavior:

1. **Valid Request:**
   ```bash
   POST /functions/v1/widget-analytics
   Body: {"tenantId":"valid-uuid","widgetType":"booking","timeRange":"7d"}
   Headers: {"Authorization":"Bearer <token>","Content-Type":"application/json"}
   
   Response 200:
   {
     "success": true,
     "data": { /* analytics data */ },
     "meta": {
       "tenantId": "...",
       "widgetType": "booking",
       "timeRange": "7d",
       "authMethod": "authenticated",
       "generatedAt": "2025-10-12T...",
       "durationMs": 142,
       "version": "2025-09-13.4",
       "correlationId": "..."
     }
   }
   ```

2. **Invalid tenantId:**
   ```bash
   Response 400:
   {
     "success": false,
     "code": "MISSING_TENANT_ID" | "INVALID_TENANT_ID",
     "error": "Missing or invalid required parameter: tenantId",
     "details": {"received":"...","type":"..."},
     "correlationId": "..."
   }
   ```

3. **Client-side validates before calling:**
   - If `tenantId` is null/empty → Error thrown before API call
   - If `tenantId` is not UUID → Error thrown before API call
   - Prevents unnecessary 400 errors

### Browser Console Logs:

You should now see detailed logs:

```
📡 Invoking Edge Function with body: {tenantId: "...", widgetType: "booking", timeRange: "7d"}
📡 Full request details: {
  tenantId: "550e8400-...",
  tenantIdType: "string",
  tenantIdLength: 36,
  tenantIdValue: "550e8400-...",
  widgetType: "booking",
  ...
}
```

If an error occurs, you'll see:

```
❌ Edge Function Error: {
  code: "INVALID_TENANT_ID",
  error: "tenantId must be a valid UUID",
  details: {received: "not-a-uuid"},
  correlationId: "abc123"
}
```

## Verification Steps

1. **Clear browser cache** and reload the client dashboard
2. **Navigate to Bookings page** (where widget analytics are used)
3. **Check browser console** for:
   - No 400 errors from widget-analytics endpoint
   - Successful analytics data loading
   - Detailed request/response logs

4. **Check Supabase Dashboard:**
   - Functions → widget-analytics (should be listed)
   - Database → widget_analytics_logs table (check for logged requests)
   - Database → widget_events table (ready for tracking)

## Files Modified

```
supabase/functions/widget-analytics/index.ts         (NEW - 460 lines)
supabase/functions/widget-analytics/config.toml      (NEW)
supabase/functions/_shared/cors.ts                   (NEW)
supabase/migrations/20251012000000_add_widget_analytics_tables.sql (NEW)
apps/client-dashboard/src/widgets/management/useWidgetAnalytics.ts (UPDATED)
```

## Next Steps

If you still see 400 errors:

1. **Check browser console** for the new detailed error logs - they will show exactly what's wrong
2. **Verify tenantId** - make sure it's a valid UUID
3. **Check network tab** - look at the request/response details
4. **Use correlationId** - search logs with correlation ID for full trace

## Related Documentation

- Edge Function: `docs/widget-analytics.md`
- Widget Analytics Types: `apps/client-dashboard/src/widgets/management/analytics/types.ts`
- Analytics Hook: `apps/client-dashboard/src/widgets/management/useWidgetAnalytics.ts`
