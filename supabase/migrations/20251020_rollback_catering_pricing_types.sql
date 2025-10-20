-- Rollback Migration: Remove pricing types from catering packages
-- Date: October 20, 2025
-- Use this if you need to undo the pricing types migration

-- Remove check constraint
ALTER TABLE public.catering_packages
  DROP CONSTRAINT IF EXISTS catering_packages_pricing_check;

-- Remove index
DROP INDEX IF EXISTS public.idx_catering_packages_pricing_type;

-- Remove columns from catering_packages
ALTER TABLE public.catering_packages
  DROP COLUMN IF EXISTS pricing_type,
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS serves_count,
  DROP COLUMN IF EXISTS tray_description;

-- Remove column from catering_orders
ALTER TABLE public.catering_orders
  DROP COLUMN IF EXISTS price_breakdown;

-- Drop the enum type
DROP TYPE IF EXISTS public.catering_pricing_type CASCADE;

-- Note: This will restore the table to its previous state
-- All packages will use price_per_person field only
