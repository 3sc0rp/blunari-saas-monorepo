# Apply Catering Pricing Types Migration - Quick Guide

**Date**: October 20, 2025  
**Migration File**: `20251020_add_catering_pricing_types.sql`  
**Status**: ✅ Fixed and ready to apply

---

## ✅ What Was Fixed

The migration now properly creates the `catering_pricing_type` enum using:
- `DROP TYPE IF EXISTS` to clear any partial state
- Direct `CREATE TYPE` instead of error-swallowing DO block
- Simpler, more reliable constraint creation

---

## 🚀 How to Apply (Supabase Dashboard)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

### Step 2: Copy & Paste Migration

Copy the entire contents of `supabase/migrations/20251020_add_catering_pricing_types.sql`:

```sql
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
```

### Step 3: Run Migration

1. Click **Run** button (or press Ctrl+Enter)
2. Wait for "Success" message
3. Check for any errors (there should be none!)

### Step 4: Verify Migration

Run this query to verify:

```sql
-- Check enum was created
SELECT 
  enumtypid::regtype AS enum_type,
  array_agg(enumlabel ORDER BY enumsortorder) AS enum_values
FROM pg_enum
WHERE enumtypid = 'public.catering_pricing_type'::regtype
GROUP BY enumtypid;

-- Should return:
-- enum_type: catering_pricing_type
-- enum_values: {per_person, per_tray, fixed}

-- Check columns were added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'catering_packages'
  AND column_name IN ('pricing_type', 'base_price', 'serves_count', 'tray_description')
ORDER BY column_name;

-- Should return 4 rows with the new columns

-- Check existing packages have default pricing_type
SELECT 
  id,
  name,
  pricing_type,
  price_per_person,
  base_price,
  serves_count
FROM catering_packages
LIMIT 5;

-- All should show pricing_type = 'per_person'
```

---

## 🧪 Test: Create a Per-Tray Package

Once migration is applied, test by converting a package:

```sql
-- Get your tenant_id first
SELECT id, slug, name FROM tenants LIMIT 5;

-- Update a test package (replace with your actual tenant_id and package name)
UPDATE catering_packages 
SET 
  pricing_type = 'per_tray',
  base_price = 8000,        -- $80 per tray
  serves_count = 10,
  tray_description = 'Each tray serves 8-10 guests'
WHERE name = 'kebab' 
  AND tenant_id = 'YOUR_TENANT_ID_HERE';

-- Verify the update
SELECT 
  name,
  pricing_type,
  CASE 
    WHEN pricing_type = 'per_person' THEN price_per_person::text || ' cents per person'
    WHEN pricing_type = 'per_tray' THEN base_price::text || ' cents per tray (serves ' || serves_count || ')'
    WHEN pricing_type = 'fixed' THEN base_price::text || ' cents total'
  END as price_display
FROM catering_packages
WHERE name = 'kebab';

-- Should show: "8000 cents per tray (serves 10)"
```

---

## 🎯 Next: Test in Widget

1. Open: https://app.blunari.ai/catering/droodwick-grille
2. Look for the updated package
3. Should display: **"$80.00 /tray"** with subtitle **"Serves 8-10 guests"**
4. Select package, enter 25 guests
5. Check price: Should calculate 3 trays × $80 = $240

---

## 🔄 Rollback (If Needed)

If something goes wrong, run the rollback script:

```sql
-- Use: supabase/migrations/20251020_rollback_catering_pricing_types.sql

-- Remove check constraint
ALTER TABLE public.catering_packages
  DROP CONSTRAINT IF EXISTS catering_packages_pricing_check;

-- Remove index
DROP INDEX IF EXISTS public.idx_catering_packages_pricing_type;

-- Remove columns
ALTER TABLE public.catering_packages
  DROP COLUMN IF EXISTS pricing_type,
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS serves_count,
  DROP COLUMN IF EXISTS tray_description;

-- Remove price_breakdown from orders
ALTER TABLE public.catering_orders
  DROP COLUMN IF EXISTS price_breakdown;

-- Drop enum
DROP TYPE IF EXISTS public.catering_pricing_type CASCADE;
```

---

## ✅ Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Pasted migration SQL
- [ ] Ran migration successfully
- [ ] Verified enum created (3 values)
- [ ] Verified columns added (4 new columns)
- [ ] Verified existing packages have pricing_type='per_person'
- [ ] Updated test package to per_tray
- [ ] Tested widget displays new pricing format
- [ ] Tested calculation for 25 guests (should show 3 trays)

---

**Status**: Ready to apply ✅  
**Estimated Time**: 5 minutes  
**Risk**: Low (backward compatible, has rollback script)
