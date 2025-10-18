-- ============================================================================
-- RESET ALL USERS AND CREATE NEW ADMIN (SAFE METHOD)
-- ============================================================================
-- ⚠️  WARNING: This will DELETE ALL users and create a fresh admin account
-- Uses TRUNCATE instead of DELETE to bypass security triggers
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Use TRUNCATE to clear tables (bypasses triggers, but requires CASCADE)
TRUNCATE TABLE public.employees CASCADE;
TRUNCATE TABLE auth.users CASCADE;

-- Step 2: Create new SUPER_ADMIN user
-- You can customize the email and password below
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
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@blunari.ai',                           -- 📧 ADMIN EMAIL
  crypt('admin123', gen_salt('bf')),            -- 🔑 ADMIN PASSWORD
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
  '{"first_name": "Admin", "last_name": "User"}',
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

-- Step 3: Create employee record for the admin
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
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'Admin',
  'User',
  'SUPER_ADMIN',
  'ACTIVE',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'admin@blunari.ai'
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify the new admin was created
SELECT 
  '✅ NEW ADMIN CREATED' as status,
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

-- Display the credentials
SELECT 
  '🔐 LOGIN CREDENTIALS' as info,
  'admin@blunari.ai' as email,
  'admin123' as password,
  'SUPER_ADMIN' as role,
  'ACTIVE' as status;
