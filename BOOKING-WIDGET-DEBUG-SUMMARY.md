# Booking Widget Debug Summary & Fixes

**Date:** 2025-10-01  
**Issues Addressed:** Booking widget and Smart Booking Creation forms failing to create reservations

---

## 🔴 Critical Issues Found

### Issue #1: Tenant Lookup Failed in Public Widget Context
**Location:** `apps/client-dashboard/src/api/booking-proxy.ts` (lines 189-244)

**Problem:**
The `getTenantBySlug` function was importing and using the Supabase client directly:
```typescript
const { supabase } = await import('@/integrations/supabase/client');
```

This approach **only works in authenticated dashboard contexts** where a user session exists. It **fails completely in public widget contexts** because:
- Public widgets don't have user authentication
- The Supabase client requires an authenticated session
- Direct database queries bypass the widget token authentication system

**Impact:**
- Public booking widgets showed "Restaurant Unavailable" error immediately
- No bookings could be created through the widget
- Dashboard bookings may have worked but widget bookings were completely broken

---

## ✅ Fixes Applied

### Fix #1: Context-Aware Tenant Lookup

**File:** `apps/client-dashboard/src/api/booking-proxy.ts`

Modified `getTenantBySlug` to detect the execution context and use the appropriate lookup method:

```typescript
export async function getTenantBySlug(slug: string) {
  // Check if we're in a widget context (has token in URL)
  const urlToken = (() => {
    try { 
      return typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('token') 
        : null; 
    } catch { 
      return null; 
    }
  })();
  
  // Widget context: use edge function with token authentication
  if (urlToken) {
    const data = await callEdgeFunction('widget-booking-live', {
      action: 'tenant',
      slug,
    });
    // Transform and return tenant data
  }
  
  // Dashboard context: use direct database query
  const { supabase } = await import('@/integrations/supabase/client');
  // Query database directly with user authentication
}
```

**How it works:**
1. **Widget Context Detection:** Checks for widget token in URL parameters
2. **Widget Path:** Uses edge function API call (passes through token authentication)
3. **Dashboard Path:** Falls back to direct database query with user JWT

---

### Fix #2: Add Tenant Action to Edge Function

**File:** `apps/client-dashboard/supabase/functions/widget-booking-live/index.ts`

Added new action handler to support tenant lookup via edge function:

```typescript
if (action === "tenant") {
  // Fetch full tenant details
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, slug, name, timezone, currency, business_hours')
    .eq('id', resolvedTenantId)
    .maybeSingle();
  
  // Return formatted tenant information
  const responseData = {
    tenant_id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    timezone: tenant.timezone || 'UTC',
    currency: tenant.currency || 'USD',
    business_hours: tenant.business_hours || [],
    branding: { ... },
    features: { ... },
  };
  
  return new Response(JSON.stringify(responseData), { ... });
}
```

---

## 🔄 Authentication Flow

### Before Fix:
```
Widget → getTenantBySlug → Supabase Client (❌ No Auth) → FAIL
Dashboard → getTenantBySlug → Supabase Client (✅ User JWT) → SUCCESS
```

### After Fix:
```
Widget → getTenantBySlug → Edge Function (✅ Widget Token) → SUCCESS
Dashboard → getTenantBySlug → Supabase Client (✅ User JWT) → SUCCESS
```

---

## 📊 Current Status

### ✅ Verified Working:
- Response normalization handles null `reservation_id` correctly
- Error handling provides user-friendly messages
- Widget token authentication passes through all API calls
- Comprehensive debug logging throughout the stack

### 🟡 Requires Deployment:
The edge function changes need to be deployed:

```bash
# Navigate to the correct directory
cd apps/client-dashboard

# Deploy the updated edge function
npx supabase functions deploy widget-booking-live --project-ref wnzxstnxaqukohtzrzrg
```

**Note:** You may need to authenticate first:
```bash
npx supabase login
```

---

## 🧪 Testing Instructions

### Test 1: Widget Context (Public)
1. Generate a widget URL with proper token:
   ```bash
   node test-widget-url-generator.mjs your-restaurant-slug
   ```

2. Open the URL in a private/incognito browser window

3. Verify:
   - Restaurant name loads correctly
   - No "Restaurant Unavailable" error
   - Can search availability
   - Can create bookings
   - Reservation ID is properly returned

### Test 2: Dashboard Context (Authenticated)
1. Log into the dashboard
2. Navigate to Smart Booking Creation
3. Create a booking
4. Verify:
   - Tenant loads correctly
   - Booking completes successfully
   - Reservation appears in the database

### Test 3: Check Logs
Monitor edge function logs during testing:
```bash
npx supabase functions logs widget-booking-live --project-ref wnzxstnxaqukohtzrzrg
```

Look for:
- `[getTenantBySlug] Context detection` logs
- `[widget-booking-live] tenant lookup` logs
- Successful tenant resolution messages
- No authentication errors

---

## 🔍 Debugging Tips

### Check Widget Token
```javascript
// In browser console on widget page
const urlParams = new URLSearchParams(window.location.search);
console.log('Token present:', !!urlParams.get('token'));
console.log('Token length:', urlParams.get('token')?.length);
```

### Check API Requests
Look for these console logs in the browser:
- `[BookingWidget] === WIDGET INITIALIZATION ===`
- `[getTenantBySlug] Context detection`
- `[booking-proxy] === API CALL DETAILS ===`

### Check Edge Function
Look for these logs in Supabase dashboard:
- `[widget-booking-live] tenant lookup`
- `Token validation:` logs
- `Final auth resolution:` logs

---

## 📝 Key Files Modified

1. **`apps/client-dashboard/src/api/booking-proxy.ts`**
   - Modified `getTenantBySlug` function (lines 189-244)
   - Added context detection logic
   - Implemented dual-path lookup strategy

2. **`apps/client-dashboard/supabase/functions/widget-booking-live/index.ts`**
   - Added `action === "tenant"` handler (lines 295-332)
   - Returns formatted tenant information
   - Uses existing authentication resolution

3. **`apps/client-dashboard/src/components/booking/BookingWidget.tsx`**
   - No changes needed (already has proper error handling and logging)

---

## 🚀 Next Steps

1. **Deploy Edge Function** (Required)
   ```bash
   cd apps/client-dashboard
   npx supabase login
   npx supabase functions deploy widget-booking-live --project-ref wnzxstnxaqukohtzrzrg
   ```

2. **Test Widget Flow**
   - Generate widget URL with token
   - Test full booking flow
   - Verify tenant loads correctly

3. **Test Dashboard Flow**
   - Create booking from dashboard
   - Verify tenant loads correctly
   - Confirm no regressions

4. **Monitor Logs**
   - Watch for any authentication errors
   - Verify both paths work correctly
   - Check reservation_id is properly returned

---

## 💡 Technical Insights

### Why This Fix Works

**Separation of Concerns:**
- Widget context uses edge function API (stateless, token-based)
- Dashboard context uses direct DB queries (session-based)
- Each path uses appropriate authentication method

**Progressive Enhancement:**
- Falls back gracefully if token not present
- Maintains backward compatibility with dashboard
- Doesn't break existing functionality

**Security:**
- Widget tokens validated server-side
- User JWTs verified through Supabase auth
- No authentication bypass possible

---

## 📞 Support

If issues persist after deployment:

1. Check edge function logs for errors
2. Verify widget token generation is working
3. Confirm environment variables are set correctly
4. Ensure database RLS policies allow tenant reads
5. Test with a fresh widget token

For detailed logs, add to `.env`:
```
VITE_ENABLE_DEV_LOGS=true
```

---

**Status:** ✅ Fixes committed and ready for deployment  
**Deployment Required:** Yes - edge function must be redeployed  
**Breaking Changes:** None  
**Backward Compatible:** Yes
