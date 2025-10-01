-- ============================================================================
-- CRITICAL FIX: Add 'pending' status to bookings table
-- ============================================================================
-- This migration fixes the booking widget undefined fields issue
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- Step 1: Drop the old CHECK constraint that blocks 'pending' status
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Step 2: Add new CHECK constraint that includes 'pending'
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'));

-- Step 3: Update default value to 'pending' for moderation workflow
ALTER TABLE public.bookings 
ALTER COLUMN status SET DEFAULT 'pending';

-- Step 4: Verify the changes
SELECT 
  'Constraint updated successfully!' as message,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
  AND conname = 'bookings_status_check';

-- ============================================================================
-- WHAT THIS FIXES:
-- Before: Bookings could only be 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
-- After:  Bookings can now be 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
--
-- This allows the edge function to create bookings with 'pending' status
-- for the moderation workflow instead of failing silently
-- ============================================================================
