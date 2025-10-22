# ⚡ QUICK FIX - 500 Error (2 Minutes)

## What's Causing the 500 Error

Your tenant has `owner_id = NULL` in the database. The Edge Function now detects this and returns error 500.

## The Fix (Copy & Paste in Supabase)

### 1️⃣ Open Supabase SQL Editor

**URL**: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new

### 2️⃣ Copy and Run `RUN_THIS_NOW.sql`

The file contains 3 queries:
- ✅ **CHECK**: See which tenants need fixing
- 🔧 **FIX**: Update owner_id automatically  
- ✅ **VERIFY**: Confirm it worked

### 3️⃣ Expected Output

**Before Fix (Step 1)**:
```
name           | owner_id | status
---------------|----------|-------------------------
My Restaurant  | NULL     | ❌ NO OWNER_ID - NEEDS FIX
```

**After Fix (Step 3)**:
```
name           | owner_id                              | status
---------------|---------------------------------------|-----------------------------
My Restaurant  | 12345678-1234-1234-1234-123456789abc | ✅ OWNER PROPERLY CONFIGURED
```

### 4️⃣ Test Again

Go back to **Admin Dashboard** → Try email update → Should work! ✅

---

## Alternative: Create New Tenant

If you want to start fresh instead:

1. **Admin Dashboard** → **Add New Tenant**
2. Use a **brand new email** (must not exist in system)
3. The new tenant will automatically have `owner_id` set
4. Email updates will work immediately

---

## Why This Happens

- Tenants created **before** the fix have `owner_id = NULL`
- Edge Function now validates `owner_id` exists
- SQL script fixes old tenants by pulling `owner_id` from `auto_provisioning` table

---

## Still Getting 500?

Check the **error response body** in Network tab:
- Should now say: **"Tenant owner account is not properly configured"**
- This confirms the issue is NULL `owner_id`
- Run the SQL fix and try again

---

**File to run**: `RUN_THIS_NOW.sql` (open in Supabase SQL Editor)
