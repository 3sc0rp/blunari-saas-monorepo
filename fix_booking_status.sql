-- Add 'pending' status to bookings table CHECK constraint
-- This fixes the booking widget undefined fields issue

-- Drop the old constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the new constraint with 'pending' included
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'));

-- Update the default to 'pending' for new bookings
ALTER TABLE public.bookings 
ALTER COLUMN status SET DEFAULT 'pending';

-- Verify the change
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'bookings_status_check';
