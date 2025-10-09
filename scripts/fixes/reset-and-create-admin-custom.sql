-- ============================================================================
-- RESET ALL USERS AND CREATE NEW ADMIN (CUSTOMIZABLE)
-- ============================================================================
-- ⚠️  WARNING: This will DELETE ALL users and create a fresh admin account
-- 
-- BEFORE RUNNING:
-- 1. Update the email on line 48 (current: admin@blunari.ai)
-- 2. Update the password on line 49 (current: admin123)
-- 3. Update the first_name and last_name on line 74 if desired
--
-- Then run this entire script in Supabase SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_admin_email TEXT := 'admin@blunari.ai';     -- 📧 CHANGE THIS EMAIL
  v_admin_password TEXT := 'admin123';          -- 🔑 CHANGE THIS PASSWORD
  v_first_name TEXT := 'Admin';                 -- First name
  v_last_name TEXT := 'User';                   -- Last name
BEGIN
  -- Step 1: Delete all employees first
  RAISE NOTICE 'Step 1: Deleting all employees...';
  DELETE FROM public.employees;
  RAISE NOTICE '✅ All employees deleted';

  -- Step 2: Delete all auth users
  RAISE NOTICE 'Step 2: Deleting all auth users...';
  DELETE FROM auth.users;
  RAISE NOTICE '✅ All auth users deleted';

  -- Step 3: Generate new user ID
  v_user_id := gen_random_uuid();
  RAISE NOTICE 'Step 3: Generated new user ID: %', v_user_id;

  -- Step 4: Create new admin user in auth.users
  RAISE NOTICE 'Step 4: Creating new admin user in auth.users...';
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_admin_email,
    crypt(v_admin_password, gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name),
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false
  );
  RAISE NOTICE '✅ Admin user created in auth.users';

  -- Step 5: Create employee record
  RAISE NOTICE 'Step 5: Creating employee record...';
  INSERT INTO public.employees (
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_admin_email,
    v_first_name,
    v_last_name,
    'SUPER_ADMIN',
    'ACTIVE',
    now(),
    now()
  );
  RAISE NOTICE '✅ Employee record created';

  -- Step 6: Display success message
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ADMIN USER CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email:    %', v_admin_email;
  RAISE NOTICE 'Password: %', v_admin_password;
  RAISE NOTICE 'Role:     SUPER_ADMIN';
  RAISE NOTICE 'Status:   ACTIVE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Change the password after first login!';
  
END $$;

-- Verify the new admin was created
SELECT 
  '✅ VERIFICATION' as check_type,
  e.id as employee_id,
  e.user_id,
  e.email,
  e.first_name,
  e.last_name,
  e.role,
  e.status,
  u.email_confirmed_at,
  u.created_at
FROM public.employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE e.role = 'SUPER_ADMIN';
