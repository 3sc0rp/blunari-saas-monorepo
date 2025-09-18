-- Add missing RLS policies for pricing_plans table
DO $$ 
BEGIN
    -- Check if pricing plans policies exist before creating them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pricing_plans' 
        AND policyname = 'Anyone can view active pricing plans'
    ) THEN
        CREATE POLICY "Anyone can view active pricing plans" 
        ON public.pricing_plans 
        FOR SELECT 
        USING (is_active = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pricing_plans' 
        AND policyname = 'Admins can manage pricing plans'
    ) THEN
        CREATE POLICY "Admins can manage pricing plans" 
        ON public.pricing_plans 
        FOR ALL 
        USING (has_employee_role('ADMIN'::employee_role))
        WITH CHECK (has_employee_role('ADMIN'::employee_role));
    END IF;
END $$;