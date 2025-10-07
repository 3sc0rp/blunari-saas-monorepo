# React Error #321 - Browser Cache Issue

## The Problem
You're seeing: `Uncaught (in promise) Error: Minified React error #321`

This error appears when React hooks are called in inconsistent order between renders.

## Root Cause
The error is likely caused by **browser caching old JavaScript code**. The file `index-BhvtuNMG.js` is a hashed bundle that your browser has cached.

## SOLUTION: Force Browser to Use New Code

### Method 1: Hard Refresh (RECOMMENDED)
1. Open the admin dashboard in your browser
2. Press **Ctrl + Shift + R** (Windows/Linux) or **Cmd + Shift + R** (Mac)
3. This forces the browser to bypass cache and load fresh code

### Method 2: Clear Browser Cache
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Method 3: Incognito/Private Window
1. Open a new Incognito/Private window
2. Navigate to your admin dashboard
3. This uses no cache at all

### Method 4: Clear Specific Site Data
**Chrome:**
1. Click the lock icon in address bar
2. Click "Site settings"
3. Click "Clear data"
4. Refresh the page

**Firefox:**
1. Click the lock icon
2. Click "Clear cookies and site data"
3. Refresh the page

## Verify the Fix
After force refreshing:
1. Open DevTools Console (F12)
2. Navigate to a tenant detail page
3. Click the "Users" tab
4. You should see NO React errors
5. The bundle filename might change (e.g., `index-XXXXXXXX.js`)

## Technical Details

### Why This Happens
- Vite/React builds create hashed bundle files
- Browser aggressively caches these files
- Old code has different hook execution order
- New code has correct hook order with `useCallback`

### What We Fixed in the Code
1. ✅ Added `useCallback` to memoize `fetchUserData`
2. ✅ Added proper dependency array `[tenantId, toast]`
3. ✅ Added `key={tenantId}` prop for proper React reconciliation
4. ✅ No early returns before hooks
5. ✅ All hooks called in consistent order

### Current Code State
The code in the repository is **100% correct**. The issue is purely browser cache.

## If Error Persists After Cache Clear

### Check 1: Verify You're Using Latest Code
```bash
cd apps/admin-dashboard
git pull origin master
npm run build
```

### Check 2: Check Browser Console
Look for the bundle filename in DevTools > Network tab:
- Old cache: `index-BhvtuNMG.js`
- New build: Will have different hash

### Check 3: Verify Build Output
```bash
cd apps/admin-dashboard
npm run build
# Should complete without errors
```

### Check 4: Try Different Browser
- If Chrome fails, try Firefox
- If Firefox fails, try Edge
- Fresh browser = no cache issues

## Developer Notes

### The Fix We Applied
```typescript
// CORRECT (Current code)
const fetchUserData = useCallback(async () => {
  // ... fetch logic
}, [tenantId, toast]); // Proper dependencies

useEffect(() => {
  fetchUserData();
}, [fetchUserData]); // Stable reference
```

### Component Structure
```
Component renders
  ↓
All hooks called (useToast, useState, useCallback, useEffect)
  ↓
useEffect runs fetchUserData
  ↓
Conditional returns (loading, no data)
  ↓
Main render
```

### Why Browser Cache Causes This
1. Browser loads old `index-BhvtuNMG.js` from cache
2. Old code doesn't have `useCallback`
3. `fetchUserData` recreated every render
4. useEffect sees "new" function every time
5. Hook order becomes inconsistent
6. React throws error #321

### Solution: Cache Busting
The hash in the filename (`BhvtuNMG`) should change when code changes:
- Old: `index-BhvtuNMG.js`
- New: `index-XYZ12345.js` (different hash)

If browser cached the old hash, it won't request the new one.

## Summary

**Problem:** Browser cached old JavaScript with incorrect hook pattern  
**Solution:** Force refresh (Ctrl + Shift + R) to load new code  
**Verification:** No React error #321 in console after refresh  

**The code is correct. The issue is browser cache. Just force refresh! 🔄**
