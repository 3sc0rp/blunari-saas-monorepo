-- ============================================================================
-- PROFESSIONAL TENANT PROVISIONING V2 - PART 2: EMAIL VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_owner_email_realtime(p_email TEXT)
RETURNS TABLE(
  available BOOLEAN,
  reason TEXT,
  conflicts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflicts JSONB := '[]'::JSONB;
  v_conflict JSONB;
BEGIN
  p_email := LOWER(TRIM(p_email));
  
  IF p_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN QUERY SELECT FALSE, 'Invalid email format', '[]'::JSONB;
    RETURN;
  END IF;
  
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = p_email AND deleted_at IS NULL) THEN
    v_conflict := jsonb_build_object('table', 'auth.users', 'reason', 'Email already has an authentication account');
    v_conflicts := v_conflicts || v_conflict;
  END IF;
  
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(email) = p_email) THEN
    v_conflict := jsonb_build_object('table', 'profiles', 'reason', 'Email already used in user profile');
    v_conflicts := v_conflicts || v_conflict;
  END IF;
  
  IF EXISTS (SELECT 1 FROM tenants WHERE LOWER(email) = p_email AND deleted_at IS NULL) THEN
    v_conflict := jsonb_build_object('table', 'tenants', 'reason', 'Email already used as tenant contact');
    v_conflicts := v_conflicts || v_conflict;
  END IF;
  
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(email) = p_email AND status != 'INACTIVE') THEN
    v_conflict := jsonb_build_object('table', 'employees', 'reason', 'Email already used by platform employee');
    v_conflicts := v_conflicts || v_conflict;
  END IF;
  
  IF jsonb_array_length(v_conflicts) > 0 THEN
    RETURN QUERY SELECT FALSE, 'Email is already in use', v_conflicts;
  ELSE
    RETURN QUERY SELECT TRUE, 'Email is available', v_conflicts;
  END IF;
END;
$$;
