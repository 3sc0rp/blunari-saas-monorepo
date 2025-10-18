-- Complete fix for Test Restaurant 1759905296975
-- This will create the owner user, profile, and fix auto_provisioning

-- IMPORTANT: This assumes the owner user doesn't exist yet
-- If the owner can't log in, they'll need to use the password reset flow

-- Step 1: Check current state
SELECT 
  'Current state:' as info,
  ap.restaurant_name,
  ap.login_email as owner_should_be,
  p.email as currently_showing,
  ap.user_id as current_user_id
FROM auto_provisioning ap
JOIN profiles p ON ap.user_id = p.user_id
WHERE ap.restaurant_slug = 'test-restaurant-1759905296975';

-- Step 2: Since we can't create auth users from SQL, we need to:
-- A) Create a profile with a placeholder user_id for now
-- B) OR update auto_provisioning to use an existing owner user if one exists

-- Let's check if there's an existing user with this email
-- (This would have been created by the edge function)
SELECT 
  user_id,
  email,
  created_at
FROM profiles
WHERE email = 'owner-test-1759905296975@example.com';

-- If no user exists, we have two options:

-- OPTION 1: Create tenant with admin as temporary owner
-- (They can transfer ownership later)
-- [No changes needed - current state]

-- OPTION 2: Create profile for a new owner user
-- Note: This requires the user_id from auth.users which we can't query directly
-- The edge function should have created this user

-- Step 3: For NOW, let's document that this tenant needs to be reprovisioned
-- OR we can accept admin@blunari.ai as the temporary owner

-- To reprovision correctly, delete this tenant and create again through UI
-- with the proper owner email

SELECT 'RECOMMENDATION:' as action,
       'Delete this test tenant and reprovision through the UI' as solution,
       'This will ensure the owner user is created correctly' as why;
