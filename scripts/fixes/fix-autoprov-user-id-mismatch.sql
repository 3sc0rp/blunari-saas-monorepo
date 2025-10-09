-- Fix auto_provisioning records to point to the correct owner user_id
-- Currently they point to the admin who provisioned, should point to the actual owner

-- Step 1: Show current mismatches
SELECT 
  ap.id,
  ap.restaurant_name,
  ap.user_id as current_user_id,
  p_current.email as current_email,
  ap.login_email as should_be_email,
  p_correct.user_id as correct_user_id
FROM auto_provisioning ap
LEFT JOIN profiles p_current ON ap.user_id = p_current.user_id
LEFT JOIN profiles p_correct ON ap.login_email = p_correct.email
WHERE ap.login_email != p_current.email  -- Mismatch detected
ORDER BY ap.created_at DESC;

-- Step 2: Fix the mismatches
-- Update auto_provisioning.user_id to match the actual owner (based on login_email)
UPDATE auto_provisioning ap
SET user_id = p.user_id
FROM profiles p
WHERE ap.login_email = p.email
  AND ap.user_id != p.user_id  -- Only update if different
  AND ap.login_email IS NOT NULL
  AND ap.login_email != '';

-- Step 3: Verify the fix
SELECT 
  'Fixed records' as status,
  COUNT(*) as count
FROM auto_provisioning ap
JOIN profiles p ON ap.user_id = p.user_id
WHERE ap.login_email = p.email

UNION ALL

SELECT 
  'Still mismatched' as status,
  COUNT(*) as count
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id
WHERE ap.login_email != COALESCE(p.email, '');
