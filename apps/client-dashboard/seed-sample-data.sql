-- Sample data for testing Command Center functionality
-- Insert demo restaurant tables

DO $$
DECLARE
    demo_tenant_id UUID;
BEGIN
    -- Get demo tenant ID (assuming tenant exists with slug 'demo')
    SELECT id INTO demo_tenant_id FROM tenants WHERE slug = 'demo' LIMIT 1;
    
    IF demo_tenant_id IS NOT NULL THEN
        -- Insert sample restaurant tables if they don't exist
        INSERT INTO restaurant_tables (tenant_id, name, capacity, active, table_type, position_x, position_y)
        VALUES 
            (demo_tenant_id, 'Table 1', 4, true, 'standard', 100, 100),
            (demo_tenant_id, 'Table 2', 2, true, 'standard', 200, 100),
            (demo_tenant_id, 'Table 3', 6, true, 'large', 300, 100),
            (demo_tenant_id, 'Table 4', 4, true, 'standard', 100, 200),
            (demo_tenant_id, 'Table 5', 2, true, 'small', 200, 200),
            (demo_tenant_id, 'Bar 1', 8, true, 'bar', 300, 200)
        ON CONFLICT DO NOTHING;

        -- Insert sample bookings for today
        INSERT INTO bookings (
            tenant_id, 
            guest_name, 
            guest_email, 
            guest_phone,
            booking_time, 
            party_size, 
            status, 
            duration_minutes,
            deposit_required,
            deposit_paid,
            table_id
        ) VALUES 
            (demo_tenant_id, 'John Smith', 'john@example.com', '+1234567890', NOW() + INTERVAL '2 hours', 4, 'confirmed', 90, false, false, (SELECT id FROM restaurant_tables WHERE tenant_id = demo_tenant_id AND name = 'Table 1' LIMIT 1)),
            (demo_tenant_id, 'Sarah Johnson', 'sarah@example.com', '+1234567891', NOW() + INTERVAL '3 hours', 2, 'confirmed', 60, false, false, (SELECT id FROM restaurant_tables WHERE tenant_id = demo_tenant_id AND name = 'Table 2' LIMIT 1)),
            (demo_tenant_id, 'Mike Wilson', 'mike@example.com', '+1234567892', NOW() + INTERVAL '1 hour', 6, 'seated', 120, false, false, (SELECT id FROM restaurant_tables WHERE tenant_id = demo_tenant_id AND name = 'Table 3' LIMIT 1)),
            (demo_tenant_id, 'Emily Brown', 'emily@example.com', '+1234567893', NOW() + INTERVAL '4 hours', 4, 'confirmed', 90, true, true, (SELECT id FROM restaurant_tables WHERE tenant_id = demo_tenant_id AND name = 'Table 4' LIMIT 1)),
            (demo_tenant_id, 'David Lee', 'david@example.com', '+1234567894', NOW() - INTERVAL '1 hour', 2, 'completed', 90, false, false, (SELECT id FROM restaurant_tables WHERE tenant_id = demo_tenant_id AND name = 'Table 5' LIMIT 1))
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample data inserted for tenant: %', demo_tenant_id;
    ELSE
        RAISE NOTICE 'Demo tenant not found. Please create tenant with slug "demo" first.';
    END IF;
END $$;
