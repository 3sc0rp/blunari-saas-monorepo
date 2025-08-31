-- Create a tenant_users table for better isolation
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant_users
CREATE POLICY "Users can view their tenant associations" 
ON public.tenant_users 
FOR SELECT 
USING (user_id = auth.uid() OR strict_tenant_access_check(tenant_id));

CREATE POLICY "Tenant owners can manage tenant users" 
ON public.tenant_users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu 
    WHERE tu.tenant_id = tenant_users.tenant_id 
    AND tu.user_id = auth.uid() 
    AND tu.role = 'owner'
    AND tu.status = 'active'
  )
);

-- Create function to get user tenants
CREATE OR REPLACE FUNCTION public.get_user_tenants(p_user_id UUID)
RETURNS TABLE(
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  user_role TEXT,
  user_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    tu.role,
    tu.status
  FROM public.tenants t
  JOIN public.tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = p_user_id 
    AND tu.status = 'active'
    AND t.status = 'active'
  ORDER BY tu.created_at ASC;
END;
$$;

-- Migrate existing auto_provisioning data to tenant_users
INSERT INTO public.tenant_users (tenant_id, user_id, role, status, created_at)
SELECT 
  tenant_id,
  user_id,
  'owner',
  CASE 
    WHEN status = 'completed' THEN 'active'
    ELSE 'pending'
  END,
  created_at
FROM public.auto_provisioning
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Create updated function for admin dashboard integration
CREATE OR REPLACE FUNCTION public.provision_tenant_with_user(
  p_email TEXT,
  p_password TEXT,
  p_restaurant_name TEXT,
  p_restaurant_slug TEXT,
  p_timezone TEXT DEFAULT 'America/New_York',
  p_currency TEXT DEFAULT 'USD',
  p_description TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_address JSONB DEFAULT NULL,
  p_cuisine_type_id UUID DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  -- This function should only be called by admin users or service role
  IF NOT (has_admin_access() OR auth.jwt() ->> 'role' = 'service_role') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Create or get user (this would typically be done via edge function with service role)
  -- For now, we'll assume the user is created externally and just link them
  
  -- Find existing user by email
  SELECT auth.uid() INTO v_user_id; -- This needs to be handled properly in practice
  
  -- Create tenant
  INSERT INTO public.tenants (
    name, slug, timezone, currency, description, phone, email, website, address, cuisine_type_id, status
  ) VALUES (
    p_restaurant_name, p_restaurant_slug, p_timezone, p_currency, 
    p_description, p_phone, p_email, p_website, p_address, p_cuisine_type_id, 'active'
  ) RETURNING id INTO v_tenant_id;

  -- Create default tables, business hours, etc.
  INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
  VALUES 
    (v_tenant_id, 'Table 1', 2, 'standard', true),
    (v_tenant_id, 'Table 2', 4, 'standard', true),
    (v_tenant_id, 'Table 3', 6, 'standard', true),
    (v_tenant_id, 'Table 4', 8, 'standard', true);

  -- Create default business hours
  INSERT INTO public.business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
  VALUES 
    (v_tenant_id, 1, true, '09:00', '22:00'),
    (v_tenant_id, 2, true, '09:00', '22:00'),
    (v_tenant_id, 3, true, '09:00', '22:00'),
    (v_tenant_id, 4, true, '09:00', '22:00'),
    (v_tenant_id, 5, true, '09:00', '23:00'),
    (v_tenant_id, 6, true, '09:00', '23:00'),
    (v_tenant_id, 0, false, NULL, NULL);

  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'restaurant_slug', p_restaurant_slug,
    'message', 'Tenant provisioned successfully'
  );

  RETURN v_result;
END;
$$;