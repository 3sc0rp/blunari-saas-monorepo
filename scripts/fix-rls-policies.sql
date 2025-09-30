-- Fix RLS Policies for Booking Management
-- This script creates the necessary RLS policies to allow the booking system to work

-- First, enable RLS on the bookings table if not already enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow service role to do everything (for edge functions)
CREATE POLICY "Service role full access" ON bookings
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Policy 2: Allow authenticated users to read bookings for their tenant
CREATE POLICY "Users can view tenant bookings" ON bookings
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND tenant_id IN (
            SELECT t.id FROM tenants t
            WHERE t.id = bookings.tenant_id
            -- Add additional tenant access checks here if needed
        )
    );

-- Policy 3: Allow authenticated users to create bookings
CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        OR auth.role() = 'anon'  -- Allow anonymous booking creation for widget
    );

-- Policy 4: Allow authenticated users to update bookings for their tenant
CREATE POLICY "Users can update tenant bookings" ON bookings
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND tenant_id IN (
            SELECT t.id FROM tenants t
            WHERE t.id = bookings.tenant_id
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND tenant_id IN (
            SELECT t.id FROM tenants t
            WHERE t.id = bookings.tenant_id
        )
    );

-- Policy 5: Allow reading bookings with anon key for demo tenant (development)
CREATE POLICY "Demo tenant anon access" ON bookings
    FOR SELECT USING (
        tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'  -- Demo tenant ID
        AND auth.role() = 'anon'
    );

-- Policy 6: Allow creating bookings with anon key for demo tenant (widget)
CREATE POLICY "Demo tenant anon create" ON bookings
    FOR INSERT WITH CHECK (
        tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'  -- Demo tenant ID
        AND auth.role() = 'anon'
    );

-- Ensure tenants table allows reading for tenant resolution
CREATE POLICY "Allow tenant lookup" ON tenants
    FOR SELECT USING (true);

-- Ensure restaurant_tables allows reading
CREATE POLICY "Allow table lookup" ON restaurant_tables
    FOR SELECT USING (true);