-- ============================================================================
-- PROFESSIONAL TENANT PROVISIONING V2 - PART 3: SLUG VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_tenant_slug_realtime(p_slug TEXT)
RETURNS TABLE(
  available BOOLEAN,
  reason TEXT,
  suggestion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_slug TEXT;
  v_counter INTEGER := 2;
  v_suggestion TEXT;
  v_existing_tenant RECORD;
BEGIN
  p_slug := LOWER(TRIM(p_slug));
  p_slug := regexp_replace(p_slug, '[^a-z0-9-]', '', 'g');
  p_slug := regexp_replace(p_slug, '-+', '-', 'g');
  p_slug := trim(both '-' from p_slug);
  
  IF length(p_slug) < 3 THEN
    RETURN QUERY SELECT FALSE, 'Slug must be at least 3 characters', NULL::TEXT;
    RETURN;
  END IF;
  
  IF length(p_slug) > 50 THEN
    RETURN QUERY SELECT FALSE, 'Slug must not exceed 50 characters', NULL::TEXT;
    RETURN;
  END IF;
  
  IF p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RETURN QUERY SELECT FALSE, 'Slug must be lowercase alphanumeric with hyphens', NULL::TEXT;
    RETURN;
  END IF;
  
  IF p_slug = ANY(ARRAY[
    'admin', 'api', 'auth', 'login', 'logout', 'register', 
    'signup', 'signin', 'dashboard', 'settings', 'billing',
    'docs', 'help', 'support', 'public', 'static', 'assets',
    'app', 'www', 'mail', 'cdn', 'images', 'files'
  ]) THEN
    RETURN QUERY SELECT FALSE, format('"%s" is a reserved keyword', p_slug), NULL::TEXT;
    RETURN;
  END IF;
  
  SELECT * INTO v_existing_tenant
  FROM tenants 
  WHERE slug = p_slug AND deleted_at IS NULL
  LIMIT 1;
  
  IF FOUND THEN
    v_base_slug := p_slug;
    LOOP
      v_suggestion := format('%s-%s', v_base_slug, v_counter);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM tenants WHERE slug = v_suggestion AND deleted_at IS NULL
      );
      v_counter := v_counter + 1;
    END LOOP;
    
    RETURN QUERY SELECT 
      FALSE, 
      format('Slug "%s" is already used by "%s"', p_slug, v_existing_tenant.name),
      v_suggestion;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Slug is available', NULL::TEXT;
END;
$$;
