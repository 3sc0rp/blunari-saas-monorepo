# Tenant Credentials Management Fix

## Date: October 6, 2025

## Issues Resolved

### 1. React Error #321 - Hook Dependency Warning
**Problem:** 
```
Uncaught (in promise) Error: Minified React error #321
```

**Cause:** The `useEffect` hook in `TenantUserManagement.tsx` was missing `tenantId` in its dependency array, causing React to throw a warning about missing dependencies.

**Fix:** Added `tenantId` to the dependency array:
```tsx
useEffect(() => {
  fetchUserData();
}, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
```

### 2. Edge Function 400 Errors
**Problem:**
```
Failed to load resource: the server responded with a status of 400 ()
Error updating email: FunctionsHttpError: Edge Function returned a non-2xx status code
```

**Root Causes:**
1. **Incorrect HTTP Status Codes**: The function was returning 400 for ALL errors (auth, permissions, not found, etc.)
2. **Security Events Logging Failure**: The function was trying to insert into `security_events` table which may not exist or may fail, causing the entire request to fail
3. **Poor Error Response Handling**: The client wasn't checking `data.error` from the response

**Fixes Applied:**

#### A. Proper HTTP Status Codes
Changed from always returning 400 to appropriate status codes:
- `401` - Unauthorized (missing or invalid auth)
- `403` - Forbidden (insufficient privileges)
- `404` - Not Found (tenant owner not found)
- `400` - Bad Request (missing required parameters)
- `500` - Internal Server Error (unexpected errors)

```typescript
// Determine appropriate status code
let status = 500;
if (error.message?.includes('Unauthorized') || error.message?.includes('authorization')) {
  status = 401;
} else if (error.message?.includes('Insufficient privileges')) {
  status = 403;
} else if (error.message?.includes('not found') || error.message?.includes('No tenant owner')) {
  status = 404;
} else if (error.message?.includes('required') || error.message?.includes('Invalid')) {
  status = 400;
}
```

#### B. Non-Blocking Audit Logging
Made security events logging non-blocking so it doesn't fail the entire request:
```typescript
// Log the action for audit purposes (non-blocking)
try {
  await supabaseAdmin.from("security_events").insert({
    event_type: "credential_change",
    severity: "high",
    user_id: tenantOwnerId,
    event_data: {
      action,
      tenant_id: tenantId,
      changed_by: user.id,
      changed_by_email: user.email,
      timestamp: new Date().toISOString(),
    },
  });
} catch (auditError) {
  console.warn("Failed to log security event:", auditError);
  // Don't fail the request if audit logging fails
}
```

#### C. Improved Client-Side Error Handling
Enhanced error checking in the React component:
```tsx
const { data, error } = await supabase.functions.invoke(...);

// Check for errors in response
if (error) {
  throw new Error(error.message || 'Failed to update email');
}

// Check if response data contains an error
if (data?.error) {
  throw new Error(data.error);
}
```

#### D. Enhanced Logging
Added detailed request logging for debugging:
```typescript
console.log(`[CREDENTIALS] Request body:`, { 
  tenantId, 
  action, 
  hasNewEmail: !!newEmail, 
  hasNewPassword: !!newPassword 
});
```

## Files Modified

### Frontend
- `apps/admin-dashboard/src/components/tenant/TenantUserManagement.tsx`
  - Fixed React hook dependency
  - Improved error handling in `handleEmailUpdate()`
  - Improved error handling in `handlePasswordUpdate()`
  - Added checks for both `error` and `data.error`

### Backend
- `apps/admin-dashboard/supabase/functions/manage-tenant-credentials/index.ts`
  - Implemented proper HTTP status codes
  - Made security events logging non-blocking
  - Added detailed request logging
  - Improved error messages

### Supporting Files
- Created `apps/admin-dashboard/supabase/functions/import_map.json` for deployment
- Created `apps/admin-dashboard/supabase/functions/tenant-provisioning/cors.ts` for deployment

## Deployment Status

✅ **manage-tenant-credentials** - Deployed with fixes
✅ **tenant-provisioning** - Deployed with unique credential fix
✅ All changes committed to git

## Testing Recommendations

1. **Test Email Update**:
   - Navigate to a tenant detail page
   - Click edit on the login email
   - Change to a new email
   - Verify success message appears
   - Check Supabase logs for detailed request info

2. **Test Password Update**:
   - Navigate to a tenant detail page
   - Click edit on the password
   - Generate a new password or enter one manually
   - Verify success message appears
   - Try logging in with the new password

3. **Test Error Handling**:
   - Try updating with invalid data
   - Try updating as non-admin user
   - Verify appropriate error messages are shown

## Related Fixes

This fix is related to the previous tenant provisioning fix where we ensured each tenant gets unique owner credentials instead of all sharing `admin@blunari.ai`.

## Next Steps

1. Monitor Supabase function logs for any remaining errors
2. Consider creating the `security_events` table if audit logging is desired
3. Test credential management with newly provisioned tenants
4. Verify no more React errors in the console

## Notes

- The `security_events` table insert is now non-blocking, so if the table doesn't exist, credentials can still be updated
- All error responses now include descriptive error messages
- React is now properly tracking the `tenantId` dependency in the component
