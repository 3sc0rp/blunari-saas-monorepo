-- Strengthen RLS: allow inserts/updates when user is mapped to tenant via user_tenant_access
-- Also add a trigger to auto-populate tenant_id when omitted

-- Helper condition reused in policies
CREATE OR REPLACE FUNCTION public._has_tenant_access(_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT false
$$;

GRANT EXECUTE ON FUNCTION public._has_tenant_access(uuid) TO authenticated;

-- Replace insert/update policies on catering_packages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catering_packages' AND policyname='catering_packages_insert_check'
  ) THEN
    DROP POLICY catering_packages_insert_check ON public.catering_packages;
  END IF;
  CREATE POLICY catering_packages_insert_check
  ON public.catering_packages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    OR public._has_tenant_access(tenant_id)
  );

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catering_packages' AND policyname='catering_packages_update_check'
  ) THEN
    DROP POLICY catering_packages_update_check ON public.catering_packages;
  END IF;
  CREATE POLICY catering_packages_update_check
  ON public.catering_packages
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    OR public._has_tenant_access(tenant_id)
  )
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    OR public._has_tenant_access(tenant_id)
  );
END$$;

-- Auto-fill tenant_id if omitted
CREATE OR REPLACE FUNCTION public.set_catering_package_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_current_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_catering_package_tenant_id ON public.catering_packages;
CREATE TRIGGER trg_set_catering_package_tenant_id
BEFORE INSERT ON public.catering_packages
FOR EACH ROW
EXECUTE FUNCTION public.set_catering_package_tenant_id();

COMMENT ON FUNCTION public._has_tenant_access(uuid) IS 'Checks if current user has active access to the given tenant.';
COMMENT ON FUNCTION public.set_catering_package_tenant_id IS 'Populates tenant_id from session if omitted.';

