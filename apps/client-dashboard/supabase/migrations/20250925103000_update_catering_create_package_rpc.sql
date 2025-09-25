-- Update RPC to accept optional tenant_id in payload; prefer provided, else resolve from session

CREATE OR REPLACE FUNCTION public.catering_create_package(payload jsonb)
RETURNS public.catering_packages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  res public.catering_packages;
BEGIN
  tid := COALESCE( (payload->>'tenant_id')::uuid, public.get_current_user_tenant_id() );
  IF tid IS NULL THEN
    RAISE EXCEPTION 'tenant_not_resolved';
  END IF;

  INSERT INTO public.catering_packages (
    tenant_id,
    name,
    description,
    price_per_person,
    min_guests,
    max_guests,
    includes_setup,
    includes_service,
    includes_cleanup,
    dietary_accommodations,
    image_url,
    popular,
    active,
    created_at,
    updated_at
  ) VALUES (
    tid,
    COALESCE(payload->>'name', 'Untitled Package'),
    payload->>'description',
    COALESCE((payload->>'price_per_person')::int, 0),
    COALESCE((payload->>'min_guests')::int, 1),
    NULLIF((payload->>'max_guests')::int, 0),
    COALESCE((payload->>'includes_setup')::boolean, false),
    COALESCE((payload->>'includes_service')::boolean, false),
    COALESCE((payload->>'includes_cleanup')::boolean, false),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'dietary_accommodations')), '{}'),
    payload->>'image_url',
    COALESCE((payload->>'popular')::boolean, false),
    true,
    now(),
    now()
  ) RETURNING * INTO res;

  RETURN res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.catering_create_package(jsonb) TO authenticated;

