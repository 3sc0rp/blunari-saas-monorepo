DROP POLICY IF EXISTS "Secure tenant bookings isolation" ON public.bookings;
DROP POLICY IF EXISTS "Tenant tables isolation" ON public.restaurant_tables;

CREATE POLICY "Allow authenticated access to bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated access to tables"
ON public.restaurant_tables
FOR ALL
TO authenticated
USING (true);
