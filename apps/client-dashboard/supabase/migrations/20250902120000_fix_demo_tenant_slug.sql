-- Fix tenant slug mapping for demo tenant
-- This migration ensures the demo tenant can be accessed via 'demo' slug

-- Update the existing demo tenant to use 'demo' as slug for easier access
-- Handle both possible existing names
UPDATE public.tenants 
SET slug = 'demo'
WHERE (name ILIKE '%demo%' OR slug ILIKE '%demo%') 
  AND slug != 'demo' 
  AND status = 'active';

-- Update or insert the kpizza tenant (handle existing case)
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
) ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color
WHERE tenants.slug = 'kpizza';

-- Create default tables for kpizza (only if they don't exist)
INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
SELECT 
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  table_name,
  capacity,
  table_type,
  true
FROM (VALUES
  ('Table 1', 2, 'standard'),
  ('Table 2', 4, 'standard'),
  ('Table 3', 4, 'standard'),
  ('Table 4', 6, 'large'),
  ('Table 5', 6, 'large'),
  ('Booth 1', 4, 'booth'),
  ('Booth 2', 4, 'booth')
) AS tables(table_name, capacity, table_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.restaurant_tables 
  WHERE tenant_id = '123e4567-e89b-12d3-a456-426614174000'::uuid 
  AND name = table_name
);

-- Create sample menu items for kpizza (only if they don't exist)
INSERT INTO public.menu_items (tenant_id, name, description, price, category, active)
SELECT 
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  item_name,
  description,
  price,
  category,
  true
FROM (VALUES
  ('Margherita Pizza', 'Classic pizza with tomato, mozzarella, and basil', 18.99, 'Pizza'),
  ('Pepperoni Pizza', 'Traditional pepperoni with mozzarella cheese', 21.99, 'Pizza'),
  ('Caesar Salad', 'Fresh romaine lettuce with caesar dressing', 12.99, 'Salads'),
  ('Garlic Bread', 'Toasted bread with garlic butter', 8.99, 'Appetizers')
) AS items(item_name, description, price, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items 
  WHERE tenant_id = '123e4567-e89b-12d3-a456-426614174000'::uuid 
  AND name = item_name
);
