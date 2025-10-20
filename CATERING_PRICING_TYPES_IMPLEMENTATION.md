# Catering Package Pricing Types - Implementation Guide

**Date**: October 20, 2025  
**Feature**: Flexible pricing models for catering packages

---

## 🎯 Overview

Added support for three different pricing models for catering packages:

1. **Per-Person** (`per_person`) - Price multiplied by guest count (e.g., $15/person × 25 guests = $375)
2. **Per-Tray** (`per_tray`) - Fixed price per tray/batch (e.g., $80/tray, serves 8-10 guests, 3 trays needed for 25 guests = $240)
3. **Fixed** (`fixed`) - One-time flat fee regardless of guest count (e.g., $500 total)

---

## 📁 Files Changed

### Database Migration
- ✅ `supabase/migrations/20251020_add_catering_pricing_types.sql` (CREATED)
  - Added `catering_pricing_type` ENUM
  - Added `pricing_type`, `base_price`, `serves_count`, `tray_description` columns
  - Added validation constraints
  - Added index on `pricing_type`

### TypeScript Types
- ✅ `apps/client-dashboard/src/types/catering.ts` (UPDATED)
  - Added `CateringPricingType` type
  - Updated `CateringPackage` interface with pricing fields

### Utility Functions
- ✅ `apps/client-dashboard/src/utils/catering-pricing.ts` (CREATED)
  - `calculateCateringPrice()` - Smart price calculation for any pricing type
  - `getPackageDisplayPrice()` - Get display price and unit text
  - `validateGuestCount()` - Validate guest count with helpful messages
  - `calculateTotalPriceCents()` - Get total in cents for database storage

### Components Updated
- ✅ `apps/client-dashboard/src/components/catering/PackageSelection.tsx`
  - Dynamic price display using `getPackageDisplayPrice()`
  - Shows appropriate unit: "/person", "/tray", or "total"
  - Displays tray description if available
  
- ✅ `apps/client-dashboard/src/components/catering/ContactDetails.tsx`
  - Uses `calculateTotalPriceCents()` for order submission
  - Accurate price calculation for all pricing types

- ✅ `apps/client-dashboard/src/components/catering/OrderConfirmation.tsx`
  - Displays price breakdown (e.g., "$80 × 3 trays (25 guests) = $240")
  - Shows human-readable calculation summary

---

## 🔧 Database Schema

### New Columns in `catering_packages`

```sql
pricing_type     catering_pricing_type  DEFAULT 'per_person' NOT NULL
base_price       INTEGER                -- cents, for per_tray/fixed
serves_count     INTEGER                -- people per tray
tray_description TEXT                   -- e.g., "Serves 8-10 guests"
```

### Validation Constraints

```sql
-- Ensures correct fields are populated for each pricing type
CHECK (
  CASE 
    WHEN pricing_type = 'per_person' 
      THEN price_per_person IS NOT NULL AND price_per_person > 0
    WHEN pricing_type = 'per_tray' 
      THEN base_price IS NOT NULL AND base_price > 0 
       AND serves_count IS NOT NULL AND serves_count > 0
    WHEN pricing_type = 'fixed' 
      THEN base_price IS NOT NULL AND base_price > 0
    ELSE false
  END
)
```

---

## 🚀 Usage Examples

### Example 1: Per-Person Package (Existing Default)

```sql
INSERT INTO catering_packages (
  tenant_id, name, description,
  pricing_type, price_per_person, min_guests
) VALUES (
  'tenant-id', 'Buffet Lunch', 'Full buffet lunch service',
  'per_person', 1500, 20  -- $15.00 per person
);
```

**Display**: "$15.00 /person"  
**Calculation for 25 guests**: $15.00 × 25 = $375.00

### Example 2: Per-Tray Package

```sql
INSERT INTO catering_packages (
  tenant_id, name, description,
  pricing_type, base_price, serves_count, tray_description, min_guests
) VALUES (
  'tenant-id', 'Kebab Tray', 'Large tray of assorted kebabs',
  'per_tray', 8000, 10, 'Each tray serves 8-10 guests', 10
);
```

**Display**: "$80.00 /tray" (with subtitle "Each tray serves 8-10 guests")  
**Calculation for 25 guests**: 
- Trays needed: Math.ceil(25 / 10) = 3 trays
- Total: $80.00 × 3 = $240.00
- Breakdown: "$80.00 × 3 trays (25 guests) = $240.00"

### Example 3: Fixed Price Package

```sql
INSERT INTO catering_packages (
  tenant_id, name, description,
  pricing_type, base_price, min_guests
) VALUES (
  'tenant-id', 'Full Event Package', 'Complete event catering with setup',
  'fixed', 50000, 30  -- $500.00 total
);
```

**Display**: "$500.00 total"  
**Calculation**: $500.00 (regardless of guest count)  
**Breakdown**: "Fixed price: $500.00"

---

## 📋 Migration Steps

### Step 1: Apply Database Migration

**Option A: Using Supabase CLI** (recommended)
```powershell
cd "c:\Users\Drood\Desktop\Blunari SAAS"
supabase db push
```

**Option B: Manual SQL (Supabase Dashboard)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251020_add_catering_pricing_types.sql`
3. Execute the SQL
4. Verify tables updated successfully

### Step 2: Update Existing Packages (Optional)

To convert existing packages to per-tray pricing:

```sql
-- Example: Convert kebab package to per-tray
UPDATE catering_packages 
SET 
  pricing_type = 'per_tray',
  base_price = 8000,        -- $80 per tray
  serves_count = 10,
  tray_description = 'Each tray serves 8-10 guests'
WHERE name = 'kebab' 
  AND tenant_id = 'YOUR_TENANT_ID';
```

### Step 3: Deploy Frontend Changes

```powershell
# Commit and push (auto-deploys to Vercel)
git add .
git commit -m "feat(catering): add flexible pricing types (per-person, per-tray, fixed)"
git push origin master
```

### Step 4: Verify Deployment

1. Open https://app.blunari.ai/catering/{slug}
2. Check package cards show correct pricing
3. Select a per-tray package and verify calculation
4. Submit test order and check price breakdown in confirmation

---

## 🧪 Testing Checklist

### Package Display

- [ ] Per-person packages show "$X.XX /person"
- [ ] Per-tray packages show "$X.XX /tray" with serving description
- [ ] Fixed packages show "$X.XX total"
- [ ] Popular badges still display correctly
- [ ] Animations work smoothly

### Price Calculations

**Per-Person**:
- [ ] Calculation: price × guest_count
- [ ] Example: $15/person × 25 guests = $375

**Per-Tray**:
- [ ] Calculation: price × Math.ceil(guest_count / serves_count)
- [ ] Example: $80/tray × 3 trays (25 guests, serves 10/tray) = $240
- [ ] Breakdown displays correctly

**Fixed**:
- [ ] Same price regardless of guest count
- [ ] Example: $500 total for any guest count
- [ ] Breakdown shows "Fixed price: $500"

### Order Flow

- [ ] Package selection stores correct pricing data
- [ ] Customize step shows accurate price preview
- [ ] Contact details submission includes correct total_price_cents
- [ ] Confirmation shows detailed price breakdown
- [ ] Analytics track pricing_type and display_price

---

## 🎨 UI Examples

### Package Card (Per-Tray)

```
┌──────────────────────────────────┐
│ 🔸 Kebab Tray            POPULAR │
│                                   │
│ $80.00 /tray                      │
│ Each tray serves 8-10 guests      │
│                                   │
│ Large tray of assorted kebabs     │
│                                   │
│ 👥 10 - 50 guests                 │
│ ✓ Setup included                  │
│                                   │
│ [Select Package]                  │
└──────────────────────────────────┘
```

### Confirmation Breakdown (Per-Tray)

```
┌────────────────────────────────────┐
│ Order Summary                       │
├────────────────────────────────────┤
│ $80.00 × 3 trays (25 guests) =     │
│ $240.00                             │
│                                     │
│ Estimated Total: $240.00            │
│                                     │
│ Final price may vary based on       │
│ additional services                 │
└────────────────────────────────────┘
```

---

## 🔮 Future Enhancements

### Admin Dashboard Updates (TODO)

1. **Package Creation Form**
   - Add pricing_type selector (radio buttons)
   - Show/hide fields based on selection:
     - Per-person: show `price_per_person` field
     - Per-tray: show `base_price`, `serves_count`, `tray_description`
     - Fixed: show only `base_price`
   - Real-time price preview

2. **Package Management Table**
   - Display pricing_type in table column
   - Show appropriate price format per type
   - Filter packages by pricing_type

3. **Analytics Dashboard**
   - Track pricing type distribution
   - Compare conversion rates by pricing type
   - Average order value by pricing type

### Advanced Features (Phase 2)

1. **Dynamic Quantity Selection**
   - For per-tray: allow customers to select specific tray count
   - Smart suggestions: "25 guests need 3 trays, but 4 trays ($320) eliminates waste"

2. **Combo Pricing**
   - Allow packages to combine pricing types
   - Example: Base package (fixed) + add-ons (per-person)

3. **Volume Discounts**
   - Tiered pricing for per-tray packages
   - Example: 1-2 trays $80 each, 3-5 trays $75 each, 6+ trays $70 each

---

## 📞 Support

### SQL Queries for Debugging

**Check pricing types in use**:
```sql
SELECT 
  pricing_type,
  COUNT(*) as package_count,
  COUNT(CASE WHEN active = true THEN 1 END) as active_count
FROM catering_packages
GROUP BY pricing_type;
```

**Find packages with incorrect pricing**:
```sql
SELECT 
  id, name, pricing_type, 
  price_per_person, base_price, serves_count
FROM catering_packages
WHERE NOT (
  CASE 
    WHEN pricing_type = 'per_person' THEN price_per_person > 0
    WHEN pricing_type = 'per_tray' THEN base_price > 0 AND serves_count > 0
    WHEN pricing_type = 'fixed' THEN base_price > 0
    ELSE false
  END
);
```

**Test price calculation**:
```sql
-- Per-tray example: 25 guests, $80/tray, serves 10
SELECT 
  80.00 * CEILING(25.0 / 10) as total_price,
  CEILING(25.0 / 10) as trays_needed;
-- Result: $240.00, 3 trays
```

---

## ✅ Completion Status

- [x] Database migration created
- [x] TypeScript types updated
- [x] Pricing utility functions created
- [x] PackageSelection component updated
- [x] ContactDetails component updated
- [x] OrderConfirmation component updated
- [ ] Database migration applied (PENDING - apply via Supabase SQL Editor)
- [ ] Admin dashboard package management updated
- [ ] Production testing with real packages

---

**Next Steps**:
1. Apply migration via Supabase SQL Editor
2. Update 1-2 existing packages to test per-tray pricing
3. Test complete order flow with both pricing types
4. Update admin dashboard for package creation/editing

---

**Status**: ✅ Code Complete | ⏳ Migration Pending | 📋 Testing Required
