-- Fix the hash function with proper type casting
CREATE OR REPLACE FUNCTION public.hash_reset_code(p_code text, p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Use SHA-256 with email as salt - cast text to bytea for digest function
    RETURN encode(digest((p_code || p_email || 'blunari_reset_salt')::bytea, 'sha256'), 'hex');
END;
$$;