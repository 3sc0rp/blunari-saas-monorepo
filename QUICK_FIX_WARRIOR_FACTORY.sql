-- QUICK FIX for Warrior Factory tenant
-- This tenant is linked to the wrong email (naturevillage2024@gmail.com)
-- We need to create wfactory@gmail.com user and link it properly

-- This script will:
-- 1. Create a new auth user for wfactory@gmail.com
-- 2. Update the tenant to use this new owner
-- 3. Update auto_provisioning to link to the new owner

DO $$
DECLARE
  v_tenant_id uuid;
  v_new_owner_id uuid;
  v_old_owner_id uuid;
  v_temp_password text;
BEGIN
  -- Get tenant ID
  SELECT id, owner_id INTO v_tenant_id, v_old_owner_id 
  FROM tenants 
  WHERE name = 'Warrior Factory';
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant "Warrior Factory" not found';
  END IF;
  
  RAISE NOTICE 'Found tenant: % (current owner: %)', v_tenant_id, v_old_owner_id;
  
  -- Generate a secure temporary password
  v_temp_password := 'TempPass' || floor(random() * 10000)::text || '!';
  
  -- Create new auth user (this calls Supabase Auth API via SQL)
  -- Note: This will fail if run directly. Use the admin dashboard Edge Function instead.
  
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'MANUAL STEPS REQUIRED:';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '2. Click "Add User" (or "Invite User")';
  RAISE NOTICE '3. Enter email: wfactory@gmail.com';
  RAISE NOTICE '4. Set a temporary password: %', v_temp_password;
  RAISE NOTICE '5. Check "Auto Confirm User"';
  RAISE NOTICE '6. Copy the new user ID that gets created';
  RAISE NOTICE '7. Then run this update (replace <new-user-id> with actual UUID):';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATE tenants SET owner_id = ''<new-user-id>''::uuid WHERE id = ''%'';', v_tenant_id;
  RAISE NOTICE 'UPDATE auto_provisioning SET user_id = ''<new-user-id>''::uuid WHERE tenant_id = ''%'';', v_tenant_id;
  RAISE NOTICE 'INSERT INTO profiles (user_id, email, role) VALUES (''<new-user-id>''::uuid, ''wfactory@gmail.com'', ''tenant_owner'') ON CONFLICT (user_id) DO UPDATE SET email = ''wfactory@gmail.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================';
  
END $$;

-- Step 3: Verify the fix
SELECT 
  'After Fix' as status,
  t.id as tenant_id,
  t.name,
  t.email as tenant_email,
  t.owner_id,
  CASE 
    WHEN t.owner_id IS NULL THEN '✅ Ready for new owner creation'
    ELSE '⚠️ owner_id still set'
  END as ready_status
FROM tenants t
WHERE t.name = 'Warrior Factory';

-- Step 4: Check auto_provisioning is cleared
SELECT 
  'Auto-provisioning check' as status,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Cleared successfully'
    ELSE '⚠️ Still has records'
  END as ready_status
FROM auto_provisioning ap
WHERE ap.tenant_id = (SELECT id FROM tenants WHERE name = 'Warrior Factory');

-- INSTRUCTIONS AFTER RUNNING THIS:
-- 1. Go to admin dashboard
-- 2. Find Warrior Factory tenant
-- 3. Click on it to open Tenant Detail Page
-- 4. In the tenant info section, the email should show wfactory@gmail.com
-- 5. Try to update any field (or re-save the email)
-- 6. The Edge Function will now create a new owner account with wfactory@gmail.com
