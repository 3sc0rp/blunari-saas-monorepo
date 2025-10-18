# Catering Widget Pricing Model Analysis & Fix
**Date:** October 17, 2025  
**Issue:** Packages with flat-rate pricing (trays) incorrectly displayed as "per person"  
**Status:** 🔴 CRITICAL - Production Blocker

---

## 🎯 Problem Statement

The catering widget currently **only supports per-person pricing**, but some packages are **flat-rate priced** (e.g., a tray that serves 10-15 people for $150 total, not $150/person).

### Current Behavior (WRONG)
```
Package: "Mediterranean Mezze Platter"
Price: $150.00 (flat rate, serves 10-15 people)

Widget displays: "$150.00/person" ❌
Total for 50 guests: $7,500 ❌ (should be ~$450-500 for 3-4 trays)
```

### Expected Behavior (CORRECT)
```
Package: "Mediterranean Mezze Platter"  
Price: $150.00 per tray (serves 10-15 people)

Widget displays: "$150.00/tray (serves 10-15)" ✅
Total for 50 guests: $450-600 (3-4 trays) ✅
```

---

## 🔍 Root Cause Analysis

### 1. Database Schema Limitation
**File:** `supabase/migrations/20250831183000_add_catering_system.sql`

```sql
CREATE TABLE public.catering_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person INTEGER NOT NULL, -- ❌ ONLY per-person pricing
  min_guests INTEGER DEFAULT 10,
  max_guests INTEGER,
  -- ... other fields
);
```

**Missing Fields:**
- `pricing_type` - enum: 'per_person' | 'flat_rate' | 'per_tray'
- `serves_count` - for flat-rate items, how many people does it serve?
- `base_price` - rename/repurpose for flat-rate pricing

### 2. TypeScript Type Definition
**File:** `apps/client-dashboard/src/types/catering.ts`

```typescript
export interface CateringPackage {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price_per_person: number; // ❌ Assumes all pricing is per-person
  min_guests: number;
  max_guests?: number;
  // ... missing pricing_type field
}
```

### 3. Widget Display Logic
**File:** `apps/client-dashboard/src/components/catering/CateringWidget.tsx` (Line 421)

```tsx
<div className="text-2xl font-bold text-orange-600">
  {formatPrice(pkg.price_per_person)}
  <span className="text-sm text-muted-foreground">
    /person  {/* ❌ Hardcoded "per person" */}
  </span>
</div>
```

### 4. Total Calculation Logic
**File:** `apps/client-dashboard/src/components/catering/CateringWidget.tsx` (Line 288)

```tsx
const getTotalPrice = () => {
  if (!selectedPackage || !orderForm.guest_count) return 0;
  // ❌ Always multiplies by guest count
  return selectedPackage.price_per_person * orderForm.guest_count;
};
```

---

## 🛠️ Solution: Multi-Pricing Model Support

### Phase 1: Database Schema Migration (REQUIRED)

**File:** `supabase/migrations/20251017000000_add_package_pricing_types.sql`

```sql
-- Add pricing type enum
CREATE TYPE pricing_type AS ENUM ('per_person', 'flat_rate', 'per_tray', 'per_package');

-- Add new columns to catering_packages
ALTER TABLE public.catering_packages 
  ADD COLUMN pricing_type pricing_type DEFAULT 'per_person' NOT NULL,
  ADD COLUMN serves_count INTEGER, -- How many people this serves (for flat_rate/per_tray)
  ADD COLUMN price_unit TEXT DEFAULT 'person'; -- Display unit: 'person', 'tray', 'package', etc.

-- Update existing packages to use per_person pricing (backward compatible)
UPDATE public.catering_packages 
SET pricing_type = 'per_person', 
    price_unit = 'person'
WHERE pricing_type IS NULL;

-- Add check constraint
ALTER TABLE public.catering_packages
  ADD CONSTRAINT check_serves_count_for_flat_rate
  CHECK (
    (pricing_type = 'per_person' AND serves_count IS NULL) OR
    (pricing_type IN ('flat_rate', 'per_tray', 'per_package') AND serves_count > 0)
  );

-- Add helpful comment
COMMENT ON COLUMN public.catering_packages.pricing_type IS 
  'How this package is priced: per_person (multiply by guest count), flat_rate/per_tray (fixed price for serves_count people)';
COMMENT ON COLUMN public.catering_packages.serves_count IS 
  'For flat_rate/per_tray pricing: how many people this package/tray serves';
```

### Phase 2: Update TypeScript Types

**File:** `apps/client-dashboard/src/types/catering.ts`

```typescript
export type CateringPricingType = 'per_person' | 'flat_rate' | 'per_tray' | 'per_package';

export interface CateringPackage {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price_per_person: number; // Keep for backward compatibility, interpret based on pricing_type
  pricing_type: CateringPricingType; // ✅ NEW
  serves_count?: number; // ✅ NEW - for flat_rate/per_tray
  price_unit?: string; // ✅ NEW - display unit
  min_guests: number;
  max_guests?: number;
  includes_setup: boolean;
  includes_service: boolean;
  includes_cleanup: boolean;
  dietary_accommodations: DietaryRestriction[];
  image_url?: string;
  popular: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Phase 3: Update Widget Display Logic

**File:** `apps/client-dashboard/src/components/catering/CateringWidget.tsx`

```tsx
// Helper function to format package price
const formatPackagePrice = (pkg: CateringPackage) => {
  const basePrice = formatPrice(pkg.price_per_person);
  
  switch (pkg.pricing_type) {
    case 'per_person':
      return (
        <>
          {basePrice}
          <span className="text-sm text-muted-foreground">/person</span>
        </>
      );
    
    case 'flat_rate':
      return (
        <>
          {basePrice}
          <span className="text-sm text-muted-foreground">
            {pkg.serves_count && ` (serves ${pkg.serves_count})`}
          </span>
        </>
      );
    
    case 'per_tray':
    case 'per_package':
      return (
        <>
          {basePrice}
          <span className="text-sm text-muted-foreground">
            /{pkg.price_unit || 'tray'}
            {pkg.serves_count && ` (serves ${pkg.serves_count})`}
          </span>
        </>
      );
    
    default:
      return basePrice;
  }
};

// Update package card rendering (Line 421)
<div className="text-2xl font-bold text-orange-600">
  {formatPackagePrice(pkg)}
</div>
```

### Phase 4: Update Total Calculation Logic

**File:** `apps/client-dashboard/src/components/catering/CateringWidget.tsx`

```tsx
const getTotalPrice = () => {
  if (!selectedPackage || !orderForm.guest_count) return 0;
  
  const guestCount = orderForm.guest_count;
  const basePrice = selectedPackage.price_per_person;
  
  switch (selectedPackage.pricing_type) {
    case 'per_person':
      // Traditional per-person pricing
      return basePrice * guestCount;
    
    case 'flat_rate':
    case 'per_tray':
    case 'per_package': {
      // Calculate how many trays/packages needed
      const servesCount = selectedPackage.serves_count || 1;
      const unitsNeeded = Math.ceil(guestCount / servesCount);
      return basePrice * unitsNeeded;
    }
    
    default:
      return basePrice * guestCount; // Fallback to per-person
  }
};

// Add helper to show quantity breakdown
const getPricingBreakdown = () => {
  if (!selectedPackage || !orderForm.guest_count) return null;
  
  const guestCount = orderForm.guest_count;
  const basePrice = selectedPackage.price_per_person;
  
  switch (selectedPackage.pricing_type) {
    case 'per_person':
      return {
        unitPrice: basePrice,
        quantity: guestCount,
        unit: 'person',
        description: `${guestCount} guests × ${formatPrice(basePrice)}/person`,
      };
    
    case 'flat_rate':
    case 'per_tray':
    case 'per_package': {
      const servesCount = selectedPackage.serves_count || 1;
      const unitsNeeded = Math.ceil(guestCount / servesCount);
      const unit = selectedPackage.price_unit || 'tray';
      
      return {
        unitPrice: basePrice,
        quantity: unitsNeeded,
        unit,
        servesCount,
        description: `${unitsNeeded} ${unit}${unitsNeeded > 1 ? 's' : ''} × ${formatPrice(basePrice)}/${unit} (serves ${servesCount} each)`,
      };
    }
    
    default:
      return null;
  }
};
```

### Phase 5: Update Customize Step Display

**File:** `apps/client-dashboard/src/components/catering/CateringWidget.tsx`

Add pricing breakdown in the customize step (around line 600):

```tsx
{/* Pricing Breakdown - Add after guest count input */}
{selectedPackage && (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-700">
        Pricing Breakdown
      </span>
    </div>
    
    {(() => {
      const breakdown = getPricingBreakdown();
      if (!breakdown) return null;
      
      return (
        <div className="space-y-1">
          <div className="text-sm text-gray-600">
            {breakdown.description}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-orange-200">
            <span className="font-semibold text-gray-900">Estimated Total</span>
            <span className="text-xl font-bold text-orange-600">
              {formatPrice(getTotalPrice())}
            </span>
          </div>
          
          {selectedPackage.pricing_type !== 'per_person' && (
            <p className="text-xs text-gray-500 mt-1">
              * Calculated based on {breakdown.quantity} {breakdown.unit}
              {breakdown.quantity > 1 ? 's' : ''} needed for {orderForm.guest_count} guests
            </p>
          )}
        </div>
      );
    })()}
  </div>
)}
```

### Phase 6: Update Package Manager

**File:** `apps/client-dashboard/src/components/catering/management/CateringPackagesManager.tsx`

```tsx
// Add to form state
const [formData, setFormData] = useState({
  name: '',
  description: '',
  price_per_person: 0,
  pricing_type: 'per_person' as CateringPricingType, // ✅ NEW
  serves_count: undefined as number | undefined, // ✅ NEW
  price_unit: 'person', // ✅ NEW
  min_guests: 10,
  max_guests: 500,
  // ... rest of fields
});

// Add to form UI (in Dialog)
<div className="space-y-4">
  {/* Pricing Type Selection */}
  <div className="space-y-2">
    <Label>Pricing Model</Label>
    <Select
      value={formData.pricing_type}
      onValueChange={(value: CateringPricingType) =>
        setFormData({ ...formData, pricing_type: value })
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="per_person">Per Person</SelectItem>
        <SelectItem value="flat_rate">Flat Rate</SelectItem>
        <SelectItem value="per_tray">Per Tray</SelectItem>
        <SelectItem value="per_package">Per Package</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Price Input */}
  <div className="space-y-2">
    <Label>
      Price {formData.pricing_type === 'per_person' ? 'per Person' : 
             formData.pricing_type === 'per_tray' ? 'per Tray' : 
             formData.pricing_type === 'per_package' ? 'per Package' : 
             '(Total)'}
    </Label>
    <Input
      type="number"
      step="0.01"
      min="0"
      value={formData.price_per_person}
      onChange={(e) =>
        setFormData({ ...formData, price_per_person: parseFloat(e.target.value) || 0 })
      }
    />
  </div>

  {/* Serves Count - Only for non-per-person pricing */}
  {formData.pricing_type !== 'per_person' && (
    <div className="space-y-2">
      <Label>Serves How Many People?</Label>
      <Input
        type="number"
        min="1"
        value={formData.serves_count || ''}
        onChange={(e) =>
          setFormData({ ...formData, serves_count: parseInt(e.target.value) || undefined })
        }
        placeholder="e.g., 10-15 people per tray"
      />
      <p className="text-xs text-muted-foreground">
        How many people does one {formData.pricing_type === 'per_tray' ? 'tray' : 'package'} serve?
      </p>
    </div>
  )}

  {/* Price Unit - Custom label */}
  {formData.pricing_type !== 'per_person' && (
    <div className="space-y-2">
      <Label>Unit Label (Optional)</Label>
      <Input
        type="text"
        value={formData.price_unit || ''}
        onChange={(e) =>
          setFormData({ ...formData, price_unit: e.target.value })
        }
        placeholder="e.g., tray, platter, box"
      />
      <p className="text-xs text-muted-foreground">
        How to display the unit (default: "{formData.pricing_type === 'per_tray' ? 'tray' : 'package'}")
      </p>
    </div>
  )}
</div>
```

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] `getTotalPrice()` correctly calculates for per_person pricing
- [ ] `getTotalPrice()` correctly calculates for flat_rate pricing
- [ ] `getTotalPrice()` correctly calculates for per_tray pricing
- [ ] `getPricingBreakdown()` returns correct breakdown for all pricing types
- [ ] `formatPackagePrice()` displays correct format for all pricing types

### Integration Tests
- [ ] Create package with per_person pricing → displays "/person"
- [ ] Create package with flat_rate pricing → displays total + serves count
- [ ] Create package with per_tray pricing → displays "/tray (serves X)"
- [ ] Guest count change updates total correctly for flat_rate packages
- [ ] Guest count change updates tray quantity correctly

### Manual Testing Scenarios

**Scenario 1: Per-Person Package**
```
Package: "Buffet Dinner"
Pricing Type: per_person
Price: $45.00
Guest Count: 50

Expected Display: "$45.00/person"
Expected Total: $2,250.00 (50 × $45)
```

**Scenario 2: Flat-Rate Package**
```
Package: "Small Appetizer Platter"
Pricing Type: flat_rate
Price: $150.00
Serves: 15 people
Guest Count: 50

Expected Display: "$150.00 (serves 15)"
Expected Total: $600.00 (4 trays × $150)
Expected Note: "4 platters needed for 50 guests"
```

**Scenario 3: Per-Tray Package**
```
Package: "Mediterranean Mezze"
Pricing Type: per_tray
Price: $120.00
Serves: 12 people
Price Unit: "tray"
Guest Count: 35

Expected Display: "$120.00/tray (serves 12)"
Expected Total: $360.00 (3 trays × $120)
Expected Note: "3 trays needed for 35 guests"
```

---

## 📋 Implementation Checklist

### Database (Backend Engineer)
- [ ] Create migration file `20251017000000_add_package_pricing_types.sql`
- [ ] Test migration on staging database
- [ ] Add seed data with mixed pricing types for testing
- [ ] Deploy migration to production
- [ ] Verify existing packages still work (backward compatibility)

### TypeScript Types (Full-Stack)
- [ ] Update `apps/client-dashboard/src/types/catering.ts`
- [ ] Update `apps/admin-dashboard/src/types/catering.ts` (if different)
- [ ] Re-generate Supabase types after migration
- [ ] Fix TypeScript errors across codebase

### Widget Frontend (Frontend Engineer)
- [ ] Implement `formatPackagePrice()` helper
- [ ] Implement `getTotalPrice()` with multi-pricing support
- [ ] Implement `getPricingBreakdown()` helper
- [ ] Update package card display
- [ ] Update customize step pricing breakdown
- [ ] Update summary/confirmation display

### Package Manager (Frontend Engineer)
- [ ] Add pricing_type dropdown to form
- [ ] Add serves_count input (conditional)
- [ ] Add price_unit input (conditional)
- [ ] Update form validation
- [ ] Update create/edit handlers
- [ ] Test creating all pricing types

### Documentation
- [ ] Update catering widget docs with pricing model examples
- [ ] Add migration guide for existing packages
- [ ] Update admin user guide for package creation

---

## 🚨 Migration Strategy for Existing Packages

### Option 1: Default to Per-Person (Recommended)
```sql
-- All existing packages default to per_person pricing
UPDATE public.catering_packages 
SET pricing_type = 'per_person', 
    price_unit = 'person'
WHERE pricing_type IS NULL;
```

**Pros:**
- ✅ Zero downtime
- ✅ No data loss
- ✅ Existing packages work exactly as before

**Cons:**
- ❌ Requires manual update for flat-rate packages

### Option 2: Smart Detection (Advanced)
```sql
-- Attempt to detect flat-rate packages based on naming patterns
UPDATE public.catering_packages 
SET pricing_type = 'per_tray',
    serves_count = 10,
    price_unit = 'tray'
WHERE 
  (name ILIKE '%tray%' OR 
   name ILIKE '%platter%' OR 
   name ILIKE '%box%') AND
  pricing_type IS NULL;

-- Default rest to per_person
UPDATE public.catering_packages 
SET pricing_type = 'per_person', 
    price_unit = 'person'
WHERE pricing_type IS NULL;
```

**Pros:**
- ✅ Automatically converts likely flat-rate packages
- ✅ Reduces manual work

**Cons:**
- ❌ May misclassify some packages
- ❌ Requires manual verification

---

## 🎯 Success Metrics

### Before Implementation
- ❌ 100% of packages displayed as "per person"
- ❌ Incorrect totals for flat-rate packages
- ❌ Confused customers ("Why is this tray $7,500?!")
- ❌ Support tickets about pricing errors

### After Implementation
- ✅ Support for 4 pricing models (per_person, flat_rate, per_tray, per_package)
- ✅ Accurate pricing calculations for all models
- ✅ Clear pricing breakdowns showing quantities
- ✅ 0 pricing-related support tickets
- ✅ Increased conversion (customers understand what they're buying)

---

## 📚 Related Files

### Database
- `supabase/migrations/20250831183000_add_catering_system.sql`
- `supabase/migrations/20251017000000_add_package_pricing_types.sql` (NEW)

### Types
- `apps/client-dashboard/src/types/catering.ts`
- `apps/admin-dashboard/src/types/catering.ts`

### Components
- `apps/client-dashboard/src/components/catering/CateringWidget.tsx`
- `apps/client-dashboard/src/components/catering/management/CateringPackagesManager.tsx`

### Hooks
- `apps/client-dashboard/src/hooks/useCateringData.ts`
- `apps/client-dashboard/src/hooks/useCateringPackages.ts`

---

## 🔗 References

- [CATERING_WIDGET_ANALYSIS.md](./CATERING_WIDGET_ANALYSIS.md) - Original widget analysis
- [CATERING_EXECUTIVE_SUMMARY.md](./CATERING_EXECUTIVE_SUMMARY.md) - High-level overview
- [CATERING_CRITICAL_ISSUES.md](./CATERING_CRITICAL_ISSUES.md) - All critical issues

---

**Priority:** 🔴 CRITICAL - Must fix before production launch
**Estimated Effort:** 8-12 hours (2 engineers × 4-6 hours)
**Risk:** LOW (backward compatible with existing packages)
