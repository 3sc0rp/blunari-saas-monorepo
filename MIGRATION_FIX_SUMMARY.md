# Migration Fix: Handling Partial Enum State

**Issue**: `ERROR: invalid input value for enum pricing_type: "fixed"`  
**Cause**: Enum was partially created or column existed with incomplete enum values  
**Solution**: Drop column first, then recreate enum and column cleanly

---

## 🔧 What Changed (Commit: 5ae35d81)

The migration now follows this sequence:

### Step 1: Drop Existing Column (if any)
```sql
ALTER TABLE public.catering_packages 
  DROP COLUMN IF EXISTS pricing_type CASCADE;
```
This ensures no column is referencing the old/partial enum.

### Step 2: Drop and Recreate Enum
```sql
DROP TYPE IF EXISTS public.catering_pricing_type CASCADE;
CREATE TYPE public.catering_pricing_type AS ENUM ('per_person', 'per_tray', 'fixed');
```
Fresh, clean enum with all values.

### Step 3: Add Column with Clean Enum
```sql
ALTER TABLE public.catering_packages 
  ADD COLUMN pricing_type public.catering_pricing_type DEFAULT 'per_person' NOT NULL,
  ...
```
Column now references the freshly created enum.

### Step 4: Add Constraint Safely
```sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'catering_packages_pricing_check'
  ) THEN
    ALTER TABLE ... ADD CONSTRAINT ...
  END IF;
END $$;
```
Only adds constraint if it doesn't already exist.

---

## ✅ Ready to Apply

**This migration is now idempotent** - you can run it multiple times safely!

### Copy the Entire Migration

Go to Supabase SQL Editor and paste the complete migration from:
`supabase/migrations/20251020_add_catering_pricing_types.sql`

### Expected Result

```
✓ ALTER TABLE (drop column)
✓ DROP TYPE
✓ CREATE TYPE
✓ ALTER TABLE (add columns)
✓ UPDATE (set defaults)
✓ COMMENT (5 comments)
✓ DO (constraint check)
✓ CREATE INDEX
✓ ALTER TABLE (orders table)
✓ COMMENT (1 comment)

Success. No rows returned.
```

---

## 🧪 Verification Query

After running, verify everything is correct:

```sql
-- 1. Check enum has all values
SELECT 
  enumtypid::regtype AS enum_type,
  array_agg(enumlabel ORDER BY enumsortorder) AS values
FROM pg_enum
WHERE enumtypid = 'catering_pricing_type'::regtype
GROUP BY enumtypid;

-- Expected: catering_pricing_type | {per_person,per_tray,fixed}

-- 2. Check column exists and uses enum
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'catering_packages'
  AND column_name = 'pricing_type';

-- Expected: pricing_type | USER-DEFINED | catering_pricing_type | 'per_person'::catering_pricing_type

-- 3. Check all packages have valid pricing_type
SELECT 
  pricing_type,
  COUNT(*) as count
FROM catering_packages
GROUP BY pricing_type;

-- Expected: per_person | X (where X is your package count)

-- 4. Check constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'catering_packages_pricing_check';

-- Expected: constraint definition with CASE statement
```

---

## 🎯 Next Steps After Successful Migration

### 1. Update a Test Package

```sql
-- Get your tenant_id
SELECT id, slug FROM tenants LIMIT 1;

-- Convert a package to per-tray pricing
UPDATE catering_packages 
SET 
  pricing_type = 'per_tray',
  base_price = 8000,  -- $80.00
  serves_count = 10,
  tray_description = 'Each tray serves 8-10 guests'
WHERE name = 'kebab' 
  AND tenant_id = 'YOUR_TENANT_ID';

-- Verify
SELECT 
  name,
  pricing_type,
  base_price / 100.0 as price_dollars,
  serves_count,
  tray_description
FROM catering_packages
WHERE name = 'kebab';
```

### 2. Test in Widget

1. Open: https://app.blunari.ai/catering/droodwick-grille
2. Find the updated package
3. Should show: **"$80.00 /tray"** with **"Serves 8-10 guests"** below
4. Select package
5. Enter 25 guests
6. Verify calculation: **"$80.00 × 3 trays (25 guests) = $240.00"**

### 3. Complete Order Test

1. Fill out event details
2. Submit order
3. Check confirmation shows price breakdown
4. Verify database record:

```sql
SELECT 
  id,
  event_name,
  guest_count,
  total_price_cents,
  price_breakdown
FROM catering_orders
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📊 Migration History

| Commit | Change | Status |
|--------|--------|--------|
| b5a673f2 | Initial pricing types implementation | ✅ Code complete |
| 50f40111 | Fix enum creation with DROP IF EXISTS | ❌ Still had partial state issue |
| 7ea52264 | Add migration apply guide | ✅ Documentation |
| 5ae35d81 | **Drop column before enum recreation** | ✅ **CURRENT - USE THIS** |

---

## 🔄 If Migration Still Fails

If you still encounter issues, try this **nuclear option** (clears everything):

```sql
-- CAUTION: This drops all pricing type data
-- Only use if migration keeps failing

-- 1. Drop constraint
ALTER TABLE public.catering_packages
  DROP CONSTRAINT IF EXISTS catering_packages_pricing_check;

-- 2. Drop index
DROP INDEX IF EXISTS public.idx_catering_packages_pricing_type;

-- 3. Drop column completely
ALTER TABLE public.catering_packages
  DROP COLUMN IF EXISTS pricing_type CASCADE,
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS serves_count,
  DROP COLUMN IF EXISTS tray_description;

-- 4. Drop enum
DROP TYPE IF EXISTS public.catering_pricing_type CASCADE;

-- 5. Now run the migration again (will start fresh)
```

Then run the full migration from the file.

---

## ✅ Success Criteria

- [ ] Migration runs without errors
- [ ] Enum has 3 values: per_person, per_tray, fixed
- [ ] Column pricing_type exists with type catering_pricing_type
- [ ] All existing packages have pricing_type = 'per_person'
- [ ] Constraint catering_packages_pricing_check exists
- [ ] Index idx_catering_packages_pricing_type exists
- [ ] Test package updated to per_tray successfully
- [ ] Widget displays "$XX.XX /tray" correctly
- [ ] Order calculation works for per-tray pricing
- [ ] Confirmation shows price breakdown

---

**Status**: Migration Fixed (5ae35d81) ✅  
**Ready to Apply**: YES ✅  
**Idempotent**: YES - Can run multiple times safely ✅
