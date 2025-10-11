# ADMIN vs TENANT USER SEPARATION - ARCHITECTURE FIX

## Current Problem

**What's happening:**
- Admin user (drood.tech@gmail.com) logs into admin.blunari.ai
- Admin creates tenants and manages them
- `auto_provisioning` table links tenants to admin's user_id
- When admin changes tenant email → admin's OWN email gets updated!

**Why it's wrong:**
- Admin account and tenant owner accounts should be SEPARATE
- Changing tenant credentials should NOT affect admin credentials

---

## Correct Architecture

### Two Separate User Types:

1. **Admin Users** (admin.blunari.ai)
   - Login: admin.blunari.ai
   - Role: Stored in `employees` table (no tenant_id)
   - Purpose: Manage all tenants
   - Email: Should NEVER change via tenant management

2. **Tenant Owner Users** (app.blunari.ai)
   - Login: app.blunari.ai (their own dashboard)
   - Role: Stored in `auto_provisioning.user_id`
   - Purpose: Own and operate their restaurant
   - Email: Can be changed by admin

---

## Solution

### Option 1: Create Separate Auth Users for Each Tenant (RECOMMENDED)

When admin creates a tenant in TenantUserManagement:

```typescript
// 1. Create a new auth user for the tenant
const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
  email: `owner-${tenantId}@example.com`, // or real email if provided
  password: generatePassword(),
  email_confirm: true,
  user_metadata: {
    is_tenant_owner: true,
    tenant_id: tenantId,
  }
});

// 2. Create profile for tenant owner
await supabase.from('profiles').insert({
  user_id: newUser.user.id,
  email: newUser.user.email,
  role: 'tenant_owner',
});

// 3. Link in auto_provisioning
await supabase.from('auto_provisioning').insert({
  user_id: newUser.user.id,  // ← NEW separate user, NOT admin!
  tenant_id: tenantId,
  status: 'completed',
});

// 4. Update tenants table
await supabase.from('tenants').update({
  email: newUser.user.email,
  owner_id: newUser.user.id,  // ← Add owner_id column!
}).eq('id', tenantId);
```

### Option 2: Don't Link Admin to Tenants (SIMPLER)

```typescript
// In manage-tenant-credentials Edge Function:

// BEFORE (WRONG):
// Look up user_id from auto_provisioning
const { data: provisioning } = await supabaseAdmin
  .from("auto_provisioning")
  .select("user_id")
  .eq("tenant_id", tenantId)
  .single();

// AFTER (CORRECT):
// Look up by tenant email directly, don't use auto_provisioning
const { data: tenant } = await supabaseAdmin
  .from("tenants")
  .select("email, owner_id")
  .eq("id", tenantId)
  .single();

// If no owner_id exists, CREATE a new auth user for this tenant
if (!tenant.owner_id) {
  const { data: newOwner } = await supabaseAdmin.auth.admin.createUser({
    email: tenant.email,
    password: generatePassword(),
    email_confirm: true,
  });
  
  // Update tenant with owner_id
  await supabaseAdmin.from("tenants").update({
    owner_id: newOwner.user.id
  }).eq("id", tenantId);
  
  tenantOwnerId = newOwner.user.id;
} else {
  tenantOwnerId = tenant.owner_id;
}
```

---

## Database Changes Needed

### Add `owner_id` column to tenants table:

```sql
-- Migration: Add owner_id to tenants
ALTER TABLE tenants
ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);

-- Backfill: Create separate owners for existing tenants
DO $$
DECLARE
  tenant_record RECORD;
  new_user_id UUID;
BEGIN
  FOR tenant_record IN SELECT id, email, name FROM tenants WHERE owner_id IS NULL LOOP
    -- Create a new auth user for this tenant
    -- (This would need to be done via Edge Function with SERVICE_ROLE_KEY)
    RAISE NOTICE 'Tenant % needs owner creation', tenant_record.name;
  END LOOP;
END $$;
```

---

## Implementation Steps

### Immediate Fix (Fast):

1. **Modify manage-tenant-credentials Edge Function:**
   - Check if user making request is admin (via employees table)
   - If admin → look up tenant's owner_id (NOT admin's user_id)
   - If no owner exists → create one on-the-fly

2. **Update TenantUserManagement UI:**
   - Show "Tenant Owner Email" separately from "Admin Email"
   - Make it clear which email is being changed

### Long-term Fix (Proper):

1. **Add migration** to add `owner_id` to tenants table
2. **Create onboarding flow** for tenant owners
3. **Separate admin auth** from tenant owner auth completely
4. **Update auto_provisioning** to only track tenant owners, not admins

---

## Quick Fix for Your Current Issue

**Right now, to unlink your admin account from tenants:**

```sql
-- Run in Supabase SQL Editor:

-- 1. Check current state
SELECT 
  t.name,
  t.email as tenant_email,
  ap.user_id as linked_user_id,
  au.email as linked_user_email
FROM tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
LEFT JOIN auth.users au ON au.id = ap.user_id;

-- 2. Option A: Remove auto_provisioning links (will break credential management)
-- DELETE FROM auto_provisioning WHERE tenant_id IN (
--   SELECT id FROM tenants
-- );

-- 3. Option B: Create placeholder users for each tenant
-- (Requires Edge Function - cannot do this in SQL directly)
```

**The real fix requires modifying the Edge Function to:**
1. NOT look up user_id from auto_provisioning when admin makes changes
2. Instead, manage tenant credentials independently of admin account
3. Create separate auth users for each tenant owner

---

## Recommended Approach

**I suggest we implement Option 2 (simpler) with these steps:**

1. ✅ Modify `manage-tenant-credentials` to NOT use auto_provisioning for admin-initiated changes
2. ✅ Add logic to create tenant owner auth users on-demand
3. ✅ Store owner_id in tenants table for future reference
4. ✅ Update UI to show tenant owner vs admin distinction

**This will:**
- ✅ Keep your admin email separate
- ✅ Allow each tenant to have their own credentials
- ✅ Not require major migration
- ✅ Work with existing data

Would you like me to implement this fix?
