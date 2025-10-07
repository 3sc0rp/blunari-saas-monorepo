# React Error #321 - Final Fix

## Date: October 6, 2025

## Error Details
```
Uncaught (in promise) Error: Minified React error #321
at Object.Ps (index-BrfQdyzg.js:38:16761)
at qt.useEffect (index-BrfQdyzg.js:9:5910)
```

## What is React Error #321?

React Error #321 occurs when **hooks are called in inconsistent order between renders**. This happens when:
1. Hooks are called conditionally
2. Component remounts with different hook execution paths
3. Dependencies in hooks are not properly declared

## Root Cause Analysis

### The Problem
The `TenantUserManagement` component had several issues:

1. **Improper useEffect dependencies**: The `fetchUserData` function was called in `useEffect` but not included in the dependency array
2. **Missing useCallback**: The `fetchUserData` function was recreated on every render, causing unnecessary re-executions
3. **No component key**: When switching between tenants, React wasn't properly resetting the component state
4. **Non-null assertion**: Using `tenantId!` could pass undefined, causing hook execution issues

### Why This Causes Error #321

When `tenantId` changes:
1. React tries to update the existing component instance
2. The `useEffect` runs because `tenantId` changed
3. But `fetchUserData` is not properly memoized, so React sees it as a new function
4. This causes an inconsistent hook call pattern
5. React throws Error #321 because hooks must be called in the same order every render

## The Fix

### 1. Use useCallback for Stable Function Reference
```tsx
// BEFORE (Wrong)
const fetchUserData = async () => {
  // ... function body
};

useEffect(() => {
  fetchUserData();
}, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

// AFTER (Correct)
const fetchUserData = useCallback(async () => {
  // ... function body
}, [tenantId, toast]);

useEffect(() => {
  fetchUserData();
}, [fetchUserData]);
```

**Why this works:**
- `useCallback` memoizes the function with stable identity
- Only recreates when `tenantId` or `toast` changes
- `useEffect` properly tracks the function as a dependency
- No more eslint-disable needed

### 2. Add Component Key for Proper Reconciliation
```tsx
// BEFORE (Wrong)
<TenantUserManagement tenantId={tenantId!} />

// AFTER (Correct)
{tenantId && <TenantUserManagement key={tenantId} tenantId={tenantId} />}
```

**Why this works:**
- `key={tenantId}` tells React to unmount/remount when tenant changes
- Ensures clean state on tenant switch
- Prevents undefined tenantId from being passed
- Guarantees consistent hook execution

### 3. Import useCallback
```tsx
// BEFORE
import { useState, useEffect } from "react";

// AFTER
import { useState, useEffect, useCallback } from "react";
```

## Files Modified

### `apps/admin-dashboard/src/components/tenant/TenantUserManagement.tsx`
- Added `useCallback` import
- Wrapped `fetchUserData` in `useCallback` with `[tenantId, toast]` dependencies
- Updated `useEffect` to depend on `[fetchUserData]`
- Removed eslint-disable comment (no longer needed)

### `apps/admin-dashboard/src/pages/TenantDetailPage.tsx`
- Added `key={tenantId}` prop to ensure proper component lifecycle
- Added null check: `{tenantId && ...}` to prevent undefined issues

## Technical Deep Dive

### React Hook Rules
React requires hooks to be:
1. **Called at the top level** (not inside conditions, loops, or nested functions)
2. **Called in the same order** every render
3. **Have stable identities** when used as dependencies

### Why useCallback is Critical Here

Without `useCallback`:
```tsx
// Every render creates a NEW function
const fetchUserData = async () => { ... };
// useEffect sees a different function reference each time
useEffect(() => {
  fetchUserData(); // Different function = infinite loop potential
}, [fetchUserData]); // This dependency would change every render
```

With `useCallback`:
```tsx
// Function is memoized - same reference unless dependencies change
const fetchUserData = useCallback(async () => { ... }, [tenantId, toast]);
// useEffect only runs when fetchUserData reference actually changes
useEffect(() => {
  fetchUserData(); // Same function reference
}, [fetchUserData]); // Only changes when tenantId or toast changes
```

### Why Key Prop Matters

When navigating between tenants:

**Without key:**
```
Tenant A (id: 123) → Component Instance #1 (tries to update)
Tenant B (id: 456) → Component Instance #1 (reuses same instance)
                     → Hook order might differ due to async state
                     → ERROR #321
```

**With key:**
```
Tenant A (id: 123) → Component Instance #1 (key="123")
Tenant B (id: 456) → Component Instance #2 (key="456", NEW instance)
                     → Clean slate, fresh hooks
                     → No error
```

## Testing

### Before Fix
1. ✗ Navigate to tenant detail page
2. ✗ Switch to "Users" tab
3. ✗ React Error #321 appears in console
4. ✗ Component might not update properly

### After Fix
1. ✓ Navigate to tenant detail page
2. ✓ Switch to "Users" tab
3. ✓ No console errors
4. ✓ Component loads correctly
5. ✓ Switching between tenants works smoothly

### Test Scenarios
- [x] Initial page load
- [x] Tab switching
- [x] Navigating between different tenants
- [x] Browser refresh on tenant page
- [x] No React errors in production build

## Related Documentation

- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [useCallback Hook](https://react.dev/reference/react/useCallback)
- [React Error Decoder #321](https://reactjs.org/docs/error-decoder.html?invariant=321)

## Deployment Status

✅ Changes committed to git
✅ Changes pushed to GitHub
✅ Ready for production deployment

## Lessons Learned

1. **Always include function dependencies**: If a function is used in useEffect, either include it in dependencies or memoize it with useCallback
2. **Use key props for list-like navigation**: When components show data for different entities (tenants, users, etc.), use keys
3. **Don't ignore eslint warnings**: The `eslint-disable-line` was hiding the real issue
4. **Understand hook lifecycle**: Hooks must have consistent execution order between renders

## Next Steps

1. Monitor production for any remaining React errors
2. Consider applying the same pattern to other detail pages (users, orders, etc.)
3. Add ESLint rules to catch missing useCallback usage
4. Document hook patterns in team coding standards

---

**Summary:** React Error #321 was caused by improper hook dependency management. Fixed by using `useCallback` to memoize `fetchUserData` and adding a `key` prop to ensure proper component lifecycle when switching between tenants.
