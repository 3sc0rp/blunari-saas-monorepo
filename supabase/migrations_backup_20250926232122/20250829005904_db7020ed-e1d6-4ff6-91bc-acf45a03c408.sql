-- Fix security issues: Restrict access to pricing_plans and cuisine_types tables

-- First, let's create the pricing_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price INTEGER NOT NULL,
  yearly_price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pricing_plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Drop the existing overly permissive policy on cuisine_types
DROP POLICY IF EXISTS "Anyone can view cuisine types" ON public.cuisine_types;

-- Create secure policies for pricing_plans
CREATE POLICY "Authenticated users can view active pricing plans"
ON public.pricing_plans
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_active = true
);

CREATE POLICY "Admins can manage pricing plans"
ON public.pricing_plans
FOR ALL
USING (has_employee_role('ADMIN'::employee_role))
WITH CHECK (has_employee_role('ADMIN'::employee_role));

-- Create secure policies for cuisine_types
CREATE POLICY "Authenticated users can view cuisine types"
ON public.cuisine_types
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage cuisine types"
ON public.cuisine_types
FOR ALL
USING (has_employee_role('ADMIN'::employee_role))
WITH CHECK (has_employee_role('ADMIN'::employee_role));

-- Add trigger for pricing_plans updated_at (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_pricing_plans_updated_at' 
        AND tgrelid = 'public.pricing_plans'::regclass
    ) THEN
        CREATE TRIGGER update_pricing_plans_updated_at
            BEFORE UPDATE ON public.pricing_plans
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

-- Insert some default pricing plans if the table is empty
INSERT INTO public.pricing_plans (name, slug, description, monthly_price, yearly_price, features, limits, is_popular, sort_order)
VALUES 
  (
    'Starter',
    'starter',
    'Perfect for small restaurants getting started',
    2900,
    29000,
    '["Basic booking system", "Email notifications", "Up to 5 tables", "Basic analytics"]'::jsonb,
    '{"tables": 5, "bookings_per_month": 500, "staff_accounts": 2}'::jsonb,
    false,
    1
  ),
  (
    'Professional',
    'professional', 
    'Ideal for growing restaurants',
    7900,
    79000,
    '["Advanced booking system", "SMS notifications", "Up to 20 tables", "Advanced analytics", "Custom branding", "API access"]'::jsonb,
    '{"tables": 20, "bookings_per_month": 2000, "staff_accounts": 10}'::jsonb,
    true,
    2
  ),
  (
    'Enterprise',
    'enterprise',
    'For large restaurant groups and chains',
    19900,
    199000, 
    '["Enterprise booking system", "Priority support", "Unlimited tables", "Custom integrations", "White-label solution", "Dedicated account manager"]'::jsonb,
    '{"tables": null, "bookings_per_month": null, "staff_accounts": null}'::jsonb,
    false,
    3
  )
ON CONFLICT (slug) DO NOTHING;