-- Ensure source column exists on bookings (widget/internal attribution)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source TEXT;

-- Backfill null sources to 'website' as a safe default
UPDATE public.bookings SET source = 'website' WHERE source IS NULL;

-- Optional index for filtering
CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(source);
