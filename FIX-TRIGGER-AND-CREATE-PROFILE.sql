-- =============================================================================
-- FIX THE BROKEN TRIGGER FUNCTION
-- =============================================================================
-- The audit_sensitive_operations() function is using NEW.id which doesn't exist
-- in the profiles table (it uses user_id instead)
-- =============================================================================

-- First, let's see the current function
SELECT 
  '=== CURRENT TRIGGER FUNCTION ===' as info;

SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'audit_sensitive_operations';

-- Now let's fix the function to handle tables with different primary key names
SELECT 
  '' as separator;

SELECT 
  '=== FIXING TRIGGER FUNCTION ===' as info;

CREATE OR REPLACE FUNCTION audit_sensitive_operations()
RETURNS TRIGGER AS $$
DECLARE
  record_id UUID;
BEGIN
  -- Determine the ID field based on the table
  -- profiles table uses user_id, other tables might use id
  IF TG_TABLE_NAME = 'profiles' THEN
    record_id := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- For DELETE operations, use OLD record
    IF TG_TABLE_NAME = 'profiles' THEN
      record_id := OLD.user_id;
    ELSE
      record_id := OLD.id;
    END IF;
  ELSE
    -- For other tables, try to use id field
    BEGIN
      record_id := NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- If id doesn't exist, try user_id
        record_id := NEW.user_id;
    END;
  END IF;

  -- Log the security event
  PERFORM log_security_event(
    CASE 
      WHEN TG_OP = 'INSERT' THEN TG_TABLE_NAME || '_create'
      WHEN TG_OP = 'UPDATE' THEN TG_TABLE_NAME || '_update'
      WHEN TG_OP = 'DELETE' THEN TG_TABLE_NAME || '_delete'
    END,
    'info',
    record_id,
    NULL,
    NULL::inet,
    NULL,
    jsonb_build_object(
      'updated_by', auth.uid(),
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Trigger function fixed!' as status;

-- Now create the profile
SELECT 
  '' as separator;

SELECT 
  '=== CREATING PROFILE ===' as info;

INSERT INTO profiles (
  user_id,
  email,
  first_name,
  last_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  'Admin',
  'User',
  'admin',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
ON CONFLICT (user_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

SELECT '✅ Profile created!' as status;

-- Verify the profile was created
SELECT 
  '' as separator;

SELECT 
  '=== VERIFICATION ===' as info;

SELECT 
  user_id,
  email,
  first_name,
  last_name,
  role,
  '✅ Profile exists!' as result
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

SELECT '✅ Done! Trigger fixed and profile created successfully.' as final_message;
