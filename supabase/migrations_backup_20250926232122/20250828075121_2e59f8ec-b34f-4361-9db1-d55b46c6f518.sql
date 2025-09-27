-- Enhanced schema for comprehensive restaurant provisioning

-- Create cuisine types table
CREATE TABLE public.cuisine_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pricing plans table
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price INTEGER NOT NULL, -- in cents
  yearly_price INTEGER, -- in cents (optional discount)
  stripe_price_id TEXT,
  stripe_yearly_price_id TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_tables INTEGER,
  max_bookings_per_month INTEGER,
  max_staff_accounts INTEGER,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create business hours table
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, day_of_week)
);

-- Create party size configurations table
CREATE TABLE public.party_size_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  min_party_size INTEGER NOT NULL DEFAULT 1,
  max_party_size INTEGER NOT NULL DEFAULT 12,
  default_party_size INTEGER NOT NULL DEFAULT 2,
  allow_large_parties BOOLEAN NOT NULL DEFAULT true,
  large_party_threshold INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.pricing_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due, unpaid
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced tenants table with additional fields
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS cuisine_type_id UUID REFERENCES public.cuisine_types(id),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Enable Row Level Security
ALTER TABLE public.cuisine_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_size_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cuisine_types (public read)
CREATE POLICY "Anyone can view cuisine types" ON public.cuisine_types
FOR SELECT USING (true);

-- RLS Policies for pricing_plans (public read)
CREATE POLICY "Anyone can view active pricing plans" ON public.pricing_plans
FOR SELECT USING (is_active = true);

-- RLS Policies for business_hours
CREATE POLICY "Tenant business hours isolation" ON public.business_hours
FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- RLS Policies for party_size_configs  
CREATE POLICY "Tenant party size configs isolation" ON public.party_size_configs
FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- RLS Policies for subscriptions
CREATE POLICY "Tenant subscriptions isolation" ON public.subscriptions
FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Insert default cuisine types
INSERT INTO public.cuisine_types (name, description, icon) VALUES
('Italian', 'Traditional and modern Italian cuisine', '🍝'),
('American', 'Classic American dishes and comfort food', '🍔'),
('Mexican', 'Authentic Mexican and Tex-Mex cuisine', '🌮'),
('Asian', 'Asian fusion and traditional dishes', '🥢'),
('French', 'Classic French cuisine and bistro fare', '🥖'),
('Mediterranean', 'Fresh Mediterranean and Middle Eastern', '🫒'),
('Seafood', 'Fresh seafood and coastal cuisine', '🦐'),
('Steakhouse', 'Premium steaks and grilled meats', '🥩'),
('Vegetarian', 'Plant-based and vegetarian options', '🥗'),
('Fast Casual', 'Quick service with quality ingredients', '🍕'),
('Fine Dining', 'Upscale dining experience', '🍾'),
('Cafe', 'Coffee, pastries, and light meals', '☕'),
('Bar & Grill', 'Casual dining with full bar', '🍻'),
('International', 'Global cuisine and fusion', '🌍'),
('Other', 'Specialty or unique cuisine types', '🍴');

-- Insert default pricing plans
INSERT INTO public.pricing_plans (name, slug, description, monthly_price, yearly_price, features, max_tables, max_bookings_per_month, max_staff_accounts, is_popular) VALUES
('Starter', 'starter', 'Perfect for small restaurants getting started', 2900, 29000, '["Basic booking system", "Email notifications", "Up to 10 tables", "500 bookings/month", "Basic analytics", "Widget integration"]'::jsonb, 10, 500, 2, false),
('Growth', 'growth', 'Ideal for growing restaurants with advanced needs', 7900, 79000, '["Everything in Starter", "Advanced analytics", "Deposit management", "POS integration", "Custom branding", "Priority support", "Up to 25 tables", "2000 bookings/month"]'::jsonb, 25, 2000, 5, true),
('Enterprise', 'enterprise', 'Full-featured solution for restaurant groups', 19900, 199000, '["Everything in Growth", "Multi-location support", "Advanced reporting", "Custom integrations", "Dedicated support", "Unlimited tables", "Unlimited bookings", "White-label options"]'::jsonb, null, null, null, false);

-- Create updated_at triggers
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_party_size_configs_updated_at
  BEFORE UPDATE ON public.party_size_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();