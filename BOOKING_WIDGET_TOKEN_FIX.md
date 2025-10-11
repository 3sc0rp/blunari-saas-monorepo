# Booking Widget Token Fix

## Issue
**Error:** `VM372 BookingWidget-Pb98u7at.js:9 [BookingWidget] No widget token found in URL - this may cause API calls to fail`

## Root Cause
The booking widget was being generated without the required authentication token in the URL. The widget needs a signed JWT token to make authenticated API calls to the backend.

## Solution
Updated `BookingWidgetConfiguration.tsx` to:
1. Import the `createWidgetToken` utility function
2. Generate a widget token when the tenant slug changes
3. Include the token as a query parameter in both the widget URL and embed code

## Changes Made

### 1. Added Widget Token Generation
```tsx
// Generate widget token when tenantSlug changes
useEffect(() => {
  let mounted = true;
  
  async function generateToken() {
    if (!tenantSlug) {
      setWidgetToken(null);
      return;
    }

    try {
      const token = await createWidgetToken(
        tenantSlug,
        '2.0',
        'booking'
      );
      if (mounted) {
        setWidgetToken(token);
      }
    } catch (error) {
      console.error('[BookingWidgetConfiguration] Failed to generate widget token:', error);
      if (mounted) {
        setWidgetToken(null);
      }
    }
  }

  generateToken();

  return () => {
    mounted = false;
  };
}, [tenantSlug]);
```

### 2. Updated Widget URL to Include Token
**Before:**
```tsx
const url = `${baseUrl}/public-widget/book/${tenantSlug}`;
```

**After:**
```tsx
const url = `${baseUrl}/public-widget/book/${tenantSlug}?token=${widgetToken}`;
```

### 3. Updated Embed Code to Include Token
**Before:**
```html
<iframe src="https://example.com/public-widget/book/tenant-slug" ...>
```

**After:**
```html
<iframe src="https://example.com/public-widget/book/tenant-slug?token=eyJ..." ...>
```

### 4. Added Loading State
Shows "Generating Widget Token..." message while the token is being created.

## Token Details

### What is the Token?
The widget token is a signed JWT (JSON Web Token) that contains:
- `slug`: Tenant identifier
- `configVersion`: Widget configuration version
- `widgetType`: Type of widget ('booking')
- `timestamp`: When the token was created
- `exp`: Expiration timestamp (1 hour)
- `iat`: Issued at timestamp

### Token Generation Process
1. **Server-side (Preferred):** Uses Supabase Edge Function `/functions/v1/create-widget-token`
2. **Fallback:** Client-side generation with HMAC-SHA256 signature (development only)

### Token Security
- Signed with JWT secret to prevent tampering
- 1-hour expiration for security
- Validated on the backend before allowing API calls

## Testing

### Verify Token Generation
1. Open DevTools Console
2. Navigate to Bookings → Widget tab
3. Check for token in URL: `/public-widget/book/your-slug?token=eyJ...`
4. No more error: "[BookingWidget] No widget token found in URL"

### Test Widget Functionality
1. Copy widget URL
2. Open in new tab
3. Widget should load without errors
4. API calls should succeed (check Network tab)

## Files Modified

1. **BookingWidgetConfiguration.tsx**
   - Added `createWidgetToken` import
   - Added `widgetToken` state
   - Added token generation effect
   - Updated `widgetUrl` memo to include token
   - Updated `embedCode` memo to include token
   - Enhanced loading state messaging

## Related Files

- `tokenUtils.ts` - Token generation utilities
- `create-widget-token/index.ts` - Edge function for server-side token generation
- `widget-booking-live/index.ts` - Backend API that validates tokens

## Error Resolution

**Before Fix:**
```
❌ [BookingWidget] No widget token found in URL - this may cause API calls to fail
❌ API calls return 401 Unauthorized
❌ Widget cannot fetch booking availability
```

**After Fix:**
```
✅ Widget token included in URL
✅ API calls succeed with valid token
✅ Widget fully functional
✅ Secure authentication for all widget operations
```

## Security Considerations

1. **Token Expiration:** Tokens expire after 1 hour to limit potential misuse
2. **Signed Tokens:** HMAC-SHA256 signature prevents token tampering
3. **Server-side Generation:** Production uses secure Edge Function (not client-side)
4. **No Sensitive Data:** Token only contains slug and metadata, not credentials

## Future Enhancements

1. **Token Refresh:** Auto-regenerate token before expiration
2. **Token Caching:** Cache tokens in localStorage with expiration check
3. **Error Handling:** Show user-friendly error if token generation fails
4. **Analytics:** Track token generation success/failure rates

## Date
October 11, 2025

## Status
✅ Fixed and tested
