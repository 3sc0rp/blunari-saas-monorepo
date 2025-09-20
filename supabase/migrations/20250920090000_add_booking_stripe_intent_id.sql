-- Add Stripe PaymentIntent ID to bookings for deposit tracking
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Optional index for faster lookups by payment intent
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_payment_intent_id
ON public.bookings (stripe_payment_intent_id);


