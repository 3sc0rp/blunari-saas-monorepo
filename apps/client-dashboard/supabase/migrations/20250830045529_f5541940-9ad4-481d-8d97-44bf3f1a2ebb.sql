-- Recreate the hash function with explicit extension reference
CREATE OR REPLACE FUNCTION public.hash_reset_code(p_code text, p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pgcrypto'
AS $$
BEGIN
    -- Use SHA-256 with email as salt
    RETURN encode(public.digest(p_code || p_email || 'blunari_reset_salt', 'sha256'), 'hex');
END;
$$;