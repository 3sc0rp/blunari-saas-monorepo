-- Add missing columns to employees table for staff management
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update the employees table to allow these fields to be used in the staff interface
UPDATE public.employees 
SET first_name = COALESCE(first_name, 'Staff'),
    last_name = COALESCE(last_name, 'Member'),
    email = COALESCE(email, employee_id || '@restaurant.local')
WHERE first_name IS NULL OR last_name IS NULL OR email IS NULL;

-- Make email unique within tenant scope (if we had tenant_id, but for now just unique)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employees_email_unique' 
        AND table_name = 'employees'
    ) THEN
        ALTER TABLE public.employees ADD CONSTRAINT employees_email_unique UNIQUE (email);
    END IF;
END $$;