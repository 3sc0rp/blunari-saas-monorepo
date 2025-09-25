-- Ensure explicit WITH CHECK policies exist for INSERT/UPDATE so RLS doesn't block writes

-- catering_packages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'catering_packages' AND policyname = 'catering_packages_insert_check'
  ) THEN
    CREATE POLICY catering_packages_insert_check
    ON public.catering_packages
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'catering_packages' AND policyname = 'catering_packages_update_check'
  ) THEN
    CREATE POLICY catering_packages_update_check
    ON public.catering_packages
    FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_user_tenant_id())
    WITH CHECK (tenant_id = public.get_current_user_tenant_id());
  END IF;
END$$;

-- catering_menu_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'catering_menu_items' AND policyname = 'catering_menu_items_insert_check'
  ) THEN
    CREATE POLICY catering_menu_items_insert_check
    ON public.catering_menu_items
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'catering_menu_items' AND policyname = 'catering_menu_items_update_check'
  ) THEN
    CREATE POLICY catering_menu_items_update_check
    ON public.catering_menu_items
    FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_user_tenant_id())
    WITH CHECK (tenant_id = public.get_current_user_tenant_id());
  END IF;
END$$;

-- catering_menu_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'catering_menu_categories' AND policyname = 'catering_menu_categories_insert_check'
  ) THEN
    CREATE POLICY catering_menu_categories_insert_check
    ON public.catering_menu_categories
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'catering_menu_categories' AND policyname = 'catering_menu_categories_update_check'
  ) THEN
    CREATE POLICY catering_menu_categories_update_check
    ON public.catering_menu_categories
    FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_user_tenant_id())
    WITH CHECK (tenant_id = public.get_current_user_tenant_id());
  END IF;
END$$;

-- Make sure anon cannot write
REVOKE INSERT, UPDATE, DELETE ON public.catering_packages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.catering_menu_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.catering_menu_categories FROM anon;

COMMENT ON POLICY catering_packages_insert_check ON public.catering_packages IS 'Allow inserts only for authenticated users into their own tenant rows';
COMMENT ON POLICY catering_packages_update_check ON public.catering_packages IS 'Allow updates only for authenticated users on their own tenant rows';

