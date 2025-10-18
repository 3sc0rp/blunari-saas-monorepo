-- Enable pgcrypto extension for digest functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the hash_reset_code function to use the proper digest function
CREATE OR REPLACE FUNCTION public.hash_reset_code(p_code text, p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Use SHA-256 with email as salt
    RETURN encode(digest(p_code || p_email || 'blunari_reset_salt', 'sha256'), 'hex');
END;
$$;