# Widget Analytics CORS Header Fix

## Issue
**Error:** `Access to fetch at 'https://.../functions/v1/widget-analytics' from origin 'https://app.blunari.ai' has been blocked by CORS policy: Request header field x-widget-version is not allowed by Access-Control-Allow-Headers in preflight response.`

## Root Cause
The `useWidgetAnalytics` hook was sending a custom HTTP header `x-widget-version: 2.0` when calling the Edge Function. This triggered a CORS preflight request (OPTIONS), but the Edge Function didn't include this header in its `Access-Control-Allow-Headers` response.

### Why This Happens
1. Browser sees a custom header (`x-widget-version`)
2. Browser sends preflight OPTIONS request to check if it's allowed
3. Edge Function CORS config doesn't list `x-widget-version`
4. Browser blocks the actual request

### CORS Simple vs. Preflighted Requests
**Simple requests** (no preflight needed):
- Headers: `Accept`, `Content-Type` (for specific values), `Content-Language`
- Methods: `GET`, `HEAD`, `POST`

**Preflighted requests** (OPTIONS preflight required):
- Any custom header (like `x-widget-version`)
- Methods: `PUT`, `DELETE`, `PATCH`
- `Content-Type` with values other than form/text

## Solution Implemented

**Removed the problematic custom header** since:
1. The version information is already included in the request body
2. Custom headers require additional CORS configuration
3. The header wasn't critical for functionality

### Changes Made

#### Before:
```typescript
const requestHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-correlation-id': correlationId || '',
  'x-widget-version': '2.0'  // ❌ Custom header causing CORS issues
};
```

#### After:
```typescript
const requestHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-correlation-id': correlationId || ''
  // Note: x-widget-version removed to avoid CORS preflight issues
  // Version is included in the request body instead
};
```

### Why This Works
- `Content-Type: application/json` is a standard header
- `x-correlation-id` is typically allowed by Supabase Edge Functions by default
- Version info is still sent in the request body: `{ version: '2.0' }`
- No preflight request needed for these headers

## Alternative Solutions (Not Implemented)

### Option 1: Configure Edge Function CORS
Create the `widget-analytics` Edge Function with proper CORS headers:

```typescript
// In widget-analytics/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type, x-correlation-id, x-widget-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle OPTIONS preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Add CORS headers to response
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

**Why not chosen:** The Edge Function doesn't exist yet, and removing the header is simpler.

### Option 2: Use Query Parameters
Pass version as URL parameter instead of header:

```typescript
const response = await supabase.functions.invoke(
  'widget-analytics?version=2.0',
  { body, headers }
);
```

**Why not chosen:** Less clean API design, and body parameter works fine.

## Files Modified

1. **useWidgetAnalytics.ts**
   - Removed `x-widget-version` from initial request headers (line ~656)
   - Removed `x-widget-version` from retry request headers (line ~727)
   - Added explanatory comments

## Testing

### Verify Fix
1. Open DevTools → Network tab
2. Navigate to Bookings → Analytics tab
3. Look for `widget-analytics` request
4. Should see:
   - ✅ No OPTIONS preflight request (or if there is one, it succeeds)
   - ✅ POST request succeeds
   - ✅ No CORS errors in console

### Expected Behavior
**Before Fix:**
```
❌ OPTIONS request fails with CORS error
❌ POST request blocked by browser
❌ "x-widget-version is not allowed" error
```

**After Fix:**
```
✅ No preflight request (or it succeeds)
✅ POST request completes
✅ No CORS errors
```

## Technical Background

### CORS Headers Explained

**Access-Control-Allow-Origin:**
- Specifies which origins can access the resource
- `*` = any origin, or specific like `https://app.blunari.ai`

**Access-Control-Allow-Headers:**
- Lists headers that client can send
- Must include any custom headers
- Standard headers like `Content-Type` are usually allowed

**Access-Control-Allow-Methods:**
- Lists HTTP methods allowed
- GET, POST, PUT, DELETE, etc.

### Preflight Request Flow

```
1. Browser detects custom header
   ↓
2. Sends OPTIONS request to server
   ↓
3. Server responds with allowed headers/methods
   ↓
4. If custom header is allowed → Proceed
   If not → Block request
```

## Best Practices

### When to Use Custom Headers
✅ **Use when:**
- Truly necessary for authentication/authorization
- You control both client and server
- Edge Function CORS is properly configured

❌ **Avoid when:**
- Can use request body instead
- Don't control server configuration
- Adds complexity without benefit

### Header Naming
If you must use custom headers:
- Use `X-` prefix for custom headers (convention)
- Keep names lowercase with hyphens
- Example: `x-tenant-id`, `x-api-version`

## Related Issues

This same CORS issue can occur with:
- `x-tenant-id`
- `x-api-key`
- `x-custom-auth`
- Any `X-*` header

**General fix:** Either configure CORS properly or move data to request body/URL params.

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN: Preflight Requests](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [Supabase Edge Functions CORS](https://supabase.com/docs/guides/functions/cors)

## Date
October 11, 2025

## Status
✅ Fixed - Custom header removed, version info moved to request body
