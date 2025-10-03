-- Step 1: Find your user_id by email
-- Replace 'YOUR_EMAIL@example.com' with your actual email

SELECT id as user_id, email 
FROM auth.users 
WHERE email = 'YOUR_EMAIL@example.com';  -- <-- CHANGE THIS TO YOUR EMAIL

-- Step 2: Copy the user_id from above, then run this (replace the UUID):

INSERT INTO employees (user_id, employee_id, role, status, hire_date)
VALUES (
  'PASTE_YOUR_USER_ID_HERE',  -- <-- PASTE THE UUID FROM STEP 1
  'EMP-ADMIN-' || SUBSTRING('PASTE_YOUR_USER_ID_HERE'::TEXT, 1, 8),
  'SUPER_ADMIN',
  'ACTIVE',
  CURRENT_DATE
);

SELECT 'Admin employee record created! ✅' as status;

