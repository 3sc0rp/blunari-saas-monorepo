-- Fix tenant slug mapping for demo tenant
-- This migration ensures the demo tenant can be accessed via 'demo' slug

-- Update the existing demo tenant to use 'demo' as slug for easier access
UPDATE public.tenants 
SET slug = 'demo'
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid;

-- Also insert the kpizza tenant for testing (if not exists)
INSERT INTO public.tenants (id, name, slug, status, timezone, currency, description, email, primary_color, secondary_color)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  'K Pizza Restaurant', 
  'kpizza',
  'active',
  'America/New_York',
  'USD',
  'K Pizza - Demo restaurant for testing',
  'demo@kpizza.com',
  '#dc2626',
  '#fbbf24'
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color;

-- Create default tables for kpizza
INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active, x_position, y_position)
VALUES
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Table 1', 2, 'standard', true, 2.0, 2.0),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Table 2', 4, 'standard', true, 4.0, 2.0),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Table 3', 4, 'standard', true, 6.0, 2.0),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Table 4', 6, 'large', true, 2.0, 4.0),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Table 5', 6, 'large', true, 4.0, 4.0),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Booth 1', 4, 'booth', true, 1.0, 6.0),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Booth 2', 4, 'booth', true, 3.0, 6.0)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Create sample menu items for kpizza
INSERT INTO public.menu_items (tenant_id, name, description, price, category, active)
VALUES
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Margherita Pizza', 'Classic pizza with tomato, mozzarella, and basil', 18.99, 'Pizza', true),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Pepperoni Pizza', 'Traditional pepperoni with mozzarella cheese', 21.99, 'Pizza', true),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Caesar Salad', 'Fresh romaine lettuce with caesar dressing', 12.99, 'Salads', true),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'Garlic Bread', 'Toasted bread with garlic butter', 8.99, 'Appetizers', true)
ON CONFLICT (tenant_id, name) DO NOTHING;
