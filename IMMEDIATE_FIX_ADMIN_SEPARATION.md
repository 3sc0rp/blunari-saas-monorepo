# IMMEDIATE FIX: Prevent Admin Email from Being Modified

## The Problem

When you change a tenant's email in the admin dashboard:
1. Edge Function looks up `auto_provisioning` → finds YOUR user_id
2. Updates `auth.users` WHERE `id = YOUR_user_id`
3. Your admin email gets changed!

## Quick Fix (No Code Changes Required)

### Step 1: Remove Admin from Auto-Provisioning

Run this SQL in Supabase Dashboard:

```sql
-- Find your admin user_id
SELECT id, email FROM auth.users WHERE email = 'drood.tech@gmail.com';
-- Result: 7d68eada-5b32-419f-aef8-f15afac43ed0

-- Check what's in auto_provisioning
SELECT * FROM auto_provisioning;

-- Remove your admin from auto_provisioning (keeps tenant info intact)
DELETE FROM auto_provisioning 
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Verify tenants still exist
SELECT id, name, email FROM tenants;
```

### Step 2: What Happens Next

When you try to change tenant email now:
- Edge Function won't find user in `auto_provisioning`
- It will look for user by tenant email
- If tenant email doesn't match any existing user → **ERROR**
- This is GOOD - it prevents accidental changes!

### Step 3: Proper Way to Manage Tenant Credentials

**For existing tenants**, you have two options:

**Option A: Create Separate Auth Users (Recommended)**

```sql
-- For each tenant, create a dedicated auth user
-- (Must be done via Supabase Dashboard UI or Edge Function)

-- 1. Go to Authentication → Users → Add user
-- 2. Email: tenant-specific email (e.g., owner@restaurant.com)
-- 3. Auto-generate password
-- 4. Email confirmed: YES

-- 3. Link the new user to tenant (SQL Editor):
UPDATE tenants
SET owner_id = '< new-user-id>'  -- from step 2
WHERE id = '<tenant-id>';

-- 4. Create profile for new owner:
INSERT INTO profiles (user_id, email, role)
VALUES ('<new-user-id>', '<owner-email>', 'tenant_owner');

-- 5. Update auto_provisioning to point to new owner:
INSERT INTO auto_provisioning (user_id, tenant_id, restaurant_name, restaurant_slug, status, completed_at)
VALUES (
  '<new-user-id>',
  '<tenant-id>',
  '<tenant-name>',
  '<tenant-slug>',
  'completed',
  NOW()
);
```

**Option B: Use Tenant Email Directly (Simpler but Less Secure)**

```sql
-- Don't use auto_provisioning at all
-- Edge Function will look up user by tenant email
-- BUT: tenant email must match an existing auth user

-- For Test Restaurant:
-- 1. Create auth user with email matching tenant
-- 2. Tenant email updates will work automatically
```

---

## Proper Architecture Fix (Requires Code Changes)

### Modify Edge Function to Handle Admin vs Tenant Users

Add this logic to `manage-tenant-credentials/index.ts` around line 110:

```typescript
// After admin access check, before looking up tenant owner:

// CRITICAL: Check if we're trying to modify an admin user
const { data: isRequestingUserAdmin } = await supabaseAdmin
  .from("employees")
  .select("id")
  .eq("user_id", user.id)  // user = the admin making the request
  .eq("status", "ACTIVE")
  .maybeSingle();

if (isRequestingUserAdmin) {
  console.log(`[CREDENTIALS] Admin user detected, will NOT link admin to tenant`);
}

// When looking up tenantOwnerId:
if (tenantOwnerId === user.id) {
  // Prevent admin from modifying their own account via tenant management
  throw new Error(
    "Cannot modify admin user credentials via tenant management. " +
    "Tenant needs a separate owner account. Please create a dedicated " +
    "auth user for this tenant first."
  );
}
```

### Add owner_id Column to Tenants Table

```sql
-- Migration
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);

COMMENT ON COLUMN tenants.owner_id IS 'Dedicated auth user who owns this tenant (NOT admin user)';
```

---

## Summary

**Immediate Action** (5 minutes):
```sql
-- Remove admin from auto_provisioning
DELETE FROM auto_provisioning 
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
```

**This will:**
- ✅ Prevent your admin email from being changed
- ❌ Break tenant credential management (you'll get errors)
- → Forces you to create proper tenant owner accounts

**Proper Fix** (30 minutes):
1. Add `owner_id` column to tenants
2. Create separate auth users for each tenant
3. Link tenants to their owners via `owner_id`
4. Update Edge Function to check for admin users
5. Never link admin users to tenants again

**Result:**
- ✅ Admin credentials stay separate
- ✅ Each tenant has their own auth user
- ✅ Tenant credential changes only affect tenant owner
- ✅ Clear separation of concerns

---

## What Would You Like Me To Do?

1. **Quick Fix Only** - Delete auto_provisioning entries (breaks tenant management temporarily)
2. **Full Fix** - Implement proper architecture with separate owners (recommended)
3. **Hybrid** - Quick fix + create script to set up tenant owners properly

Let me know and I'll implement it!
