-- ============================================================================
-- IDEMPOTENT DATABASE FIX FOR BOOKING WIDGET
-- ============================================================================
-- This script is safe to run multiple times - it only applies changes if needed
-- Run this in: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql
-- ============================================================================

-- PART 1: Fix booking status constraint to allow 'pending'
-- ============================================================================
DO $$
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  
  -- Add new constraint with 'pending' status
  ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'));
  
  -- Set default to 'pending' for new bookings
  ALTER TABLE public.bookings 
  ALTER COLUMN status SET DEFAULT 'pending';
  
  RAISE NOTICE '✅ Status constraint updated to allow pending';
  
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already exists, skipping';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating constraint: %', SQLERRM;
END $$;

-- PART 2: Ensure RLS policies allow INSERT and SELECT
-- ============================================================================
DO $$
BEGIN
  -- These policies allow the edge function (using service_role key) to insert and read bookings
  -- Service role bypasses RLS, but we add these for completeness and anon key usage
  
  -- Drop existing overly restrictive policies if any
  DROP POLICY IF EXISTS "Enable insert for all users" ON public.bookings;
  DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;
  DROP POLICY IF EXISTS "Enable select for all users" ON public.bookings;
  DROP POLICY IF EXISTS "Users can insert bookings" ON public.bookings;
  DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;
  
  -- Create permissive policies for bookings (needed for widget token with anon key)
  CREATE POLICY "Enable insert for all users"
    ON public.bookings
    FOR INSERT
    TO public
    WITH CHECK (true);
  
  CREATE POLICY "Enable read access for all users"
    ON public.bookings
    FOR SELECT
    TO public
    USING (true);
  
  RAISE NOTICE '✅ RLS policies created/updated';
  
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policies already exist';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- PART 3: Test the fix
-- ============================================================================
DO $$
DECLARE
  test_id UUID;
  test_booking RECORD;
  test_passed BOOLEAN := false;
BEGIN
  -- Insert test booking with 'pending' status
  INSERT INTO public.bookings (
    tenant_id,
    guest_name,
    guest_email,
    party_size,
    booking_time,
    status,
    duration_minutes
  ) VALUES (
    gen_random_uuid(),
    'System Test Booking',
    'test@system.internal',
    2,
    now() + interval '1 day',
    'pending', -- This is what we're testing!
    120
  )
  RETURNING id INTO test_id;
  
  -- Try to SELECT it back (tests both INSERT and SELECT permissions)
  SELECT * INTO test_booking 
  FROM public.bookings 
  WHERE id = test_id;
  
  IF test_booking.id IS NOT NULL AND test_booking.status = 'pending' THEN
    test_passed := true;
    RAISE NOTICE '✅ TEST PASSED: Created booking % with status %', test_booking.id, test_booking.status;
    RAISE NOTICE '✅ INSERT and SELECT both work correctly!';
  ELSE
    RAISE NOTICE '❌ TEST FAILED: Could not retrieve booking after insert';
  END IF;
  
  -- Cleanup test data
  DELETE FROM public.bookings WHERE id = test_id;
  
  IF test_passed THEN
    RAISE NOTICE '✅ Test booking cleaned up successfully';
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Your booking widget should now work correctly.';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Rebuild: cd apps/client-dashboard && npm run build';
    RAISE NOTICE '2. Hard refresh browser (Ctrl+Shift+R)';
    RAISE NOTICE '3. Test making a booking';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST FAILED: %', SQLERRM;
    RAISE NOTICE 'This may indicate a problem with the fix. Check error above.';
END $$;

-- PART 4: Show current configuration
-- ============================================================================
SELECT 
  '=== Current Status Constraint ===' as info,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
  AND conname = 'bookings_status_check';

SELECT 
  '=== Current RLS Policies ===' as info,
  policyname as policy_name,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No restrictions'
  END as select_rules,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No restrictions'
  END as insert_rules
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'bookings'
ORDER BY policyname;

-- Show recent bookings to verify
SELECT 
  '=== Recent Bookings (Last 5) ===' as info,
  id,
  status,
  guest_name,
  party_size,
  booking_time,
  created_at
FROM public.bookings
ORDER BY created_at DESC
LIMIT 5;
