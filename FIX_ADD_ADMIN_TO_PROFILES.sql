-- Fix: Add admin user to profiles table with 'admin' role (lowercase)
-- This works with manage-tenant-credentials Edge Function which checks for lowercase 'admin' or 'owner'
-- After running this, also run FIX_PROVISION_TENANT_ATOMIC_ROLES.sql to update database function

-- First check if user exists in profiles
SELECT 
  user_id,
  email,
  role,
  first_name,
  last_name
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- If not exists, insert the admin user with 'admin' role (lowercase for manage-tenant-credentials)
INSERT INTO profiles (
  user_id,
  email,
  role,
  first_name,
  last_name,
  onboarding_completed
)
VALUES (
  '7d68eada-5b32-419f-aef8-f15afac43ed0',
  'drood.tech@gmail.com',
  'admin',
  'Drood',
  'Admin',
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'admin',
  email = 'drood.tech@gmail.com',
  updated_at = NOW();

-- Verify the insert
SELECT 
  user_id,
  email,
  role,
  first_name,
  last_name,
  onboarding_completed,
  created_at
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
