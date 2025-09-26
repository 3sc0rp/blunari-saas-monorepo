-- Add display_order to catering_packages for manual ordering in UI
ALTER TABLE public.catering_packages
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Create helpful index for ordering
CREATE INDEX IF NOT EXISTS idx_catering_packages_display_order
  ON public.catering_packages(tenant_id, popular DESC, display_order, created_at DESC)
  WHERE active = true;

-- RPC to reorder multiple packages atomically (uses current user's tenant)
CREATE OR REPLACE FUNCTION public.catering_reorder_packages(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _items jsonb;
  _it jsonb;
  _id uuid;
  _order integer;
BEGIN
  SELECT public.get_current_user_tenant_id() INTO _tenant_id;
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant access required';
  END IF;

  _items := COALESCE(payload->'items', '[]'::jsonb);

  PERFORM pg_advisory_xact_lock(hashtext('catering_reorder_packages')::bigint);

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _id := (_it->>'id')::uuid;
    _order := COALESCE((_it->>'display_order')::int, 0);
    UPDATE public.catering_packages
      SET display_order = _order,
          updated_at = now()
      WHERE id = _id AND tenant_id = _tenant_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.catering_reorder_packages(jsonb) TO authenticated;

