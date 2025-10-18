-- Fix the validate_profile_update trigger function
-- The profiles table uses user_id, not id

CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Users can only update their own profile
  -- Fixed: profiles table uses user_id, not id
  IF OLD.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot update other users profiles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
