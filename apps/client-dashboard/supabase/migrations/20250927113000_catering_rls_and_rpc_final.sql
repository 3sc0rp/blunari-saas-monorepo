-- Finalize catering RLS and RPC behaviors
-- - Ensure tenant-aware WITH CHECK policies exist for catering tables
-- - Update catering_create_package RPC to set tenant_id from current user if omitted

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.catering_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catering_menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: tenant scoped access for catering_packages
DO $$
BEGIN
  BEGIN
    CREATE POLICY catering_packages_tenant_policy
      ON public.catering_packages
      FOR ALL
      TO authenticated
      USING (tenant_id = public.get_current_user_tenant_id())
      WITH CHECK (tenant_id = public.get_current_user_tenant_id());
  EXCEPTION WHEN duplicate_object THEN
    -- ignore if already exists
    NULL;
  END;
END$$;

-- Policy: tenant scoped access for catering_menu_items (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'catering_menu_items'
  ) THEN
    BEGIN
      CREATE POLICY catering_menu_items_tenant_policy
        ON public.catering_menu_items
        FOR ALL
        TO authenticated
        USING (tenant_id = public.get_current_user_tenant_id())
        WITH CHECK (tenant_id = public.get_current_user_tenant_id());
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END$$;

-- RPC: create package with server-side tenant resolution
CREATE OR REPLACE FUNCTION public.catering_create_package(payload jsonb)
RETURNS public.catering_packages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _rec public.catering_packages;
BEGIN
  -- Prefer current user's tenant; fallback to payload.tenant_id if provided
  SELECT public.get_current_user_tenant_id() INTO _tenant_id;
  IF _tenant_id IS NULL THEN
    _tenant_id := NULLIF(trim((payload->>'tenant_id')), '')::uuid;
  END IF;
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant not resolved' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.catering_packages (
    tenant_id,
    name,
    price_per_person,
    popular,
    min_guests,
    max_guests,
    includes_setup,
    includes_service,
    includes_cleanup,
    dietary_accommodations,
    image_url,
    description,
    active,
    display_order,
    created_at,
    updated_at
  ) VALUES (
    _tenant_id,
    COALESCE(NULLIF(payload->>'name', ''), 'Untitled Package'),
    COALESCE((payload->>'price_per_person')::int, 0),
    COALESCE((payload->>'popular')::boolean, false),
    COALESCE((payload->>'min_guests')::int, 0),
    NULLIF((payload->>'max_guests')::int, NULL),
    COALESCE((payload->>'includes_setup')::boolean, false),
    COALESCE((payload->>'includes_service')::boolean, true),
    COALESCE((payload->>'includes_cleanup')::boolean, false),
    (
      SELECT CASE WHEN payload ? 'dietary_accommodations' THEN
        ARRAY(SELECT jsonb_array_elements_text(payload->'dietary_accommodations'))
      ELSE NULL END
    ),
    NULLIF(payload->>'image_url', ''),
    NULLIF(payload->>'description', ''),
    true,
    COALESCE((payload->>'display_order')::int, 0),
    NOW(),
    NOW()
  ) RETURNING * INTO _rec;

  RETURN _rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.catering_create_package(jsonb) TO authenticated;


