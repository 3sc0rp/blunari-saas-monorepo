-- Simplified catering system migration - Apply this manually in Supabase SQL editor

-- First, create the catering enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catering_status') THEN
        CREATE TYPE public.catering_status AS ENUM ('inquiry', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catering_service_type') THEN
        CREATE TYPE public.catering_service_type AS ENUM ('drop_off', 'buffet_setup', 'plated_service', 'stationed_service');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dietary_restriction') THEN
        CREATE TYPE public.dietary_restriction AS ENUM ('vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'kosher', 'halal', 'keto', 'paleo');
    END IF;
END $$;

-- Create catering packages table
CREATE TABLE IF NOT EXISTS public.catering_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person INTEGER NOT NULL, -- in cents
  min_guests INTEGER DEFAULT 10,
  max_guests INTEGER,
  service_types catering_service_type[] DEFAULT '{}',
  includes_setup BOOLEAN DEFAULT false,
  includes_service BOOLEAN DEFAULT false,
  includes_cleanup BOOLEAN DEFAULT false,
  dietary_accommodations dietary_restriction[] DEFAULT '{}',
  image_url TEXT,
  popular BOOLEAN DEFAULT false,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create catering orders table
CREATE TABLE IF NOT EXISTS public.catering_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES public.catering_packages(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Event details
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_start_time TIME NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  service_type catering_service_type NOT NULL DEFAULT 'drop_off',
  
  -- Customer information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Event location
  venue_name TEXT,
  venue_address JSONB NOT NULL,
  
  -- Pricing
  subtotal INTEGER DEFAULT 0, -- in cents
  tax_amount INTEGER DEFAULT 0,
  service_fee INTEGER DEFAULT 0,
  delivery_fee INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  deposit_amount INTEGER DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  
  -- Order status
  status catering_status NOT NULL DEFAULT 'inquiry',
  
  -- Additional information
  special_instructions TEXT,
  dietary_requirements dietary_restriction[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catering_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Tenant isolation for catering packages" ON public.catering_packages
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant isolation for catering orders" ON public.catering_orders
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_catering_packages_tenant ON public.catering_packages(tenant_id, available);
CREATE INDEX IF NOT EXISTS idx_catering_orders_tenant_date ON public.catering_orders(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_catering_orders_status ON public.catering_orders(status);

-- Add triggers for updated_at
CREATE TRIGGER update_catering_packages_updated_at
  BEFORE UPDATE ON public.catering_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catering_orders_updated_at
  BEFORE UPDATE ON public.catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add catering feature to existing tenants
INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, config)
SELECT 
  id as tenant_id,
  'catering' as feature_key,
  true as enabled,
  '{"max_advance_days": 365, "min_advance_days": 1, "default_deposit_percentage": 25, "auto_quote_enabled": true}'::jsonb as config
FROM public.tenants
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_features tf 
  WHERE tf.tenant_id = tenants.id AND tf.feature_key = 'catering'
);

-- Insert sample catering packages
INSERT INTO public.catering_packages (tenant_id, name, description, price_per_person, min_guests, max_guests, service_types, includes_setup, includes_service, includes_cleanup, dietary_accommodations, popular)
SELECT 
  t.id,
  'Corporate Lunch Package',
  'Perfect for business meetings and corporate events with a selection of gourmet sandwiches, salads, and beverages.',
  2500, -- $25.00
  10,
  50,
  ARRAY['buffet_setup', 'drop_off']::catering_service_type[],
  true,
  true,
  true,
  ARRAY['vegetarian', 'gluten_free']::dietary_restriction[],
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.catering_packages cp
  WHERE cp.tenant_id = t.id AND cp.name = 'Corporate Lunch Package'
);

INSERT INTO public.catering_packages (tenant_id, name, description, price_per_person, min_guests, max_guests, service_types, includes_setup, includes_service, includes_cleanup, dietary_accommodations, popular)
SELECT 
  t.id,
  'Wedding Reception Package',
  'Elegant dining experience for your special day with premium cuisine and full-service dining.',
  5500, -- $55.00
  50,
  200,
  ARRAY['plated_service', 'stationed_service']::catering_service_type[],
  true,
  true,
  true,
  ARRAY['vegetarian', 'vegan', 'gluten_free']::dietary_restriction[],
  false
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.catering_packages cp
  WHERE cp.tenant_id = t.id AND cp.name = 'Wedding Reception Package'
);

INSERT INTO public.catering_packages (tenant_id, name, description, price_per_person, min_guests, max_guests, service_types, includes_setup, includes_service, includes_cleanup, dietary_accommodations, popular)
SELECT 
  t.id,
  'Casual Party Package',
  'Fun and relaxed catering perfect for birthday parties, casual gatherings, and celebrations.',
  3200, -- $32.00
  15,
  75,
  ARRAY['buffet_setup', 'drop_off']::catering_service_type[],
  true,
  false,
  true,
  ARRAY['vegetarian', 'gluten_free', 'dairy_free']::dietary_restriction[],
  false
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.catering_packages cp
  WHERE cp.tenant_id = t.id AND cp.name = 'Casual Party Package'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Catering system successfully installed! 🎉';
    RAISE NOTICE 'Created tables: catering_packages, catering_orders';
    RAISE NOTICE 'Added sample packages for all tenants';
    RAISE NOTICE 'Catering feature enabled for all tenants';
END $$;
