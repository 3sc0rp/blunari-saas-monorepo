-- Check RLS policies on bookings table that might be blocking SELECT after INSERT
-- Run this in Supabase Dashboard SQL Editor

-- 1. Check if RLS is enabled on bookings table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bookings';

-- 2. List all policies on bookings table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bookings'
ORDER BY policyname;

-- 3. Check if service_role can bypass RLS (it should)
SELECT current_user, current_setting('role');

-- 4. Test INSERT and SELECT permissions for service_role
-- This should work since edge functions use service_role key
DO $$
DECLARE
  test_booking_id UUID;
BEGIN
  -- Try inserting a test booking
  INSERT INTO public.bookings (
    tenant_id,
    guest_name,
    guest_email,
    party_size,
    booking_time,
    status
  ) VALUES (
    '4ff8db7c-92c0-4ec0-8cdd-0f9d5f577af1'::UUID, -- Your tenant ID
    'RLS Test',
    'test@example.com',
    2,
    now() + interval '1 day',
    'pending'
  )
  RETURNING id INTO test_booking_id;
  
  RAISE NOTICE 'Test booking created with ID: %', test_booking_id;
  
  -- Try selecting it back
  PERFORM * FROM public.bookings WHERE id = test_booking_id;
  
  RAISE NOTICE 'Test booking can be selected back - RLS is OK';
  
  -- Clean up
  DELETE FROM public.bookings WHERE id = test_booking_id;
  
  RAISE NOTICE 'Test booking deleted - test complete';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS TEST FAILED: %', SQLERRM;
END $$;
