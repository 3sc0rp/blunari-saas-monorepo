-- Sample Catering Data for Testing
-- Run this in your Supabase SQL editor after the catering migration
-- Replace 'your-tenant-id-here' with an actual tenant ID from your tenants table

-- First, let's get a tenant ID to use (replace this with your actual tenant ID)
-- SELECT id, name FROM tenants WHERE active = true LIMIT 1;

-- Sample catering event types
INSERT INTO public.catering_event_types (tenant_id, name, description, active) VALUES
('your-tenant-id-here', 'Corporate Event', 'Business meetings, conferences, and corporate gatherings', true),
('your-tenant-id-here', 'Wedding', 'Wedding ceremonies and receptions', true),
('your-tenant-id-here', 'Birthday Party', 'Birthday celebrations and parties', true),
('your-tenant-id-here', 'Holiday Event', 'Holiday parties and seasonal celebrations', true);

-- Sample catering menu categories
INSERT INTO public.catering_menu_categories (tenant_id, name, description, display_order, active) VALUES
('your-tenant-id-here', 'Appetizers', 'Starter dishes and finger foods', 1, true),
('your-tenant-id-here', 'Main Courses', 'Primary entree options', 2, true),
('your-tenant-id-here', 'Sides', 'Side dishes and accompaniments', 3, true),
('your-tenant-id-here', 'Desserts', 'Sweet treats and dessert options', 4, true),
('your-tenant-id-here', 'Beverages', 'Drinks and beverage service', 5, true);

-- Sample catering menu items (you'll need to update category_id with actual IDs)
INSERT INTO public.catering_menu_items (tenant_id, category_id, name, description, base_price, unit, dietary_restrictions, active) VALUES
('your-tenant-id-here', (SELECT id FROM catering_menu_categories WHERE name = 'Appetizers' AND tenant_id = 'your-tenant-id-here' LIMIT 1), 
 'Bruschetta Platter', 'Fresh tomato, basil, and mozzarella on toasted baguette slices', 12.99, 'per person', ARRAY['vegetarian'], true),

('your-tenant-id-here', (SELECT id FROM catering_menu_categories WHERE name = 'Main Courses' AND tenant_id = 'your-tenant-id-here' LIMIT 1), 
 'Grilled Chicken Breast', 'Herb-marinated grilled chicken with seasonal vegetables', 24.99, 'per person', ARRAY[]::text[], true),

('your-tenant-id-here', (SELECT id FROM catering_menu_categories WHERE name = 'Main Courses' AND tenant_id = 'your-tenant-id-here' LIMIT 1), 
 'Vegetarian Pasta Primavera', 'Fresh vegetables tossed with penne pasta in garlic olive oil', 19.99, 'per person', ARRAY['vegetarian'], true),

('your-tenant-id-here', (SELECT id FROM catering_menu_categories WHERE name = 'Sides' AND tenant_id = 'your-tenant-id-here' LIMIT 1), 
 'Caesar Salad', 'Crisp romaine lettuce with parmesan cheese and croutons', 8.99, 'per person', ARRAY['vegetarian'], true),

('your-tenant-id-here', (SELECT id FROM catering_menu_categories WHERE name = 'Desserts' AND tenant_id = 'your-tenant-id-here' LIMIT 1), 
 'Chocolate Cake', 'Rich chocolate cake with chocolate ganache', 6.99, 'per person', ARRAY['vegetarian'], true);

-- Sample catering packages
INSERT INTO public.catering_packages (tenant_id, name, description, price_per_person, min_guests, max_guests, includes_setup, includes_service, includes_cleanup, dietary_accommodations, popular, active) VALUES
('your-tenant-id-here', 'Corporate Lunch Package', 'Perfect for business meetings and corporate events. Includes appetizer, main course, side, and dessert.', 35.99, 10, 100, true, false, false, ARRAY['vegetarian', 'gluten_free'], true, true),

('your-tenant-id-here', 'Premium Event Package', 'Full-service catering with setup, service, and cleanup included. Ideal for special occasions.', 65.99, 25, 150, true, true, true, ARRAY['vegetarian', 'vegan', 'gluten_free'], true, true),

('your-tenant-id-here', 'Basic Pickup Package', 'Simple and affordable option for smaller gatherings. Customer pickup only.', 22.99, 5, 50, false, false, false, ARRAY['vegetarian'], false, true),

('your-tenant-id-here', 'Wedding Package', 'Elegant catering solution for your special day with premium ingredients and full service.', 89.99, 50, 300, true, true, true, ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], true, true);

-- Sample package items (linking packages to menu items)
-- Corporate Lunch Package items
INSERT INTO public.catering_package_items (package_id, menu_item_id, quantity_per_person, is_included, additional_cost_per_person) VALUES
((SELECT id FROM catering_packages WHERE name = 'Corporate Lunch Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Bruschetta Platter' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 1, true, 0),

((SELECT id FROM catering_packages WHERE name = 'Corporate Lunch Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Grilled Chicken Breast' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 1, true, 0),

((SELECT id FROM catering_packages WHERE name = 'Corporate Lunch Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Caesar Salad' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 1, true, 0);

-- Premium Event Package items
INSERT INTO public.catering_package_items (package_id, menu_item_id, quantity_per_person, is_included, additional_cost_per_person) VALUES
((SELECT id FROM catering_packages WHERE name = 'Premium Event Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Bruschetta Platter' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 1, true, 0),

((SELECT id FROM catering_packages WHERE name = 'Premium Event Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Grilled Chicken Breast' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 1, true, 0),

((SELECT id FROM catering_packages WHERE name = 'Premium Event Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Vegetarian Pasta Primavera' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 0.5, true, 0),

((SELECT id FROM catering_packages WHERE name = 'Premium Event Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Caesar Salad' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 1, true, 0),

((SELECT id FROM catering_packages WHERE name = 'Premium Event Package' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 (SELECT id FROM catering_menu_items WHERE name = 'Chocolate Cake' AND tenant_id = 'your-tenant-id-here' LIMIT 1),
 1, true, 0);

-- Add some equipment items
INSERT INTO public.catering_equipment (tenant_id, name, description, category, quantity_available, rental_price_per_day, active) VALUES
('your-tenant-id-here', 'Round Tables (8-person)', 'Standard 8-person round dining tables', 'Tables', 20, 15.00, true),
('your-tenant-id-here', 'Chiavari Chairs', 'Elegant chiavari chairs in gold finish', 'Seating', 100, 3.50, true),
('your-tenant-id-here', 'White Linens', 'Premium white table linens (120" round)', 'Linens', 30, 8.00, true),
('your-tenant-id-here', 'Portable Bar Setup', 'Complete portable bar with backdrop', 'Bar Equipment', 3, 150.00, true);

-- Note: Remember to replace 'your-tenant-id-here' with your actual tenant ID!
-- You can find your tenant ID with: SELECT id, name FROM tenants WHERE active = true;

COMMENT ON SCRIPT IS 'Sample catering data for testing - remember to replace tenant_id placeholders';
