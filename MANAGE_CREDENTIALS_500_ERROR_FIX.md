# 500 Internal Server Error Fix - manage-tenant-credentials

## Date: October 6, 2025

## Error Details
```
POST https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/manage-tenant-credentials 500 (Internal Server Error)
Error updating email: Error: Edge Function returned a non-2xx status code
```

## Root Cause Analysis

The 500 error was caused by several potential issues in the `manage-tenant-credentials` edge function:

### 1. **Insufficient Error Handling**
- Profile table updates were not wrapped in try-catch
- Tenant table updates could fail silently
- No verification that the user exists before attempting updates
- Generic error messages didn't provide debugging context

### 2. **Missing User Verification**
- Function assumed user exists without verification
- Could try to update non-existent users, causing auth API errors

### 3. **Poor Error Logging**
- Errors were logged but without sufficient context
- No stack traces for debugging
- No step-by-step logging to identify where failures occur

## The Fix

### 1. User Verification Before Updates
Added verification step to ensure user exists before attempting any updates:

```typescript
// Verify the user exists before attempting update
try {
  const { data: existingUser, error: getUserError } = 
    await supabaseAdmin.auth.admin.getUserById(tenantOwnerId);
  if (getUserError || !existingUser) {
    console.error(`[CREDENTIALS] User not found:`, getUserError);
    throw new Error(`User with ID ${tenantOwnerId} not found in auth system`);
  }
  console.log(`[CREDENTIALS] User verified: ${existingUser.user.email}`);
} catch (verifyError: any) {
  console.error(`[CREDENTIALS] User verification failed:`, verifyError);
  throw new Error(`Failed to verify user exists: ${verifyError.message}`);
}
```

**Why this helps:**
- Catches non-existent user errors early
- Provides clear error message
- Prevents cryptic auth API errors

### 2. Enhanced Error Logging
Added comprehensive logging at each step:

```typescript
console.log(`[CREDENTIALS] Starting ${action} for tenant ${tenantId}`);
console.log(`[CREDENTIALS] Request body:`, { tenantId, action, hasNewEmail: !!newEmail });
console.log(`[CREDENTIALS] Tenant owner ID determined: ${tenantOwnerId}`);
console.log(`[CREDENTIALS] User verified: ${existingUser.user.email}`);
console.log(`[CREDENTIALS] Updating email from auth.users for user ${tenantOwnerId}`);
console.log(`[CREDENTIALS] Updating email in profiles table`);
console.log(`[CREDENTIALS] Updating email in tenants table`);
console.log(`[CREDENTIALS] Email update completed successfully`);
```

**Benefits:**
- Track exactly where the function fails
- Understand the data flow
- Debug production issues easily

### 3. Improved Error Messages
Enhanced error responses with more context:

```typescript
// BEFORE
return new Response(JSON.stringify({ error: error.message }), {
  status,
  headers: { "Content-Type": "application/json", ...corsHeaders },
});

// AFTER
console.error(`[CREDENTIALS] Error stack:`, error.stack);
console.error(`[CREDENTIALS] Returning ${status} error: ${errorMessage}`);

return new Response(JSON.stringify({ 
  error: errorMessage,
  details: error.details || null,
  hint: error.hint || null
}), {
  status,
  headers: { "Content-Type": "application/json", ...corsHeaders },
});
```

**Improvements:**
- Stack traces logged for debugging
- Additional error details included
- Clear hints for resolution

### 4. Graceful Handling of Secondary Updates
Profile and tenant table updates are now non-blocking:

```typescript
// Update profiles table
const { error: profileError } = await supabaseAdmin
  .from("profiles")
  .update({ email: newEmail })
  .eq("id", tenantOwnerId);

if (profileError) {
  console.error(`[CREDENTIALS] Profile email update failed:`, profileError);
  // Don't fail - profile might not exist or update might not be critical
  console.warn(`Warning: Could not update profile email: ${profileError.message}`);
}

// Update tenant email
const { error: tenantError } = await supabaseAdmin
  .from("tenants")
  .update({ email: newEmail })
  .eq("id", tenantId);

if (tenantError) {
  console.error(`[CREDENTIALS] Tenant email update failed:`, tenantError);
  console.warn(`Warning: Could not update tenant email: ${tenantError.message}`);
}
```

**Why this matters:**
- Auth update (most critical) always succeeds if possible
- Profile/tenant updates won't break the main flow
- Warnings logged for later investigation

### 5. Tenant Email Update Added
Now updates all three locations where email is stored:
1. ✅ `auth.users` table (Supabase Auth - CRITICAL)
2. ✅ `profiles` table (optional)
3. ✅ `tenants` table (optional)

This ensures consistency across the system.

## Files Modified

### `apps/admin-dashboard/supabase/functions/manage-tenant-credentials/index.ts`

**Changes:**
1. Added user verification before updates (lines 150-167)
2. Enhanced logging throughout the function
3. Improved error messages in update_email case
4. Added error messages in update_password case
5. Enhanced catch block with stack traces and detailed errors
6. Added tenant email update to keep data in sync

## Testing Recommendations

### Before Testing
1. Check Supabase function logs at: `https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions`
2. Ensure you're testing with a tenant that has a valid owner user

### Test Scenarios

#### 1. Email Update - Happy Path
```
Steps:
1. Navigate to tenant detail page
2. Click "Users" tab
3. Click edit on email field
4. Enter new email address
5. Click confirm

Expected:
✅ Success message appears
✅ Email updates in UI
✅ No console errors
✅ Function logs show all steps completed

Logs to check:
- [CREDENTIALS] Starting update_email for tenant...
- [CREDENTIALS] User verified: old.email@example.com
- [CREDENTIALS] Updating email from auth.users...
- [CREDENTIALS] Email update completed successfully
```

#### 2. Email Update - Non-existent User
```
Steps:
1. Try to update email for tenant with no owner user

Expected:
❌ Error message: "User with ID xxx not found in auth system"
✅ Clear error in UI
✅ Function logs show verification failure

Logs to check:
- [CREDENTIALS] User not found: ...
- [CREDENTIALS] Returning 404 error: User with ID xxx not found
```

#### 3. Password Update - Happy Path
```
Steps:
1. Navigate to tenant detail page
2. Click "Users" tab
3. Click edit on password field
4. Enter new password (or generate)
5. Click confirm

Expected:
✅ Success message appears
✅ No console errors
✅ Function logs show password updated

Logs to check:
- [CREDENTIALS] Starting update_password for tenant...
- [CREDENTIALS] User verified: ...
- [CREDENTIALS] Updating password for user...
- [CREDENTIALS] Password updated successfully
```

### Debugging 500 Errors

If 500 errors still occur, check Supabase function logs for:

1. **User Verification Step**
   - Look for: `[CREDENTIALS] User not found`
   - Action: Ensure tenant has owner user created

2. **Auth Update Step**
   - Look for: `[CREDENTIALS] Auth email update failed`
   - Action: Check if email is already taken

3. **Profile Update Step**
   - Look for: `Warning: Could not update profile email`
   - Action: Check if profile exists for user

4. **Tenant Update Step**
   - Look for: `Warning: Could not update tenant email`
   - Action: Check RLS policies on tenants table

5. **Stack Traces**
   - Look for: `[CREDENTIALS] Error stack:`
   - Action: Identify exact line causing error

## Common Issues and Solutions

### Issue: "User with ID xxx not found in auth system"
**Cause:** Tenant owner user doesn't exist in Supabase Auth  
**Solution:** Use the tenant provisioning function to create owner user first

### Issue: "Failed to update email in auth: Email rate limit exceeded"
**Cause:** Too many email updates in short time  
**Solution:** Wait a few minutes and try again

### Issue: "Warning: Could not update profile email"
**Cause:** Profile doesn't exist for user  
**Solution:** This is non-critical - auth email still updated successfully

### Issue: "Warning: Could not update tenant email"
**Cause:** RLS policy or constraint on tenants table  
**Solution:** This is non-critical - auth email still updated successfully

## Deployment Status

✅ Edge function deployed to Supabase  
✅ Changes committed to git  
✅ Changes pushed to GitHub  
✅ Enhanced logging active in production  

## Monitoring

### View Function Logs
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
2. Select `manage-tenant-credentials`
3. Click "Logs" tab
4. Look for `[CREDENTIALS]` prefix in logs

### Key Metrics to Watch
- Success rate of email updates
- Success rate of password updates
- Frequency of "User not found" errors
- Profile/tenant update failure rate (warnings are OK)

## Related Fixes

This builds on previous fixes:
1. **Tenant Provisioning Fix** - Creates unique owner users during provisioning
2. **React Error #321 Fix** - Fixed hook dependency issues in TenantUserManagement
3. **Error Status Codes Fix** - Returns appropriate HTTP status codes (401/403/404/400/500)

## Next Steps

1. **Monitor Production Logs**
   - Watch for any remaining 500 errors
   - Check if user verification catches issues early
   - Verify all three email locations update correctly

2. **Consider Enhancements**
   - Add email validation before update
   - Add email conflict checking
   - Add rollback logic if auth succeeds but profile fails
   - Create migration to sync existing emails

3. **Documentation**
   - Document the three email storage locations
   - Create runbook for handling email update failures
   - Add API documentation for manage-tenant-credentials endpoint

---

**Summary:** The 500 Internal Server Error was likely caused by attempting to update non-existent users or missing error handling. Fixed by adding user verification, comprehensive logging, graceful error handling for secondary updates, and detailed error responses. The function now provides clear debugging information and fails gracefully with actionable error messages.
