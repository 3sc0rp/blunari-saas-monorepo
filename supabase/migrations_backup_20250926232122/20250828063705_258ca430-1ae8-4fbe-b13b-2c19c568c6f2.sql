-- Create user profiles table with restaurant owner information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Create automatic tenant provisioning table
CREATE TABLE public.auto_provisioning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  restaurant_name TEXT NOT NULL,
  restaurant_slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on auto_provisioning
ALTER TABLE public.auto_provisioning ENABLE ROW LEVEL SECURITY;

-- Create policies for auto_provisioning
CREATE POLICY "Users can view their own provisioning" 
ON public.auto_provisioning 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own provisioning" 
ON public.auto_provisioning 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function for automatic tenant provisioning
CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_user_id UUID,
  p_restaurant_name TEXT,
  p_restaurant_slug TEXT,
  p_timezone TEXT DEFAULT 'America/New_York',
  p_currency TEXT DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  provisioning_id UUID;
BEGIN
  -- Create auto_provisioning record
  INSERT INTO public.auto_provisioning (
    user_id, restaurant_name, restaurant_slug, timezone, currency, status
  ) VALUES (
    p_user_id, p_restaurant_name, p_restaurant_slug, p_timezone, p_currency, 'processing'
  ) RETURNING id INTO provisioning_id;

  -- Create tenant
  INSERT INTO public.tenants (name, slug, timezone, currency, status)
  VALUES (p_restaurant_name, p_restaurant_slug, p_timezone, p_currency, 'active')
  RETURNING id INTO new_tenant_id;

  -- Update provisioning record with tenant_id
  UPDATE public.auto_provisioning 
  SET tenant_id = new_tenant_id, status = 'completed', completed_at = now()
  WHERE id = provisioning_id;

  -- Enable default features for new tenant
  INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, source)
  VALUES 
    (new_tenant_id, 'basic_booking', true, 'plan'),
    (new_tenant_id, 'email_notifications', true, 'plan'),
    (new_tenant_id, 'basic_analytics', true, 'plan'),
    (new_tenant_id, 'widget_integration', true, 'plan');

  -- Create default tables for the restaurant
  INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
  VALUES 
    (new_tenant_id, 'Table 1', 2, 'standard', true),
    (new_tenant_id, 'Table 2', 2, 'standard', true),
    (new_tenant_id, 'Table 3', 4, 'standard', true),
    (new_tenant_id, 'Table 4', 4, 'standard', true),
    (new_tenant_id, 'Table 5', 6, 'standard', true),
    (new_tenant_id, 'Table 6', 6, 'standard', true),
    (new_tenant_id, 'Table 7', 8, 'large', true),
    (new_tenant_id, 'Table 8', 8, 'large', true);

  RETURN new_tenant_id;
END;
$$;

-- Create function to get user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant(p_user_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  tenant_status TEXT,
  provisioning_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name, 
    t.slug as tenant_slug,
    t.status as tenant_status,
    ap.status as provisioning_status
  FROM public.auto_provisioning ap
  JOIN public.tenants t ON t.id = ap.tenant_id
  WHERE ap.user_id = p_user_id
  ORDER BY ap.created_at DESC
  LIMIT 1;
END;
$$;

-- Create updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();