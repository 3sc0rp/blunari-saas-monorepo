-- Fix foreign key relationship for domains table
ALTER TABLE public.domains 
ADD CONSTRAINT domains_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add branding columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1e3a8a',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#f59e0b';

-- Create more permissive RLS policies for public tenant access via domain
DROP POLICY IF EXISTS "Public access to tenant by domain" ON public.tenants;
CREATE POLICY "Public access to tenant by domain" 
ON public.tenants 
FOR SELECT 
TO public
USING (status = 'active');

-- Allow public access to domains table for tenant lookup
DROP POLICY IF EXISTS "Public access to domains" ON public.domains;
CREATE POLICY "Public access to domains" 
ON public.domains 
FOR SELECT 
TO public
USING (status = 'active');

-- Create sample tenant data for testing
INSERT INTO public.tenants (id, name, slug, status, timezone, currency, description, email, primary_color, secondary_color)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'Demo Restaurant',
  'demo-restaurant',
  'active',
  'America/New_York',
  'USD',
  'A demo restaurant for testing',
  'demo@restaurant.com',
  '#1e3a8a',
  '#f59e0b'
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color;

-- Create default tables for the demo restaurant
INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
VALUES 
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Table 1', 2, 'standard', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Table 2', 4, 'standard', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Table 3', 6, 'standard', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Table 4', 8, 'standard', true)
ON CONFLICT DO NOTHING;