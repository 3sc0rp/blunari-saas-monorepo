# Catering Widget Production Readiness Checklist
**Date:** October 17, 2025  
**Component:** CateringWidget.tsx  
**Status:** 🟡 IN PROGRESS - Critical issues identified

---

## 🎯 Executive Summary

The catering widget is **functionally complete** but requires **15 critical fixes** before production deployment:

- 🔴 **5 Critical (P0):** Security, accessibility, pricing model
- 🟡 **7 High (P1):** UX improvements, error handling, performance
- 🟢 **3 Medium (P2):** Code quality, documentation

**Estimated Time to Production Ready:** 16-24 hours (2 engineers × 8-12 hours)

---

## 🔴 CRITICAL ISSUES (Must Fix Before Launch)

### 1. ✅ Multi-Pricing Model Support
**Status:** READY FOR IMPLEMENTATION  
**Priority:** P0 - BLOCKER  
**Files:**
- ✅ Migration created: `supabase/migrations/20251017000000_add_package_pricing_types.sql`
- 🔄 Types update needed: `apps/client-dashboard/src/types/catering.ts`
- 🔄 Widget update needed: `apps/client-dashboard/src/components/catering/CateringWidget.tsx`
- 🔄 Manager update needed: `apps/client-dashboard/src/components/catering/management/CateringPackagesManager.tsx`

**Implementation Steps:**
1. Deploy database migration
2. Update TypeScript types
3. Update widget pricing display logic
4. Update total calculation logic
5. Update package manager UI
6. Test with all pricing types

**Testing Required:**
- [ ] Create per_person package → verify display and calculations
- [ ] Create flat_rate package → verify display and calculations
- [ ] Create per_tray package → verify display and calculations
- [ ] Test edge cases: 0 guests, max guests exceeded
- [ ] Verify backward compatibility with existing packages

**Documentation:** See `CATERING_PRICING_MODEL_FIX.md`

---

### 2. ⚠️ Security: Input Sanitization
**Status:** NOT IMPLEMENTED  
**Priority:** P0 - CRITICAL  
**Risk:** XSS attacks, SQL injection

**Current State:**
```tsx
// ❌ No sanitization
onChange={(e) => setOrderForm({
  ...prev,
  event_name: e.target.value // VULNERABLE
})}
```

**Required Fix:**
```tsx
// ✅ Add DOMPurify sanitization
import DOMPurify from 'isomorphic-dompurify';

const sanitizeInput = (value: string): string => {
  return DOMPurify.sanitize(value, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  }).trim();
};

onChange={(e) => setOrderForm({
  ...prev,
  event_name: sanitizeInput(e.target.value)
})}
```

**Files to Update:**
- `CateringWidget.tsx` - All form inputs (lines 543-658)

**Tasks:**
- [ ] Install `isomorphic-dompurify` package
- [ ] Create sanitization utility function
- [ ] Apply to all text inputs: event_name, contact_name, contact_email, venue_name, venue_address, special_instructions
- [ ] Add unit tests for sanitization
- [ ] Test XSS payloads: `<script>alert('XSS')</script>`, `javascript:alert('XSS')`, etc.

---

### 3. ⚠️ Accessibility: WCAG 2.1 AA Compliance
**Status:** NOT IMPLEMENTED  
**Priority:** P0 - LEGAL RISK  
**Risk:** ADA lawsuits, excludes 15%+ users

**Required ARIA Labels:**
```tsx
// Progress indicator
<div 
  role="progressbar" 
  aria-valuenow={stepIndex} 
  aria-valuemin={0} 
  aria-valuemax={3}
  aria-label={`Step ${stepIndex + 1} of 4: ${currentStep}`}
/>

// Live region for announcements
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {`You are now on step ${stepIndex + 1}: ${stepLabels[currentStep]}`}
</div>

// Form inputs
<Input
  id="event-name"
  aria-label="Event name"
  aria-required="true"
  aria-invalid={!!errors.event_name}
  aria-describedby={errors.event_name ? "event-name-error" : undefined}
/>
```

**Required Keyboard Navigation:**
```tsx
// Arrow key navigation between steps
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && canProceed) {
      goToNextStep();
    } else if (e.key === 'ArrowLeft' && currentStep !== 'packages') {
      goToPreviousStep();
    } else if (e.key === 'Escape') {
      // Close widget or go back
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [currentStep, canProceed]);
```

**Tasks:**
- [ ] Add ARIA labels to all interactive elements
- [ ] Add role attributes for custom components
- [ ] Implement keyboard navigation (Arrow keys, Escape, Tab)
- [ ] Add focus management when switching steps
- [ ] Add screen reader announcements
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Run automated accessibility audit (axe, Lighthouse)
- [ ] Achieve Lighthouse Accessibility score 95+

---

### 4. ⚠️ Data Validation: Yup Schema
**Status:** PARTIAL - needs improvement  
**Priority:** P0 - DATA INTEGRITY

**Current Validation Issues:**
```tsx
// ❌ Weak email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ❌ No phone validation
// ❌ No max length checks
// ❌ No special character restrictions
```

**Required Fix:**
```tsx
import * as yup from 'yup';

const orderFormSchema = yup.object().shape({
  event_name: yup
    .string()
    .required('Event name is required')
    .min(3, 'Event name must be at least 3 characters')
    .max(100, 'Event name too long')
    .matches(/^[a-zA-Z0-9\s\-',.&]+$/, 'Invalid characters in event name'),
  
  contact_email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long'),
  
  contact_phone: yup
    .string()
    .nullable()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number (E.164 format)'),
  
  contact_name: yup
    .string()
    .required('Contact name is required')
    .min(2, 'Name too short')
    .max(100, 'Name too long')
    .matches(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters'),
  
  guest_count: yup
    .number()
    .required('Guest count is required')
    .min(1, 'Must have at least 1 guest')
    .max(10000, 'Guest count too high')
    .integer('Guest count must be a whole number'),
  
  venue_address: yup
    .string()
    .nullable()
    .max(500, 'Address too long'),
  
  special_instructions: yup
    .string()
    .nullable()
    .max(2000, 'Instructions too long'),
});
```

**Tasks:**
- [ ] Install `yup` package
- [ ] Create validation schema
- [ ] Add field-level validation (show errors as user types)
- [ ] Add form-level validation (before submit)
- [ ] Display validation errors near fields
- [ ] Test all edge cases
- [ ] Add unit tests for validation schema

---

### 5. ⚠️ Error Handling & Recovery
**Status:** PARTIAL - needs improvement  
**Priority:** P0 - USER EXPERIENCE

**Current Issues:**
- Generic error messages
- Full page reload on error loses user progress
- No retry mechanism
- No partial save

**Required Improvements:**

```tsx
// Error state with recovery options
const ErrorState = ({ error, onRetry, onReset }: ErrorStateProps) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <Card className="max-w-md w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <CardTitle>Something went wrong</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{error.message}</p>
        
        {/* Specific error guidance */}
        {error.code === 'NETWORK_ERROR' && (
          <Alert>
            <AlertDescription>
              Please check your internet connection and try again.
            </AlertDescription>
          </Alert>
        )}
        
        {error.code === 'VALIDATION_ERROR' && (
          <Alert>
            <AlertDescription>
              Please review your information and correct any errors.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Button onClick={onRetry} className="flex-1">
            Try Again
          </Button>
          <Button onClick={onReset} variant="outline" className="flex-1">
            Start Over
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Auto-save form data to localStorage
useEffect(() => {
  const saveFormData = debounce(() => {
    localStorage.setItem(
      `catering-order-draft-${tenant?.id}`,
      JSON.stringify({
        orderForm,
        selectedPackage: selectedPackage?.id,
        currentStep,
        timestamp: Date.now(),
      })
    );
  }, 1000);

  saveFormData();
  
  return () => saveFormData.cancel();
}, [orderForm, selectedPackage, currentStep]);

// Restore from localStorage on mount
useEffect(() => {
  const savedData = localStorage.getItem(`catering-order-draft-${tenant?.id}`);
  if (savedData) {
    const { orderForm, selectedPackage, currentStep, timestamp } = JSON.parse(savedData);
    
    // Only restore if less than 24 hours old
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
      setOrderForm(orderForm);
      setCurrentStep(currentStep);
      // ... restore selectedPackage
      
      toast.info('We restored your previous draft');
    }
  }
}, [tenant?.id]);
```

**Tasks:**
- [ ] Add error recovery UI with retry/reset options
- [ ] Implement auto-save to localStorage
- [ ] Add "restore draft" functionality
- [ ] Add specific error messages for different failure types
- [ ] Add retry mechanism for network errors
- [ ] Test error scenarios
- [ ] Add analytics for error tracking

---

## 🟡 HIGH PRIORITY ISSUES (Should Fix Before Launch)

### 6. Mobile Responsiveness
**Status:** PARTIAL  
**Priority:** P1 - 60%+ traffic is mobile

**Issues:**
- Progress stepper overflows on small screens
- Small tap targets (< 44px)
- Horizontal scrolling on packages grid
- Date/time pickers hard to use on mobile

**Required Fixes:**
```tsx
// Responsive progress stepper
<div className="flex gap-1 md:gap-2 overflow-x-auto pb-2">
  {steps.map((step, index) => (
    <div 
      key={step}
      className="flex-1 min-w-[60px] md:min-w-[100px]"
    >
      {/* Step indicator */}
    </div>
  ))}
</div>

// Touch-friendly tap targets
<Button 
  className="min-h-[44px] min-w-[44px]" // WCAG minimum
>
  Select
</Button>

// Responsive grid
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Package cards */}
</div>
```

**Tasks:**
- [ ] Fix progress stepper overflow
- [ ] Increase tap target sizes to 44×44px minimum
- [ ] Make grid responsive (1 col mobile, 2 col tablet, 3 col desktop)
- [ ] Test on iOS Safari and Android Chrome
- [ ] Test on small screens (320px width)
- [ ] Fix horizontal scrolling issues

---

### 7. Performance Optimization
**Status:** NOT OPTIMIZED  
**Priority:** P1 - Large component (959 lines)

**Current Issues:**
- 959 lines in single component
- No code splitting
- No memoization
- Re-renders entire form on every input change

**Required Optimizations:**

```tsx
// Split into smaller components
const PackageSelection = React.memo(({ packages, onSelect }) => {
  // Package selection UI
});

const CustomizeStep = React.memo(({ orderForm, onChange }) => {
  // Customize form
});

const DetailsStep = React.memo(({ orderForm, onChange }) => {
  // Details form
});

// Memoize expensive calculations
const totalPrice = useMemo(
  () => getTotalPrice(),
  [selectedPackage, orderForm.guest_count]
);

// Debounce auto-save
const debouncedSave = useDebouncedCallback(
  (data) => {
    localStorage.setItem('draft', JSON.stringify(data));
  },
  1000
);
```

**Tasks:**
- [ ] Split component into smaller sub-components
- [ ] Add React.memo to prevent unnecessary re-renders
- [ ] Memoize expensive calculations
- [ ] Debounce auto-save operations
- [ ] Lazy load package images
- [ ] Add loading states
- [ ] Measure performance with React DevTools Profiler
- [ ] Target: Initial render < 1s, interaction latency < 100ms

---

### 8. Loading States & Skeleton UI
**Status:** BASIC  
**Priority:** P1 - USER EXPERIENCE

**Current:**
```tsx
{loading && <div>Loading...</div>}
```

**Required:**
```tsx
// Skeleton cards for packages
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {[1, 2, 3].map((i) => (
    <Card key={i} className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  ))}
</div>

// Progress indicator for submit
<Button disabled={submitting}>
  {submitting ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Submitting...
    </>
  ) : (
    'Submit Order'
  )}
</Button>
```

**Tasks:**
- [ ] Add skeleton loading for package cards
- [ ] Add skeleton loading for form fields
- [ ] Add progress indicator for submission
- [ ] Add optimistic UI updates
- [ ] Test loading states

---

### 9. Form Persistence & Draft Recovery
**Status:** NOT IMPLEMENTED  
**Priority:** P1 - PREVENT DATA LOSS

**Implementation:**
See "Error Handling & Recovery" section above for full implementation.

**Additional Requirements:**
- [ ] Show "Draft saved" toast notification
- [ ] Add "Clear draft" button
- [ ] Handle multiple concurrent drafts (different packages)
- [ ] Expire drafts after 7 days
- [ ] Test browser crash recovery
- [ ] Test localStorage quota exceeded

---

### 10. Analytics & Conversion Tracking
**Status:** NOT IMPLEMENTED  
**Priority:** P1 - BUSINESS METRICS

**Required Events:**
```tsx
// Track widget steps
useEffect(() => {
  trackEvent('catering_widget_step_viewed', {
    step: currentStep,
    package_id: selectedPackage?.id,
    tenant_id: tenant?.id,
  });
}, [currentStep]);

// Track package selection
const handlePackageSelect = (pkg) => {
  trackEvent('catering_package_selected', {
    package_id: pkg.id,
    package_name: pkg.name,
    price: pkg.price_per_person,
    pricing_type: pkg.pricing_type,
  });
  
  setSelectedPackage(pkg);
  setCurrentStep('customize');
};

// Track form abandonment
useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (orderForm.event_name || orderForm.contact_email) {
      trackEvent('catering_form_abandoned', {
        step: currentStep,
        fields_filled: Object.keys(orderForm).filter(k => orderForm[k]).length,
      });
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [orderForm, currentStep]);

// Track submission
const handleOrderSubmit = async () => {
  const startTime = Date.now();
  
  try {
    await createOrder(orderData);
    
    trackEvent('catering_order_submitted', {
      package_id: selectedPackage.id,
      guest_count: orderForm.guest_count,
      total_price: getTotalPrice(),
      time_to_complete_ms: Date.now() - startTime,
    });
  } catch (error) {
    trackEvent('catering_order_failed', {
      error: error.message,
      step: currentStep,
    });
  }
};
```

**Tasks:**
- [ ] Implement analytics tracking
- [ ] Track all major user actions
- [ ] Track conversion funnel
- [ ] Track errors and failures
- [ ] Set up analytics dashboard
- [ ] Monitor conversion rate

---

### 11. Package Image Optimization
**Status:** NOT IMPLEMENTED  
**Priority:** P1 - PERFORMANCE

**Required:**
```tsx
// Lazy load images
<img
  src={pkg.image_url}
  alt={pkg.name}
  loading="lazy"
  className="w-full h-48 object-cover"
  onError={(e) => {
    e.currentTarget.src = '/placeholder-package.jpg';
  }}
/>

// Or use Next.js Image (if available)
<Image
  src={pkg.image_url || '/placeholder-package.jpg'}
  alt={pkg.name}
  width={400}
  height={300}
  className="w-full h-48 object-cover"
  placeholder="blur"
  blurDataURL="/placeholder-blur.jpg"
/>
```

**Tasks:**
- [ ] Add lazy loading to package images
- [ ] Add error fallback images
- [ ] Optimize image sizes (WebP format)
- [ ] Add blur placeholder
- [ ] Test with slow 3G network

---

### 12. Guest Count Validation & UI
**Status:** BASIC  
**Priority:** P1 - USER EXPERIENCE

**Improvements:**
```tsx
// Dynamic min/max based on package
<div className="space-y-2">
  <Label htmlFor="guest-count">
    Number of Guests
    {selectedPackage && (
      <span className="text-sm text-muted-foreground ml-2">
        ({selectedPackage.min_guests} - {selectedPackage.max_guests || '∞'})
      </span>
    )}
  </Label>
  
  <Input
    id="guest-count"
    type="number"
    min={selectedPackage?.min_guests}
    max={selectedPackage?.max_guests}
    value={orderForm.guest_count}
    onChange={(e) => {
      const count = parseInt(e.target.value) || 0;
      setOrderForm({ ...orderForm, guest_count: count });
      
      // Show warning if out of range
      if (!validateGuestCount(count)) {
        setGuestCountError(
          `This package is designed for ${selectedPackage.min_guests}-${selectedPackage.max_guests} guests`
        );
      } else {
        setGuestCountError(null);
      }
    }}
    className={guestCountError ? 'border-red-500' : ''}
  />
  
  {guestCountError && (
    <p className="text-sm text-red-500">{guestCountError}</p>
  )}
  
  {/* Real-time pricing update */}
  {selectedPackage && (
    <div className="text-sm text-muted-foreground">
      Estimated total: <span className="font-semibold">
        {formatPrice(getTotalPrice())}
      </span>
    </div>
  )}
</div>
```

**Tasks:**
- [ ] Add dynamic min/max display
- [ ] Add real-time validation
- [ ] Add warning for out-of-range values
- [ ] Show estimated total as user types
- [ ] Test edge cases (0, negative, decimals)

---

## 🟢 MEDIUM PRIORITY (Nice to Have)

### 13. TypeScript Improvements
**Status:** PARTIAL  
**Priority:** P2 - CODE QUALITY

**Issues:**
- Some `any` types
- Missing JSDoc comments
- No strict null checks in some areas

**Tasks:**
- [ ] Replace all `any` with proper types
- [ ] Add JSDoc comments for all functions
- [ ] Enable strict mode in tsconfig
- [ ] Add prop types documentation
- [ ] Run strict type checking

---

### 14. Unit Tests
**Status:** MISSING  
**Priority:** P2 - QUALITY ASSURANCE

**Required Tests:**
```tsx
describe('CateringWidget', () => {
  describe('getTotalPrice', () => {
    it('calculates per-person pricing correctly', () => {
      // Test
    });
    
    it('calculates flat-rate pricing correctly', () => {
      // Test
    });
    
    it('calculates per-tray pricing correctly', () => {
      // Test
    });
  });
  
  describe('formatPackagePrice', () => {
    it('formats per-person pricing correctly', () => {
      // Test
    });
    
    it('formats flat-rate pricing correctly', () => {
      // Test
    });
  });
  
  describe('validation', () => {
    it('validates email format', () => {
      // Test
    });
    
    it('validates guest count range', () => {
      // Test
    });
  });
});
```

**Tasks:**
- [ ] Write unit tests for pricing calculations
- [ ] Write unit tests for validation
- [ ] Write unit tests for form submission
- [ ] Achieve 80%+ code coverage
- [ ] Set up CI to run tests

---

### 15. Documentation
**Status:** MINIMAL  
**Priority:** P2 - MAINTAINABILITY

**Required Docs:**
- [ ] Component API documentation
- [ ] Props interface documentation
- [ ] Usage examples
- [ ] Storybook stories
- [ ] Integration guide

---

## 📊 Production Readiness Score

### Current Score: 60/100 🟡

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Security | 30/100 | 25% | 7.5 |
| Accessibility | 40/100 | 20% | 8.0 |
| Functionality | 90/100 | 20% | 18.0 |
| Performance | 50/100 | 15% | 7.5 |
| UX | 70/100 | 10% | 7.0 |
| Code Quality | 60/100 | 10% | 6.0 |
| **TOTAL** | | **100%** | **54.0** |

### Target Score: 90/100 ✅

After implementing all critical and high-priority fixes:

| Category | Target | Weight | Weighted |
|----------|--------|--------|----------|
| Security | 95/100 | 25% | 23.75 |
| Accessibility | 95/100 | 20% | 19.0 |
| Functionality | 95/100 | 20% | 19.0 |
| Performance | 85/100 | 15% | 12.75 |
| UX | 90/100 | 10% | 9.0 |
| Code Quality | 80/100 | 10% | 8.0 |
| **TOTAL** | | **100%** | **91.5** |

---

## 🚀 Implementation Timeline

### Phase 1: Critical Fixes (Day 1-2, 16 hours)
- ✅ Multi-pricing model (8 hours)
  - Migration + types + widget + manager
- ⚠️ Security (2 hours)
  - Input sanitization
- ⚠️ Accessibility (4 hours)
  - ARIA labels + keyboard nav
- ⚠️ Validation (2 hours)
  - Yup schema

### Phase 2: High Priority (Day 3-4, 12 hours)
- Mobile responsiveness (3 hours)
- Performance optimization (3 hours)
- Loading states (2 hours)
- Form persistence (2 hours)
- Analytics (2 hours)

### Phase 3: Medium Priority (Day 5, 8 hours)
- TypeScript improvements (2 hours)
- Unit tests (4 hours)
- Documentation (2 hours)

**Total Estimated Time:** 36 hours (4.5 days for 2 engineers)

---

## ✅ Sign-Off Checklist

### Before Production Deployment
- [ ] All P0 (Critical) issues resolved
- [ ] All P1 (High) issues resolved
- [ ] Production readiness score ≥ 90/100
- [ ] Security audit passed
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Performance benchmarks met (Lighthouse score ≥ 90)
- [ ] Unit tests pass with ≥ 80% coverage
- [ ] Integration tests pass
- [ ] Manual QA testing complete
- [ ] Stakeholder approval received

### Post-Deployment Monitoring
- [ ] Analytics tracking working
- [ ] Error tracking working (Sentry)
- [ ] Performance monitoring active
- [ ] Conversion funnel tracking active
- [ ] User feedback mechanism in place

---

**Last Updated:** October 17, 2025  
**Next Review:** After Phase 1 completion
