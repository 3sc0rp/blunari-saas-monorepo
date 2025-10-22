# Quick Reference: Tenant Email Update 500 Error

## Problem
500 error when updating tenant email via `manage-tenant-credentials` Edge Function

## Quick Diagnosis

1. **Check Supabase Edge Function Logs**:
   - Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
   - Find correlation ID in browser console
   - Search logs for that correlation ID

2. **Common Causes**:
   - Tenant has no `owner_id` set → Function will auto-create
   - Tenant email is null or empty → Function uses system email
   - Tenant email conflicts with admin user → Function uses system email
   - Owner account doesn't exist in auth.users → Function creates new account

## Quick Fix

### If Email Update Fails in EditableTenantInfo:

The database was updated but auth sync failed. Two options:

**Option 1: Manual Sync via UI**
1. Go to Tenant Detail Page
2. Click "Security" tab
3. Find "Tenant Credentials" section
4. Click "Change Owner Email"
5. Enter the new email
6. Click "Update Email"

**Option 2: Check if Owner Exists**
```sql
-- Run in Supabase SQL Editor
SELECT t.id, t.name, t.email, t.owner_id,
       u.email as auth_email, u.created_at as auth_created
FROM tenants t
LEFT JOIN auth.users u ON u.id = t.owner_id
WHERE t.id = '<your-tenant-id>';
```

If `owner_id` is NULL or `auth_email` is NULL:
- The Edge Function will auto-create a tenant owner account
- Credentials will be returned in the response (save them!)

### If Edge Function Returns 500:

Check browser console for:
```
Error message: <error text>
correlation_id: <uuid>
```

Then check Supabase logs with that correlation ID for the full error.

## Error Messages Decoded

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Tenant has no email configured" | tenant.email is null AND no system email fallback | Update tenant email in database first |
| "Failed to create tenant owner" | Auth user creation failed | Check if email already exists, use unique email |
| "owner_id points to non-existent user" | Database has stale owner_id | Edge Function will auto-fix by creating new owner |
| "Tenant is incorrectly linked to admin user" | owner_id points to an admin | **CRITICAL**: Contact support, manual fix needed |
| "Cannot modify admin user via tenant management" | Attempting to change admin credentials | **CRITICAL**: Owner needs separate account |

## Prevention

✅ Always ensure tenant has a valid email before updating owner credentials
✅ Use the "Password Setup Email" button instead of manually updating emails
✅ Check tenant.owner_id is set correctly during tenant creation
✅ Never share owner_id between admin and tenant accounts

## Related Docs
- `FIX_TENANT_EMAIL_UPDATE_500_ERROR.md` - Full fix details
- `ADMIN_TENANT_SEPARATION_COMPLETE.md` - Architecture
- `DEBUGGING_500_ERROR.md` - General 500 error debugging
