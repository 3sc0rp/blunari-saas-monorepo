-- Migration: Add Multi-Pricing Model Support to Catering Packages
-- Date: 2025-10-17
-- Purpose: Support flat-rate, per-tray, and per-package pricing in addition to per-person pricing
-- Backward Compatible: YES - defaults all existing packages to per_person pricing

-- Step 1: Create pricing type enum
DO $$ BEGIN
  CREATE TYPE pricing_type AS ENUM ('per_person', 'flat_rate', 'per_tray', 'per_package');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to catering_packages
ALTER TABLE public.catering_packages 
  ADD COLUMN IF NOT EXISTS pricing_type pricing_type DEFAULT 'per_person',
  ADD COLUMN IF NOT EXISTS serves_count INTEGER,
  ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'person';

-- Step 3: Set defaults for existing records (backward compatibility)
UPDATE public.catering_packages 
SET 
  pricing_type = 'per_person',
  price_unit = 'person'
WHERE pricing_type IS NULL;

-- Step 4: Make pricing_type NOT NULL now that defaults are set
ALTER TABLE public.catering_packages 
  ALTER COLUMN pricing_type SET NOT NULL;

-- Step 5: Add check constraint to ensure serves_count is provided for non-per-person pricing
ALTER TABLE public.catering_packages
  ADD CONSTRAINT check_serves_count_for_flat_rate
  CHECK (
    (pricing_type = 'per_person') OR
    (pricing_type IN ('flat_rate', 'per_tray', 'per_package') AND serves_count > 0)
  );

-- Step 6: Add index for common queries
CREATE INDEX IF NOT EXISTS idx_catering_packages_pricing_type 
  ON public.catering_packages(tenant_id, pricing_type, active);

-- Step 7: Add helpful comments for documentation
COMMENT ON COLUMN public.catering_packages.pricing_type IS 
  'How this package is priced:
  - per_person: Traditional per-guest pricing (price_per_person × guest_count)
  - flat_rate: Fixed price regardless of guest count (serves serves_count people)
  - per_tray: Price per tray/platter (each serves serves_count people)
  - per_package: Price per package/box (each serves serves_count people)';

COMMENT ON COLUMN public.catering_packages.serves_count IS 
  'For non-per-person pricing: how many people this package/tray/unit serves. 
  Required when pricing_type is flat_rate, per_tray, or per_package.
  Null when pricing_type is per_person.';

COMMENT ON COLUMN public.catering_packages.price_unit IS 
  'Display unit for pricing (e.g., "person", "tray", "platter", "box", "package").
  Defaults to "person" for per_person pricing.
  Can be customized for other pricing types.';

-- Step 8: Update the price_per_person column comment for clarity
COMMENT ON COLUMN public.catering_packages.price_per_person IS 
  'Base price in cents. Interpretation depends on pricing_type:
  - per_person: price per guest
  - flat_rate: total price for the package
  - per_tray/per_package: price per tray/package/unit';

-- Step 9: Create helper function to calculate total price for an order
CREATE OR REPLACE FUNCTION calculate_package_total(
  p_package_id UUID,
  p_guest_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_pricing_type pricing_type;
  v_base_price INTEGER;
  v_serves_count INTEGER;
  v_units_needed INTEGER;
  v_total INTEGER;
BEGIN
  -- Get package details
  SELECT pricing_type, price_per_person, serves_count
  INTO v_pricing_type, v_base_price, v_serves_count
  FROM public.catering_packages
  WHERE id = p_package_id;

  -- Calculate based on pricing type
  CASE v_pricing_type
    WHEN 'per_person' THEN
      -- Traditional: price × guest count
      v_total := v_base_price * p_guest_count;
    
    WHEN 'flat_rate' THEN
      -- Single flat rate
      v_total := v_base_price;
    
    WHEN 'per_tray', 'per_package' THEN
      -- Calculate units needed and multiply
      v_units_needed := CEIL(p_guest_count::DECIMAL / v_serves_count::DECIMAL)::INTEGER;
      v_total := v_base_price * v_units_needed;
    
    ELSE
      -- Fallback to per-person
      v_total := v_base_price * p_guest_count;
  END CASE;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_package_total IS 
  'Calculate the total price for a catering package based on pricing type and guest count.
  Returns price in cents.
  
  Examples:
  - per_person ($50, 100 guests): $50 × 100 = $5,000
  - flat_rate ($150, any guests): $150
  - per_tray ($120, serves 15, 50 guests): $120 × 4 = $480 (4 trays needed)';

-- Step 10: Update existing calculate_catering_order_total function if it exists
-- (This depends on your existing schema - adjust as needed)
CREATE OR REPLACE FUNCTION calculate_catering_order_total(p_order_id UUID)
RETURNS TABLE (
  subtotal INTEGER,
  tax_amount INTEGER,
  service_fee INTEGER,
  delivery_fee INTEGER,
  total_amount INTEGER
) AS $$
DECLARE
  v_order_record RECORD;
  v_package_total INTEGER := 0;
  v_items_total INTEGER := 0;
  v_tax_rate DECIMAL := 0.08; -- 8% tax, adjust as needed
  v_service_rate DECIMAL := 0.15; -- 15% service fee, adjust as needed
BEGIN
  -- Get order details
  SELECT * INTO v_order_record
  FROM public.catering_orders
  WHERE id = p_order_id;

  -- Calculate package total using new function
  IF v_order_record.package_id IS NOT NULL THEN
    v_package_total := calculate_package_total(
      v_order_record.package_id,
      v_order_record.guest_count
    );
  END IF;

  -- Calculate additional items total (if any)
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_items_total
  FROM public.catering_order_items
  WHERE order_id = p_order_id;

  -- Calculate totals
  subtotal := v_package_total + v_items_total;
  tax_amount := ROUND(subtotal * v_tax_rate);
  
  -- Only charge service fee for full_service orders
  IF v_order_record.service_type = 'full_service' THEN
    service_fee := ROUND(subtotal * v_service_rate);
  ELSE
    service_fee := 0;
  END IF;

  -- Delivery fee (if applicable)
  delivery_fee := COALESCE(v_order_record.delivery_fee, 0);

  -- Total
  total_amount := subtotal + tax_amount + service_fee + delivery_fee;

  RETURN QUERY SELECT 
    subtotal, 
    tax_amount, 
    service_fee, 
    delivery_fee, 
    total_amount;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 11: Create view for easy package querying
CREATE OR REPLACE VIEW catering_packages_with_pricing AS
SELECT 
  cp.*,
  CASE 
    WHEN cp.pricing_type = 'per_person' THEN 
      CONCAT('$', (cp.price_per_person::DECIMAL / 100)::TEXT, '/person')
    WHEN cp.pricing_type = 'flat_rate' THEN 
      CONCAT('$', (cp.price_per_person::DECIMAL / 100)::TEXT, 
             ' (serves ', cp.serves_count, ')')
    WHEN cp.pricing_type IN ('per_tray', 'per_package') THEN 
      CONCAT('$', (cp.price_per_person::DECIMAL / 100)::TEXT, '/', 
             COALESCE(cp.price_unit, cp.pricing_type::TEXT), 
             ' (serves ', cp.serves_count, ')')
    ELSE 
      CONCAT('$', (cp.price_per_person::DECIMAL / 100)::TEXT)
  END AS price_display,
  calculate_package_total(cp.id, cp.min_guests) AS min_price_estimate,
  calculate_package_total(cp.id, COALESCE(cp.max_guests, cp.min_guests * 10)) AS max_price_estimate
FROM public.catering_packages cp;

COMMENT ON VIEW catering_packages_with_pricing IS 
  'Convenient view showing catering packages with formatted pricing display and price estimates';

-- Step 12: Grant appropriate permissions
GRANT SELECT ON catering_packages_with_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_package_total TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_catering_order_total TO authenticated;
