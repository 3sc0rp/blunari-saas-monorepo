# 🚨 Catering Widget - Critical Issues Quick Reference

## 🔴 FIX IMMEDIATELY (This Week)

### 1. Security Vulnerability - XSS Attack Risk
**File:** `CateringWidget.tsx` Lines 543-658  
**Risk:** High - User input not sanitized

```tsx
// ❌ CURRENT (VULNERABLE)
onChange={(e) => setOrderForm(prev => ({
  ...prev,
  event_name: e.target.value  // Direct input - XSS risk!
}))}

// ✅ FIX
import DOMPurify from 'isomorphic-dompurify';

const sanitize = (value: string) => 
  DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();

onChange={(e) => setOrderForm(prev => ({
  ...prev,
  event_name: sanitize(e.target.value)
}))}
```

**Install:** `npm install isomorphic-dompurify`

---

### 2. Accessibility - WCAG Violation
**File:** `CateringWidget.tsx` Throughout  
**Risk:** Legal compliance issue (ADA lawsuit risk)

```tsx
// ❌ CURRENT (NON-COMPLIANT)
<div className="progress-indicator">
  {/* No ARIA labels */}
</div>

// ✅ FIX
<div 
  role="progressbar"
  aria-valuenow={stepIndex}
  aria-valuemin={0}
  aria-valuemax={3}
  aria-label={`Step ${stepIndex + 1} of 4: ${currentStep}`}
  tabIndex={0}
>
  {/* Progress content */}
</div>

// Add keyboard navigation
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && canProceed) nextStep();
    if (e.key === 'ArrowLeft' && canGoBack) prevStep();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [canProceed, canGoBack]);
```

---

### 3. Validation - Weak Email/Phone Check
**File:** `CateringWidget.tsx` Lines 216-240  
**Risk:** Data quality issues, potential injection

```tsx
// ❌ CURRENT (TOO PERMISSIVE)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) { /* error */ }

// ✅ FIX
import * as yup from 'yup';

const schema = yup.object({
  contact_email: yup
    .string()
    .required('Email required')
    .email('Invalid email')
    .max(255),
  
  contact_phone: yup
    .string()
    .nullable()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone (E.164)'),
  
  event_name: yup
    .string()
    .required()
    .min(3)
    .max(100)
    .matches(/^[a-zA-Z0-9\s\-',.]+$/, 'Invalid characters'),
});

// Validate
try {
  await schema.validate(orderForm);
} catch (err) {
  setErrors(err.errors);
}
```

**Install:** `npm install yup`

---

## 🟡 FIX SOON (Next Week)

### 4. Mobile UX - Poor Experience
**File:** `CateringWidget.tsx` Lines 350-375  
**Issue:** Progress stepper overflows, tap targets too small

```tsx
// ✅ ADD MOBILE STEPPER
{/* Desktop */}
<div className="hidden md:flex items-center justify-between">
  {/* Existing stepper */}
</div>

{/* Mobile - Dots */}
<div className="md:hidden flex items-center justify-center gap-2">
  {steps.map((step, i) => (
    <div 
      key={step}
      className={`h-2 rounded-full transition-all ${
        i === current ? 'w-8 bg-orange-600' : 
        i < current ? 'w-2 bg-green-500' : 
        'w-2 bg-gray-300'
      }`}
    />
  ))}
</div>

{/* Increase tap targets */}
<Input className="min-h-[44px] text-base" />
<Button className="min-h-[44px] px-6" />
```

---

### 5. Auto-Save - No Progress Preservation
**File:** New feature needed  
**Issue:** Users lose data on browser crash

```tsx
// ✅ ADD AUTO-SAVE
import { useDebounce } from '@/hooks/useDebounce';

const debouncedForm = useDebounce(orderForm, 2000);

useEffect(() => {
  if (currentStep !== 'packages' && debouncedForm.event_name) {
    localStorage.setItem(`catering_draft_${tenant.id}`, JSON.stringify({
      form: debouncedForm,
      package: selectedPackage,
      step: currentStep,
      timestamp: Date.now(),
    }));
  }
}, [debouncedForm]);

// Restore on mount
useEffect(() => {
  const draft = localStorage.getItem(`catering_draft_${tenant.id}`);
  if (draft) {
    const { form, package: pkg, timestamp } = JSON.parse(draft);
    const hours = (Date.now() - timestamp) / (1000 * 60 * 60);
    
    if (hours < 24 && confirm('Restore unfinished order?')) {
      setOrderForm(form);
      setSelectedPackage(pkg);
    }
  }
}, []);
```

---

### 6. Error Handling - User Loses Data
**File:** `CateringWidget.tsx` Lines 103-193  
**Issue:** Full reload loses all form data

```tsx
// ❌ CURRENT (DATA LOSS)
<Button onClick={() => window.location.reload()}>
  Try Again
</Button>

// ✅ FIX
// Save draft before showing error
useEffect(() => {
  if (error && orderForm.event_name) {
    sessionStorage.setItem('error_draft', JSON.stringify(orderForm));
  }
}, [error]);

// Recovery actions
const ERROR_ACTIONS = {
  NETWORK_ERROR: [
    { label: 'Retry', action: () => refetch() },
    { label: 'Save Draft', action: () => saveDraft() },
    { label: 'Contact Support', action: () => openSupport() },
  ],
  TENANT_NOT_FOUND: [
    { label: 'Home', action: () => navigate('/') },
    { label: 'Contact', action: () => openContact() },
  ],
};
```

---

## 🟢 Nice to Have (Later)

### 7. Performance - Slow with Many Packages
```tsx
// ✅ ADD MEMOIZATION
const PackageCard = memo(({ pkg, onSelect }) => {
  // Component code
}, (prev, next) => prev.pkg.id === next.pkg.id);

// ✅ LAZY LOAD IMAGES
<img 
  src={pkg.image_url} 
  loading="lazy"
  decoding="async"
/>
```

---

### 8. Analytics - No Tracking
```tsx
// ✅ ADD TRACKING
import { analytics } from '@/lib/analytics';

useEffect(() => {
  analytics.track('Catering Step Viewed', {
    step: currentStep,
    tenant_id: tenant?.id,
  });
}, [currentStep]);

const handlePackageSelect = (pkg) => {
  analytics.track('Package Selected', {
    package_id: pkg.id,
    price: pkg.price_per_person,
  });
  // ... rest of logic
};
```

---

## 🎯 Quick Win Checklist

**Can be done in 1-2 hours:**

- [ ] Add `DOMPurify` to all text inputs (Security)
- [ ] Add `aria-label` to progress steps (Accessibility)
- [ ] Increase button `min-h-[44px]` (Mobile UX)
- [ ] Add email validation with `yup` (Data Quality)
- [ ] Add localStorage auto-save (UX)

**Code snippets ready to copy-paste above! ☝️**

---

## 📞 Need Help?

**Security Questions:** security@blunari.ai  
**Accessibility Questions:** a11y@blunari.ai  
**Technical Questions:** dev-team@blunari.ai  

**Documentation:**
- Full Analysis: `CATERING_WIDGET_ANALYSIS.md`
- Action Plan: `CATERING_WIDGET_ACTION_PLAN.md`
- This Quick Ref: `CATERING_CRITICAL_ISSUES.md`

---

**Last Updated:** October 16, 2025  
**Priority:** 🔴 High - Address ASAP
