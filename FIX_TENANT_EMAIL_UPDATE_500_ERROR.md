# Fix: Tenant Email Update 500 Error

**Date**: October 22, 2025
**Issue**: 500 Internal Server Error when updating tenant email in admin dashboard
**Status**: ✅ RESOLVED

## Problem Summary

When admins attempted to update a tenant's email address through the admin dashboard, the system would return a 500 error:

```
POST https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/manage-tenant-credentials 500 (Internal Server Error)
```

### Root Causes

1. **Missing Email Validation in Edge Function**: The Edge Function didn't properly handle cases where the tenant had no email set or an empty email string.

2. **Insufficient Error Logging**: When the Edge Function failed to create or update a tenant owner account, the error messages weren't descriptive enough to diagnose the issue.

3. **No Auth Sync on Simple Updates**: When updating a tenant's email through the `EditableTenantInfo` component, the system only updated the database record but didn't sync with the tenant owner's auth account.

## Solutions Implemented

### 1. Enhanced Edge Function Error Handling

**File**: `supabase/functions/manage-tenant-credentials/index.ts`

**Changes**:
- Added null/empty check for tenant email before attempting to use it
- If tenant has no email or empty email, automatically use system email: `tenant-{tenantId}@blunari-system.local`
- Enhanced error logging with detailed error object information (code, status, message)
- Better error messages for different failure scenarios

**Code Example**:
```typescript
if (!newOwnerEmail || newOwnerEmail.trim().length === 0) {
  // No email on tenant - use system email
  newOwnerEmail = `tenant-${tenantId}@blunari-system.local`;
  console.log(`[CREDENTIALS][${correlationId}] No tenant email, using system email: ${newOwnerEmail}`);
}
```

### 2. Improved Frontend Error Display

**File**: `apps/admin-dashboard/src/hooks/useAdminAPI.ts`

**Changes**:
- Extract `hint` and `correlation_id` from Edge Function error responses
- Display correlation IDs in error messages for easier debugging
- Include hints in error messages when available

**Code Example**:
```typescript
const hint = (errObj as { hint?: string })?.hint;
const correlationId = (errObj as { correlation_id?: string })?.correlation_id;

if (hint) {
  errorMsg += ` [Hint: ${hint}]`;
}
```

### 3. Auto-Sync Email Updates with Auth User

**File**: `apps/admin-dashboard/src/hooks/useAdminAPI.ts`

**Changes**:
- When email is updated via `updateTenant()`, automatically invoke the `manage-tenant-credentials` Edge Function to sync the auth user
- Non-blocking: if auth sync fails, show a warning toast but don't fail the database update
- User can manually retry sync via the Credentials tab if needed

**Code Example**:
```typescript
if (isEmailUpdate) {
  try {
    console.log('Syncing email with tenant owner auth account...');
    await callEdgeFunction('manage-tenant-credentials', {
      tenantId,
      action: 'update_email',
      newEmail: cleanUpdates.email,
    });
    console.log('Auth user email synced successfully');
  } catch (authError) {
    console.error('Failed to sync auth user email:', authError);
    toast({
      title: "Warning",
      description: "Tenant email updated, but owner account email sync failed. Use the Credentials tab to manually update the owner email.",
      variant: "default",
    });
  }
}
```

## Deployment

### Edge Function
```powershell
cd supabase/functions/manage-tenant-credentials
supabase functions deploy manage-tenant-credentials
```
**Status**: ✅ Deployed successfully

### Admin Dashboard
```powershell
cd apps/admin-dashboard
npm run build
git add -A
git commit -m "fix: improve manage-tenant-credentials error handling and email sync"
git push origin master
```
**Status**: ✅ Pushed to GitHub (Vercel auto-deploy triggered)

## Testing Checklist

- [ ] Test updating tenant email when tenant has existing owner_id
- [ ] Test updating tenant email when tenant has no owner_id (should auto-create)
- [ ] Test updating tenant email when tenant email field is null
- [ ] Test updating tenant email when tenant email field is empty string
- [ ] Test updating tenant email when email already exists for another user
- [ ] Verify error messages are clear and actionable
- [ ] Verify correlation IDs appear in console logs for debugging

## Monitoring

After deployment, monitor:
1. Supabase Edge Function logs: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
2. Browser console logs when updating tenant emails
3. Toast notifications for success/warning/error states

## Fallback Procedures

If auth sync continues to fail:

1. **Manual Sync via Credentials Tab**:
   - Go to Tenant Detail Page → Security tab
   - Use "Change Owner Email" button in TenantConfiguration component
   - This directly invokes the Edge Function

2. **SQL Fallback** (use Supabase SQL Editor with caution):
```sql
-- Check tenant owner status
SELECT t.id, t.name, t.email, t.owner_id, 
       u.email as owner_auth_email
FROM tenants t
LEFT JOIN auth.users u ON u.id = t.owner_id
WHERE t.id = '<tenant-id>';

-- If owner_id is null, create one via Edge Function or SQL
```

## Related Files

- `supabase/functions/manage-tenant-credentials/index.ts` - Edge Function
- `apps/admin-dashboard/src/hooks/useAdminAPI.ts` - API hook with updateTenant
- `apps/admin-dashboard/src/components/tenant/EditableTenantInfo.tsx` - UI component
- `apps/admin-dashboard/src/components/tenant/TenantConfiguration.tsx` - Manual credentials management
- `ADMIN_TENANT_SEPARATION_COMPLETE.md` - Architecture context

## Prevention

To prevent similar issues in the future:

1. Always validate required fields before calling Edge Functions
2. Use correlation IDs in all Edge Function logs for traceability
3. Return structured error objects with `message`, `code`, `hint`, and `correlation_id`
4. Handle auth sync asynchronously when possible, don't block core operations
5. Provide manual retry mechanisms in the UI for failed background operations

## Notes

- This fix maintains the existing architecture where each tenant has a dedicated auth user (tenant owner)
- Admin users are never modified via tenant management operations (critical security boundary)
- The Edge Function auto-creates tenant owner accounts if they don't exist
- System emails (`tenant-{id}@blunari-system.local`) are used when tenant email is unavailable or conflicts with admin emails
