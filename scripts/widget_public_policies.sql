-- Public tenant lookup + safe widget policies
-- Apply in SQL editor if service role key not available to edge function.
-- 1. Allow public (anon) SELECT for active tenants (non-sensitive metadata only)
DROP POLICY IF EXISTS "public_widget_tenant_lookup" ON public.tenants;
CREATE POLICY "public_widget_tenant_lookup" ON public.tenants
  FOR SELECT USING (status = 'active');

-- 2. Allow public select on restaurant_tables for availability
DROP POLICY IF EXISTS "public_widget_tables_lookup" ON public.restaurant_tables;
CREATE POLICY "public_widget_tables_lookup" ON public.restaurant_tables
  FOR SELECT USING (true);

-- 3. Allow public select on business_hours table if exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_hours' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "public_widget_business_hours" ON public.business_hours;
    CREATE POLICY "public_widget_business_hours" ON public.business_hours FOR SELECT USING (true);
  END IF;
END $$;

-- 4. (Optional) Limit public exposure later by adding a boolean column 'publicly_listed' and modifying policies:
-- ALTER TABLE public.tenants ADD COLUMN publicly_listed BOOLEAN NOT NULL DEFAULT false;
-- Then change policy USING (status='active' AND publicly_listed);

-- 5. (Optional) Add an environment mapping for emergency fallback (set in function config):
-- PUBLIC_TENANT_FALLBACKS = {"demo":{"id":"<uuid>","name":"Demo Restaurant","timezone":"UTC","currency":"USD"}}

-- NOTE: Revoke once proper token-based auth is restored.
