-- Create admin employee record - Simple one-step version
-- Just replace YOUR_EMAIL with your actual email address

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id by email (CHANGE THE EMAIL BELOW)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'YOUR_EMAIL@example.com';  -- <<<< CHANGE THIS
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with that email. Check your email address.';
  END IF;
  
  -- Create employee record
  INSERT INTO employees (user_id, employee_id, role, status, hire_date)
  VALUES (
    v_user_id,
    'EMP-ADMIN-' || SUBSTRING(v_user_id::TEXT, 1, 8),
    'SUPER_ADMIN',
    'ACTIVE',
    CURRENT_DATE
  );
  
  RAISE NOTICE 'Admin employee record created for user %', v_user_id;
END $$;

-- Verify it worked
SELECT id, employee_id, role, status, hire_date
FROM employees
ORDER BY created_at DESC
LIMIT 1;

