-- Create cuisine_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cuisine_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.cuisine_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view cuisine types" 
ON public.cuisine_types 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage cuisine types" 
ON public.cuisine_types 
FOR ALL 
USING (has_employee_role('ADMIN'::employee_role))
WITH CHECK (has_employee_role('ADMIN'::employee_role));

-- Insert default cuisine types
INSERT INTO public.cuisine_types (name, description, icon) VALUES
  ('Italian', 'Traditional Italian cuisine', '🍝'),
  ('Mexican', 'Authentic Mexican dishes', '🌮'),
  ('Chinese', 'Traditional Chinese cuisine', '🥟'),
  ('Japanese', 'Japanese sushi and traditional dishes', '🍣'),
  ('American', 'Classic American fare', '🍔'),
  ('French', 'French culinary traditions', '🥖'),
  ('Indian', 'Traditional Indian spices and flavors', '🍛'),
  ('Thai', 'Authentic Thai cuisine', '🍜'),
  ('Mediterranean', 'Fresh Mediterranean dishes', '🫒'),
  ('BBQ', 'Barbecue and grilled specialties', '🍖')
ON CONFLICT (name) DO NOTHING;

-- Create pricing_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price INTEGER NOT NULL,
  yearly_price INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  max_tables INTEGER,
  max_bookings_per_month INTEGER,
  max_staff_accounts INTEGER,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active pricing plans" 
ON public.pricing_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage pricing plans" 
ON public.pricing_plans 
FOR ALL 
USING (has_employee_role('ADMIN'::employee_role))
WITH CHECK (has_employee_role('ADMIN'::employee_role));

-- Insert default pricing plans
INSERT INTO public.pricing_plans (name, slug, description, monthly_price, yearly_price, features, max_tables, max_bookings_per_month, max_staff_accounts, is_popular) VALUES
  ('Starter', 'starter', 'Perfect for small restaurants just getting started', 2900, 29900, '["Online bookings", "Basic analytics", "Email notifications", "Mobile-friendly widget", "Customer database"]'::jsonb, 10, 300, 3, false),
  ('Growth', 'growth', 'Great for growing restaurants with more features', 5900, 59900, '["Everything in Starter", "Advanced analytics", "SMS notifications", "POS integration", "Custom branding", "Priority support"]'::jsonb, 25, 1000, 10, true),
  ('Enterprise', 'enterprise', 'For large restaurants with advanced needs', 9900, 99900, '["Everything in Growth", "Multi-location support", "API access", "Custom integrations", "Dedicated support", "White-label options"]'::jsonb, null, null, null, false)
ON CONFLICT (slug) DO NOTHING;