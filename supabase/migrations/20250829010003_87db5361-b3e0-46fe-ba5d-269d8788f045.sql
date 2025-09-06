-- Fix security issues: Secure access to pricing_plans and cuisine_types tables
-- This focuses only on the policy changes without touching table structure

-- Drop the existing overly permissive policy on cuisine_types
DROP POLICY IF EXISTS "Anyone can view cuisine types" ON public.cuisine_types;

-- Create secure policies for pricing_plans (if table exists)
DO $$
BEGIN
    -- Only create policies if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pricing_plans') THEN
        -- Drop any existing public policies and create secure ones
        DROP POLICY IF EXISTS "Public access to pricing plans" ON public.pricing_plans;
        DROP POLICY IF EXISTS "Anyone can view pricing plans" ON public.pricing_plans;
        
        -- Enable RLS on pricing_plans if not already enabled
        ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
        
        -- Create secure policy for authenticated users only
        DROP POLICY IF EXISTS "Authenticated users can view active pricing plans" ON public.pricing_plans;
        CREATE POLICY "Authenticated users can view active pricing plans"
        ON public.pricing_plans
        FOR SELECT
        USING (
          auth.uid() IS NOT NULL 
          AND is_active = true
        );

        -- Allow admins to manage pricing plans
        DROP POLICY IF EXISTS "Admins can manage pricing plans" ON public.pricing_plans;
        CREATE POLICY "Admins can manage pricing plans"
        ON public.pricing_plans
        FOR ALL
        USING (has_employee_role('ADMIN'::employee_role))
        WITH CHECK (has_employee_role('ADMIN'::employee_role));
    END IF;
END $$;

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