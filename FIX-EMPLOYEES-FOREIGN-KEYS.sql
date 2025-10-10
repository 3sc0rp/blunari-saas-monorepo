-- =============================================================================
-- CHECK AND FIX EMPLOYEES TABLE FOREIGN KEYS
-- =============================================================================
-- The 400 error suggests foreign key relationships might not be set up correctly
-- =============================================================================

SELECT 
  '=== CHECKING EMPLOYEES TABLE STRUCTURE ===' as info;

-- Check employees table columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 
  '' as separator;

SELECT 
  '=== CHECKING FOREIGN KEY CONSTRAINTS ===' as info;

SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'employees'
AND tc.table_schema = 'public';

-- Check if any employees exist
SELECT 
  '' as separator;

SELECT 
  '=== CHECKING EMPLOYEE DATA ===' as info;

SELECT 
  COUNT(*) as total_employees
FROM employees;

-- Try the problematic query directly
SELECT 
  '' as separator;

SELECT 
  '=== TESTING THE QUERY ===' as info;

-- Try without the foreign key syntax first
SELECT 
  e.id,
  e.employee_id,
  e.role,
  e.status,
  e.user_id,
  e.department_id,
  p.first_name,
  p.last_name,
  p.email,
  d.name as department_name
FROM employees e
LEFT JOIN profiles p ON e.user_id = p.user_id
LEFT JOIN departments d ON e.department_id = d.id
LIMIT 5;

SELECT '✅ If you see results above, the data exists and joins work' as note;

-- If foreign keys don't exist, create them
SELECT 
  '' as separator;

SELECT 
  '=== ENSURING FOREIGN KEYS EXIST ===' as info;

-- Add foreign key to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_user_id_fkey' 
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE employees 
    ADD CONSTRAINT employees_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(user_id);
    
    RAISE NOTICE 'Added foreign key: employees.user_id -> profiles.user_id';
  ELSE
    RAISE NOTICE 'Foreign key already exists: employees.user_id -> profiles.user_id';
  END IF;
END $$;

-- Add foreign key to departments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_department_id_fkey' 
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE employees 
    ADD CONSTRAINT employees_department_id_fkey 
    FOREIGN KEY (department_id) 
    REFERENCES departments(id);
    
    RAISE NOTICE 'Added foreign key: employees.department_id -> departments.id';
  ELSE
    RAISE NOTICE 'Foreign key already exists: employees.department_id -> departments.id';
  END IF;
END $$;

SELECT '✅ Foreign keys checked and created if needed' as status;

-- Final verification
SELECT 
  '' as separator;

SELECT 
  '=== FINAL VERIFICATION ===' as info;

SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'employees';

SELECT '✅ Done! Check results above.' as final_message;
