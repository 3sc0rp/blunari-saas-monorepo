-- Safe Catering Migration - Works without user_roles dependency
-- Run this in your Supabase SQL Editor

-- First, check if user_roles exists, if not create minimal version
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        CREATE TABLE public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            tenant_id UUID NOT NULL,
            role TEXT NOT NULL DEFAULT 'customer',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view own roles" ON public.user_roles
            FOR SELECT USING (user_id = auth.uid());
            
        CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
        CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
    END IF;
END $$;

-- Catering-specific enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catering_status') THEN
        CREATE TYPE public.catering_status AS ENUM ('inquiry', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catering_service_type') THEN
        CREATE TYPE public.catering_service_type AS ENUM ('pickup', 'delivery', 'full_service', 'drop_off');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'menu_item_category') THEN
        CREATE TYPE public.menu_item_category AS ENUM ('appetizers', 'mains', 'desserts', 'beverages', 'salads', 'sides', 'packages');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dietary_restriction') THEN
        CREATE TYPE public.dietary_restriction AS ENUM ('vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'kosher', 'halal');
    END IF;
END $$;

-- Create catering_packages table first (most important for basic functionality)
CREATE TABLE IF NOT EXISTS public.catering_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person INTEGER NOT NULL, -- in cents
  min_guests INTEGER DEFAULT 10,
  max_guests INTEGER,
  includes_setup BOOLEAN DEFAULT false,
  includes_service BOOLEAN DEFAULT false,
  includes_cleanup BOOLEAN DEFAULT false,
  dietary_accommodations dietary_restriction[] DEFAULT '{}',
  image_url TEXT,
  popular BOOLEAN DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create catering_orders table
CREATE TABLE IF NOT EXISTS public.catering_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  package_id UUID REFERENCES public.catering_packages(id),
  customer_id UUID REFERENCES auth.users(id),
  
  -- Event details
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_start_time TIME NOT NULL,
  event_end_time TIME,
  event_duration_hours DECIMAL(3,1) DEFAULT 4.0,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  
  -- Customer information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  company_name TEXT,
  
  -- Event location
  venue_name TEXT,
  venue_address JSONB NOT NULL,
  delivery_instructions TEXT,
  
  -- Service details
  service_type catering_service_type NOT NULL DEFAULT 'delivery',
  setup_required BOOLEAN DEFAULT false,
  service_staff_required INTEGER DEFAULT 0,
  
  -- Pricing
  subtotal INTEGER NOT NULL DEFAULT 0, -- in cents
  tax_amount INTEGER DEFAULT 0,
  service_fee INTEGER DEFAULT 0,
  delivery_fee INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_paid_at TIMESTAMPTZ,
  
  -- Order status and tracking
  status catering_status NOT NULL DEFAULT 'inquiry',
  quoted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  
  -- Additional information
  special_instructions TEXT,
  dietary_requirements TEXT,
  occasion TEXT,
  referral_source TEXT,
  marketing_consent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catering_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_orders ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies that work with or without proper user_roles
CREATE POLICY "Anyone can view active catering packages" ON public.catering_packages
  FOR SELECT USING (active = true);

CREATE POLICY "Users can view own catering orders" ON public.catering_orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can insert own catering orders" ON public.catering_orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update own catering orders" ON public.catering_orders
  FOR UPDATE USING (customer_id = auth.uid());

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_catering_packages_tenant ON public.catering_packages(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_catering_orders_customer ON public.catering_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_catering_orders_tenant_date ON public.catering_orders(tenant_id, event_date);

-- Insert sample catering packages for testing
INSERT INTO public.catering_packages (tenant_id, name, description, price_per_person, min_guests, popular, includes_setup, includes_service)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Executive Business Lunch', 'Professional catering for corporate meetings and business events. Includes gourmet sandwiches, salads, and beverages.', 2850, 10, true, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Wedding Reception Package', 'Elegant three-course dining experience perfect for wedding celebrations. Full service with setup and cleanup included.', 8500, 25, true, true, true),
  ('00000000-0000-0000-0000-000000000001', 'Cocktail Party Package', 'Sophisticated appetizers and hors d''oeuvres for networking events and cocktail parties.', 4200, 15, false, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Holiday Celebration Menu', 'Festive catering for holiday parties and seasonal celebrations. Traditional favorites with a gourmet twist.', 5500, 20, false, false, false)
ON CONFLICT (id) DO NOTHING;

-- Add catering to tenant features if the table exists (without config column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_features' AND table_schema = 'public') THEN
        -- Check if config column exists before using it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_features' AND column_name = 'config') THEN
            INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, config)
            SELECT 
              '00000000-0000-0000-0000-000000000001' as tenant_id,
              'catering' as feature_key,
              true as enabled,
              '{"max_advance_days": 365, "min_advance_days": 1, "default_deposit_percentage": 25, "auto_quote_enabled": true}'::jsonb as config
            WHERE NOT EXISTS (
              SELECT 1 FROM public.tenant_features tf 
              WHERE tf.tenant_id = '00000000-0000-0000-000000000001' AND tf.feature_key = 'catering'
            );
        ELSE
            INSERT INTO public.tenant_features (tenant_id, feature_key, enabled)
            SELECT 
              '00000000-0000-0000-0000-000000000001' as tenant_id,
              'catering' as feature_key,
              true as enabled
            WHERE NOT EXISTS (
              SELECT 1 FROM public.tenant_features tf 
              WHERE tf.tenant_id = '00000000-0000-0000-0000-000000000001' AND tf.feature_key = 'catering'
            );
        END IF;
    END IF;
END $$;

-- Success message
SELECT 'Catering system successfully installed! You can now access catering packages.' as result;
