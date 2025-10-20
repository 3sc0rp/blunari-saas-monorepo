-- Migration: Add flexible pricing types to catering packages
-- Date: October 20, 2025
-- Description: Support per-person, per-tray, and fixed pricing models

-- Create pricing type enum (drop if exists to ensure clean state)
DROP TYPE IF EXISTS public.catering_pricing_type CASCADE;
CREATE TYPE public.catering_pricing_type AS ENUM ('per_person', 'per_tray', 'fixed');

-- Add new columns to catering_packages
ALTER TABLE public.catering_packages 
  ADD COLUMN IF NOT EXISTS pricing_type public.catering_pricing_type DEFAULT 'per_person' NOT NULL,
  ADD COLUMN IF NOT EXISTS base_price INTEGER, -- in cents, for per_tray or fixed pricing
  ADD COLUMN IF NOT EXISTS serves_count INTEGER, -- for per_tray, how many people one tray serves
  ADD COLUMN IF NOT EXISTS tray_description TEXT; -- e.g., "Serves 8-10 people"

-- Update existing packages to use per_person pricing (backward compatible)
UPDATE public.catering_packages 
SET pricing_type = 'per_person' 
WHERE pricing_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.catering_packages.pricing_type IS 'Pricing model: per_person (price per guest), per_tray (fixed price per tray/batch), or fixed (one-time flat fee)';
COMMENT ON COLUMN public.catering_packages.price_per_person IS 'Price in cents per person (used when pricing_type = per_person)';
COMMENT ON COLUMN public.catering_packages.base_price IS 'Base price in cents (used when pricing_type = per_tray or fixed)';
COMMENT ON COLUMN public.catering_packages.serves_count IS 'Number of people served by one tray (used when pricing_type = per_tray)';
COMMENT ON COLUMN public.catering_packages.tray_description IS 'Description of tray serving size, e.g., "Each tray serves 8-10 guests"';

-- Add check constraint to ensure correct pricing fields are set
ALTER TABLE public.catering_packages
  ADD CONSTRAINT catering_packages_pricing_check CHECK (
    CASE 
      WHEN pricing_type = 'per_person' THEN price_per_person IS NOT NULL AND price_per_person > 0
      WHEN pricing_type = 'per_tray' THEN base_price IS NOT NULL AND base_price > 0 AND serves_count IS NOT NULL AND serves_count > 0
      WHEN pricing_type = 'fixed' THEN base_price IS NOT NULL AND base_price > 0
      ELSE false
    END
  );

-- Create index for filtering by pricing type
CREATE INDEX IF NOT EXISTS idx_catering_packages_pricing_type 
  ON public.catering_packages(pricing_type);

-- Update catering_orders to store calculated price breakdown
ALTER TABLE public.catering_orders
  ADD COLUMN IF NOT EXISTS price_breakdown JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.catering_orders.price_breakdown IS 'Detailed pricing breakdown: { "pricing_type": "per_person", "base_price": 1000, "guest_count": 25, "tray_count": 3, "subtotal": 25000, "tax": 2000, "total": 27000 }';

-- Example: Update existing package to be per-tray
-- UPDATE public.catering_packages 
-- SET 
--   pricing_type = 'per_tray',
--   base_price = 8000, -- $80 per tray
--   serves_count = 10,
--   tray_description = 'Each tray serves 8-10 guests'
-- WHERE name = 'kebab' AND tenant_id = 'YOUR_TENANT_ID';
