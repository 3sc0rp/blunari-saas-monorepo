-- Simplify hash function using built-in hashtext function
CREATE OR REPLACE FUNCTION public.hash_reset_code(p_code text, p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Use built-in hashtext function for simplicity and reliability
    -- Combine code, email, and salt for security
    RETURN abs(hashtext(p_code || p_email || 'blunari_reset_salt_2025'))::text;
END;
$$;