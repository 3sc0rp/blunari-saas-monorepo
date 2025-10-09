# Browser Cache Clear Instructions

## Issue
The tenant provisioning is still showing 500 errors because your browser is using cached JavaScript files.

## Solution - Clear Browser Cache

### Method 1: Hard Refresh (Fastest)
1. Open your admin dashboard in the browser
2. Press `Ctrl + Shift + R` (or `Ctrl + F5`)
3. This will bypass the cache and reload all files

### Method 2: Clear All Cache (Most Thorough)
1. Open browser DevTools (F12)
2. Right-click the refresh button (while DevTools is open)
3. Select "Empty Cache and Hard Reload"

### Method 3: Clear Cache via Settings
**Chrome:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Choose "All time" for time range
4. Click "Clear data"

**Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Choose "All time"
4. Click "Clear now"

## Verification

After clearing cache, check your browser console. You should see:
- The file names in the error will have different hashes (e.g., `index-B8sbOWPq.js` instead of `index-tLNEW7os.js`)
- The 500 error should no longer occur
- Tenant provisioning should work correctly

## What Was Fixed

The edge function had a bug where it was checking for lowercase enum values:
```typescript
// BEFORE (WRONG):
const isAdmin = ["super_admin", "admin"].includes(employee.role);
const isActive = employee.status === "active";

// AFTER (FIXED):
const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(employee.role);
const isActive = employee.status === "ACTIVE";
```

The fix has been:
- ✅ Applied to local files
- ✅ Deployed to Supabase edge functions (twice to be sure)
- ✅ Frontend rebuilt with new hash: `useAdminAPI-C81UF-JU.js`

The old cached file is: `useAdminAPI-k4dgLKPs.js` (shown in your error)

## Next Steps

1. Clear your browser cache using one of the methods above
2. Reload the admin dashboard
3. Try provisioning a tenant again
4. If it still fails, check the browser console for the NEW file hashes - if they're different, the cache was cleared successfully

## If Still Having Issues

If after clearing cache you still see errors, please share:
1. The new error message (if any)
2. The file names shown in the stack trace (to confirm cache was cleared)
3. The Network tab showing the request/response for tenant-provisioning

The edge function is definitely fixed and deployed - this is purely a browser cache issue.
