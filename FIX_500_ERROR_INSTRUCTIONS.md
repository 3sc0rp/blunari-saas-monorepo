# Fix 500 Error - Missing auto_provisioning Records

## The Problem

Your tenants don't have `auto_provisioning` records, which causes the `manage-tenant-credentials` function to return 500 errors.

**Current Status:**
- ❌ droodpizza - Missing auto_provisioning
- ❌ Test Restaurant 1759905296975 - Missing auto_provisioning

## The Solution

Run the script I created to add the missing records: `scripts/create-missing-provisioning.mjs`

---

## Step-by-Step Fix

### Step 1: Get Your Service Role Key

1. Open this URL in your browser:
   ```
   https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/settings/api
   ```

2. Scroll down to **Project API keys**

3. Find the **`service_role`** key (NOT the `anon` key)

4. Click the copy icon to copy it

### Step 2: Set the Environment Variable

In your PowerShell terminal, run:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="paste-your-service-role-key-here"
```

**Example:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 3: Run the Fix Script

```powershell
cd "c:\Users\Drood\Desktop\Blunari SAAS"
node scripts/create-missing-provisioning.mjs
```

### Step 4: Verify It Worked

After running the script, verify:

```powershell
node scripts/check-all-tenants-provisioning.mjs
```

**Expected output:**
```
✅ droodpizza - Has auto_provisioning: YES
✅ Test Restaurant 1759905296975 - Has auto_provisioning: YES
```

### Step 5: Test Credential Management

1. Hard refresh your browser: **Ctrl+Shift+R**
2. Navigate to a tenant detail page
3. Go to **Users** tab
4. Try updating the email or generating a password
5. Should work without 500 errors! ✅

---

## What the Script Does

The `create-missing-provisioning.mjs` script will:

1. ✅ Find your SUPER_ADMIN user
2. ✅ Check all tenants for missing auto_provisioning records
3. ✅ Create auto_provisioning records for tenants that need them
4. ✅ Link them to your admin user
5. ✅ Set status to 'completed'
6. ✅ Create/update profiles as needed

---

## Alternative: Manual SQL Fix

If you prefer to run SQL directly, you can also:

1. Open: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new

2. Paste and run this SQL:

```sql
-- Get admin user ID
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get first SUPER_ADMIN
  SELECT user_id INTO admin_id
  FROM employees
  WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'
  LIMIT 1;
  
  -- Create provisioning for droodpizza
  INSERT INTO auto_provisioning (
    user_id, tenant_id, restaurant_name, restaurant_slug,
    timezone, currency, status, login_email, business_email,
    created_at, completed_at
  )
  SELECT 
    admin_id,
    t.id,
    t.name,
    t.slug,
    COALESCE(t.timezone, 'America/New_York'),
    COALESCE(t.currency, 'USD'),
    'completed',
    COALESCE(t.email, 'admin@blunari.ai'),
    COALESCE(t.email, 'admin@blunari.ai'),
    t.created_at,
    t.created_at
  FROM tenants t
  WHERE t.slug = 'dspizza'
  ON CONFLICT DO NOTHING;
  
  -- Create provisioning for test restaurant
  INSERT INTO auto_provisioning (
    user_id, tenant_id, restaurant_name, restaurant_slug,
    timezone, currency, status, login_email, business_email,
    created_at, completed_at
  )
  SELECT 
    admin_id,
    t.id,
    t.name,
    t.slug,
    COALESCE(t.timezone, 'America/New_York'),
    COALESCE(t.currency, 'USD'),
    'completed',
    COALESCE(t.email, 'admin@blunari.ai'),
    COALESCE(t.email, 'admin@blunari.ai'),
    t.created_at,
    t.created_at
  FROM tenants t
  WHERE t.slug = 'test-1759905296975'
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created auto_provisioning records!';
END $$;

-- Verify
SELECT 
  t.name,
  t.slug,
  CASE WHEN ap.id IS NOT NULL THEN '✅ Has record' ELSE '❌ Missing' END
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id;
```

---

## Troubleshooting

### "No SUPER_ADMIN employee found"

Check your employees table:
```sql
SELECT user_id, role, status FROM employees WHERE role = 'SUPER_ADMIN';
```

If no admin exists, you'll need to create one first.

### "Still getting 500 errors"

1. Check Edge Function logs: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions/manage-tenant-credentials/logs

2. Look for the correlation_id in the error to find specific log entries

3. The logs will show exactly which step is failing

---

## Summary

**Quick Fix (Recommended):**
1. Get service role key from Supabase dashboard
2. Set environment variable: `$env:SUPABASE_SERVICE_ROLE_KEY="your-key"`
3. Run: `node scripts/create-missing-provisioning.mjs`
4. Verify: `node scripts/check-all-tenants-provisioning.mjs`
5. Test in browser (hard refresh first)

**Time:** ~2 minutes

Let me know once you've run the script and I'll help verify it worked!
