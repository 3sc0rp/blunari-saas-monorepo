# 500 Error Troubleshooting - Quick Guide

## ✅ What I Just Did:

1. **Redeployed** `manage-tenant-credentials` function with latest code
2. Created diagnostic scripts to check database state

## 🔍 Next Steps to Debug:

### Step 1: Run Quick Diagnostic in Supabase
**File:** `QUICK_DIAGNOSTIC.sql`

This will show:
- ✅ If profiles still have user_id set
- ✅ If audit trigger is the fixed version
- ✅ How many profiles have NULL user_id

### Step 2: Check Edge Function Logs
1. Go to https://app.supabase.com
2. Open project → **Edge Functions**
3. Click **manage-tenant-credentials**
4. Click **Logs** tab
5. Look for `[CREDENTIALS]` entries from your failed request
6. **Share the error message** you see

### Step 3: Which Tenant Are You Testing?
The error might be for a different tenant. Tell me:
- Which tenant are you trying to update?
- What are you trying to change (email or password)?

## 🎯 Most Likely Causes:

### Cause 1: Different Tenant With NULL user_id
You might be testing with a tenant that wasn't in our original list of 5.

**Solution:** Run `QUICK_DIAGNOSTIC.sql` to see all profiles with NULL user_id

### Cause 2: Browser Cache
Old JavaScript might still be loaded.

**Solution:** Hard refresh (Ctrl+Shift+R)

### Cause 3: Different Error
The edge function might be failing for a different reason now.

**Solution:** Check edge function logs (Step 2 above)

### Cause 4: Audit Trigger Not Applied
The trigger fix might not have been applied.

**Solution:** Run `QUICK_DIAGNOSTIC.sql` to verify

## 🚀 Quick Fix Options:

### Option A: If profiles have NULL user_id again
Run this in Supabase SQL Editor:
```sql
-- Fix specific tenant (replace email)
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'TENANT_EMAIL_HERE' LIMIT 1)
WHERE email = 'TENANT_EMAIL_HERE' 
  AND user_id IS NULL;
```

### Option B: If audit trigger needs reapplying
The `FIX_AUDIT_TRIGGER.sql` script was deleted. I can recreate it if needed.

---

## 📋 What I Need From You:

1. **Run `QUICK_DIAGNOSTIC.sql`** - paste results
2. **Check edge function logs** - paste the [CREDENTIALS] error
3. **Tell me which tenant** you're testing with

This will tell us exactly what's wrong! 🔍
