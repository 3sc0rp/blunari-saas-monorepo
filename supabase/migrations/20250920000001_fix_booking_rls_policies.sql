-- Migration: Fix RLS Policies for Booking Management
-- Description: Create proper RLS policies to allow widget booking creation and dashboard reading

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Service role full access" ON bookings;
DROP POLICY IF EXISTS "Users can view tenant bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update tenant bookings" ON bookings;
DROP POLICY IF EXISTS "Demo tenant anon access" ON bookings;
DROP POLICY IF EXISTS "Demo tenant anon create" ON bookings;
DROP POLICY IF EXISTS "Allow tenant lookup" ON tenants;
DROP POLICY IF EXISTS "Allow table lookup" ON restaurant_tables;

-- Ensure RLS is enabled on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role full access (for edge functions)
CREATE POLICY "Service role full access" ON bookings
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Policy 2: Allow anonymous users to create bookings (for widget)
CREATE POLICY "Anonymous booking creation" ON bookings
    FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Policy 3: Allow anonymous users to read bookings for demo tenant
CREATE POLICY "Anonymous booking read for demo" ON bookings
    FOR SELECT USING (
        auth.role() = 'anon' 
        AND tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    );

-- Policy 4: Allow authenticated users to read/update bookings for their tenant
CREATE POLICY "Authenticated tenant access" ON bookings
    FOR ALL USING (
        auth.role() = 'authenticated'
        AND tenant_id IN (
            SELECT id FROM tenants 
            WHERE id = bookings.tenant_id
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND tenant_id IN (
            SELECT id FROM tenants 
            WHERE id = bookings.tenant_id
        )
    );

-- Ensure tenants table allows reading
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tenant lookup" ON tenants
    FOR SELECT USING (true);

-- Ensure restaurant_tables allows reading
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public table lookup" ON restaurant_tables
    FOR SELECT USING (true);