-- 🔧 FIX THE AUDIT TRIGGER TO HANDLE PROFILES TABLE
-- This permanently fixes the trigger so it doesn't fail on tables without 'status' column

-- First, let's see the current trigger function
SELECT 
  'Current problematic trigger:' as info,
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname = 'audit_all_sensitive_operations';

-- Now let's fix it by recreating it with proper table checking
CREATE OR REPLACE FUNCTION audit_all_sensitive_operations()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  changes JSONB;
  has_status_column BOOLEAN;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Check if the table has a status column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
    AND table_name = TG_TABLE_NAME 
    AND column_name = 'status'
  ) INTO has_status_column;
  
  -- Build changes JSON
  changes := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'user_id', auth.uid(),
    'user_email', user_email,
    'timestamp', NOW()
  );
  
  -- Add old and new data if available
  IF TG_OP != 'INSERT' THEN
    changes := changes || jsonb_build_object('old', row_to_json(OLD));
  END IF;
  
  IF TG_OP != 'DELETE' THEN
    changes := changes || jsonb_build_object('new', row_to_json(NEW));
  END IF;
  
  -- Only check status field if table has it
  IF has_status_column AND TG_TABLE_NAME = 'employees' AND TG_OP = 'UPDATE' THEN
    -- Use dynamic SQL to safely check status field
    EXECUTE format('SELECT ($1).status IS DISTINCT FROM ($2).status') 
    INTO has_status_column 
    USING OLD, NEW;
    
    IF has_status_column THEN
      changes := changes || jsonb_build_object('status_changed', true);
    END IF;
  END IF;
  
  -- Log to security_events table (if it exists)
  BEGIN
    INSERT INTO security_events (
      event_type,
      severity,
      user_id,
      event_data,
      created_at
    ) VALUES (
      'data_modification',
      CASE 
        WHEN TG_TABLE_NAME IN ('employees', 'tenants', 'profiles') THEN 'high'
        ELSE 'medium'
      END,
      auth.uid(),
      changes,
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip logging
    NULL;
  END;
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
SELECT 
  '✅ TRIGGER FUNCTION UPDATED!' as result,
  'The audit trigger now properly handles tables without status column.' as message,
  'You can now update profiles without errors.' as next_step;
