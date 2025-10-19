# Phase 3 Catering Widget - Production Testing Guide

**Date**: October 19, 2025  
**Deployment Status**: ✅ LIVE on Production  
**Commits**: a3a63900 (frontend) + 6f86a364 (docs)

---

## 🎯 Quick Start

### Local Testing (RECOMMENDED FIRST)
```
✅ Dev Server Running: http://localhost:5173/

Test URL: http://localhost:5173/catering/{tenant-slug}
Example: http://localhost:5173/catering/droodwick-grille
```

### Production Testing
```
Production URL: https://app.blunari.ai/catering/{tenant-slug}
Example: https://app.blunari.ai/catering/droodwick-grille
```

---

## 📋 Phase 1: Functional Testing Checklist

### Step 1: Package Selection Component

**URL**: `/catering/{slug}`

- [ ] **Loading State**
  - [ ] Spinner displays during initial load
  - [ ] "Loading Catering Services" message shows
  - [ ] No layout shift when packages load

- [ ] **Package Grid**
  - [ ] Packages display in responsive grid (1/2/3 columns)
  - [ ] Staggered animations play smoothly (50ms delay)
  - [ ] "Popular" badges show on featured packages
  - [ ] Dietary tags display correctly
  - [ ] Price formatting is correct ($X.XX format)
  - [ ] Package descriptions are readable

- [ ] **Package Selection**
  - [ ] Click on package card selects it
  - [ ] "Select This Package" button is visible
  - [ ] Clicking button navigates to customize step
  - [ ] Selected package data persists in context

- [ ] **Empty State** (if no packages)
  - [ ] Empty state card displays
  - [ ] Restaurant contact email shows (if available)
  - [ ] Restaurant contact phone shows (if available)
  - [ ] "Contact Us" message is clear

- [ ] **Error Handling**
  - [ ] Error message displays if tenant not found
  - [ ] "Try Again" button works
  - [ ] Error doesn't break the page

**Expected Analytics Events**:
- `widget_viewed` - On page load
- `package_viewed` - When scrolling to package
- `package_selected` - When selecting package

---

### Step 2: Customize Order Component

**Expected**: Loads after selecting a package

- [ ] **Form Fields**
  - [ ] Event name input accepts text
  - [ ] Date picker opens correctly
  - [ ] Date picker enforces 3-day minimum from today
  - [ ] Past dates are disabled
  - [ ] Time input accepts valid time (HH:MM format)
  - [ ] Guest count input accepts numbers only
  - [ ] Special instructions textarea accepts text

- [ ] **Validation**
  - [ ] Guest count validates against package min/max
  - [ ] Error message shows for invalid guest count
  - [ ] Error clears when valid number entered
  - [ ] Date validation shows error for past dates
  - [ ] Required fields show errors when empty

- [ ] **Service Type Selector**
  - [ ] All service types are selectable
  - [ ] "Delivery", "Pickup", "Full Service" options visible
  - [ ] Selection persists when navigating back

- [ ] **Price Calculation**
  - [ ] Base price displays correctly
  - [ ] Price updates when guest count changes
  - [ ] Price breakdown shows clearly
  - [ ] Sticky order summary follows scroll (desktop)

- [ ] **Navigation**
  - [ ] "Continue to Details" button enables when form valid
  - [ ] Button disabled when form invalid
  - [ ] Back button returns to package selection
  - [ ] Form data persists when navigating back

**Expected Analytics Events**:
- `customization_started` - On step load
- `guest_count_changed` - When changing guest count
- `service_type_selected` - When selecting service type

---

### Step 3: Contact Details Component

**Expected**: Loads after completing customization

- [ ] **Form Fields**
  - [ ] Contact name input accepts text
  - [ ] Email input accepts text
  - [ ] Phone input accepts numbers/dashes
  - [ ] Venue name input accepts text (optional)
  - [ ] Venue address textarea accepts text (optional)

- [ ] **Real-time Validation**
  - [ ] Email validation shows error for invalid format
  - [ ] Email error: "Please enter a valid email address"
  - [ ] Error clears when valid email entered
  - [ ] Phone validation accepts optional field
  - [ ] Name validation requires non-empty trimmed value

- [ ] **Order Summary**
  - [ ] Selected package name displays
  - [ ] Event details display correctly
  - [ ] Guest count shows
  - [ ] Service type shows
  - [ ] Total price displays
  - [ ] Special instructions show (if provided)

- [ ] **Form Submission**
  - [ ] "Place Order" button enabled when form valid
  - [ ] Loading spinner shows during submission
  - [ ] Button text changes to "Placing Order..."
  - [ ] Button disabled during submission
  - [ ] Success navigates to confirmation step
  - [ ] Error message displays if submission fails

- [ ] **Error Recovery**
  - [ ] Error message shows full error details
  - [ ] "Try Again" button re-enables form
  - [ ] Form data persists after error
  - [ ] Can retry submission without losing data

**Expected Analytics Events**:
- `contact_details_viewed` - On step load
- `order_submitted_success` - On successful submission
- `order_submitted_failure` - On submission error

---

### Step 4: Order Confirmation Component

**Expected**: Loads after successful order submission

- [ ] **Success Animation**
  - [ ] Celebratory animation plays on load
  - [ ] Confetti effect displays (if implemented)
  - [ ] Smooth fade-in of content

- [ ] **Order Summary Card**
  - [ ] Order confirmation number displays (if generated)
  - [ ] Package name shows
  - [ ] Event name shows
  - [ ] Event date shows (formatted)
  - [ ] Guest count shows
  - [ ] Service type shows
  - [ ] Total price shows
  - [ ] Contact details show

- [ ] **What Happens Next Section**
  - [ ] Clear next steps are listed
  - [ ] Expected response time is stated
  - [ ] Contact information for questions provided

- [ ] **Call to Action**
  - [ ] "Place Another Order" button visible
  - [ ] Button click reloads page to step 1
  - [ ] Session data clears properly

- [ ] **Trust Indicators**
  - [ ] Footer displays security/privacy indicators
  - [ ] Restaurant branding consistent

**Expected Analytics Events**:
- `order_confirmed_viewed` - On step load
- `place_another_order_clicked` - When CTA clicked

---

## 📊 Phase 2: Auto-save & Draft Recovery Testing

### Auto-save Functionality

**Test Steps**:
1. Open catering widget
2. Select a package
3. Fill out customization form (partially)
4. **Wait 2 seconds without typing**
5. Check browser DevTools → Application → Local Storage
6. Look for key: `catering_draft_{slug}`

**Expected Behavior**:
- [ ] Draft saves automatically after 2s debounce
- [ ] Draft contains all form field values
- [ ] Draft includes selected package ID
- [ ] Draft includes timestamp

### Draft Recovery

**Test Steps**:
1. Complete auto-save test above
2. **Reload the page** (Ctrl+R or F5)
3. Observe notification banner at top

**Expected Behavior**:
- [ ] Draft notification displays immediately
- [ ] Shows age of draft (e.g., "2 minutes ago")
- [ ] "Restore Draft" button is visible
- [ ] "Start Fresh" button is visible

**Restore Draft**:
- [ ] Click "Restore Draft"
- [ ] Form fields populate with saved values
- [ ] Selected package loads correctly
- [ ] Navigation advances to correct step
- [ ] Notification dismisses

**Start Fresh**:
- [ ] Click "Start Fresh"
- [ ] Draft is cleared from localStorage
- [ ] Form resets to empty state
- [ ] Returns to package selection step
- [ ] Notification dismisses

---

## 🔍 Phase 3: Analytics Verification

### Enable Debug Mode

**In Browser Console (F12)**:
```javascript
localStorage.setItem('ANALYTICS_DEBUG', 'true');
localStorage.setItem('VITE_ANALYTICS_DEBUG', 'true');

// Reload page
location.reload();
```

### Client-Side Analytics (GA4)

**Test Each Step**:
1. Open browser console (F12)
2. Navigate through catering flow
3. Watch for console logs

**Expected Console Messages**:
```
GA4 Event Sent: {
  event_name: "widget_viewed",
  tenant_id: "...",
  session_id: "...",
  ...
}

GA4 Event Sent: {
  event_name: "package_selected",
  package_id: "...",
  ...
}
```

**Checklist**:
- [ ] `widget_viewed` fires on page load
- [ ] `package_viewed` fires when scrolling to package
- [ ] `package_selected` fires on package click
- [ ] `customization_started` fires on step 2
- [ ] `guest_count_changed` fires on guest count change
- [ ] `service_type_selected` fires on service type click
- [ ] `order_submitted_success` fires after submission
- [ ] `order_confirmed_viewed` fires on confirmation screen

### Server-Side Analytics (Supabase)

**Test Steps**:
1. Complete a full order flow
2. Go to Supabase Dashboard
3. Navigate to Table Editor → `analytics_events`
4. Run this query:

```sql
SELECT 
  event_name,
  tenant_id,
  session_id,
  event_data,
  created_at
FROM analytics_events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Expected Results**:
- [ ] Events are recorded in database
- [ ] `event_name` matches GA4 events
- [ ] `tenant_id` is correct
- [ ] `session_id` is consistent per session
- [ ] `event_data` contains relevant metadata
- [ ] Timestamps are accurate

**Verify Event Counts**:
```sql
SELECT 
  event_name,
  COUNT(*) as event_count,
  MAX(created_at) as last_event
FROM analytics_events
WHERE tenant_id = 'YOUR_TENANT_ID'
GROUP BY event_name
ORDER BY event_count DESC;
```

**Expected**:
- Multiple events per session
- All event types represented
- Recent timestamps

---

## 💾 Phase 4: Database Verification

### Check Catering Orders

**SQL Query** (Supabase SQL Editor):
```sql
SELECT 
  id,
  tenant_id,
  package_id,
  contact_name,
  contact_email,
  contact_phone,
  event_name,
  event_date,
  event_time,
  guest_count,
  service_type,
  special_instructions,
  venue_name,
  venue_address,
  total_price,
  created_at
FROM catering_orders
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY created_at DESC
LIMIT 10;
```

**Verify**:
- [ ] New orders appear after submission
- [ ] All form fields are saved correctly
- [ ] Prices match what was displayed
- [ ] Timestamps are accurate
- [ ] Tenant ID matches

### Check Tenant Contact Fields

**SQL Query**:
```sql
SELECT 
  id,
  name,
  slug,
  contact_email,
  contact_phone
FROM tenants
WHERE slug = 'YOUR_TENANT_SLUG';
```

**Verify**:
- [ ] `contact_email` column exists
- [ ] `contact_phone` column exists
- [ ] Values display in empty state (if no packages)

### Check Analytics Events Table

**SQL Query**:
```sql
-- Verify table structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;
```

**Expected Columns**:
- [ ] `id` (uuid)
- [ ] `tenant_id` (uuid)
- [ ] `event_name` (text)
- [ ] `session_id` (text)
- [ ] `event_data` (jsonb)
- [ ] `created_at` (timestamp)

---

## 📱 Phase 5: Mobile Responsiveness

### Test on Multiple Devices

**Devices to Test**:
- [ ] iPhone (Safari, Chrome)
- [ ] Android phone (Chrome)
- [ ] iPad/Tablet (Safari, Chrome)
- [ ] Desktop (Chrome, Firefox, Safari, Edge)

### Responsive Breakpoints

**Test at These Widths** (Chrome DevTools):
- [ ] 320px (small phone)
- [ ] 375px (iPhone SE)
- [ ] 768px (tablet)
- [ ] 1024px (desktop)
- [ ] 1440px (large desktop)

### Mobile-Specific Tests

**Package Grid**:
- [ ] 1 column on mobile (<640px)
- [ ] 2 columns on tablet (640-1024px)
- [ ] 3 columns on desktop (>1024px)
- [ ] Cards are tappable (min 44x44px)
- [ ] Spacing is adequate for touch

**Forms**:
- [ ] Input fields are large enough (min 44px height)
- [ ] Date picker works on mobile
- [ ] Keyboard doesn't obscure inputs
- [ ] Validation errors are visible
- [ ] Submit button is reachable

**Navigation**:
- [ ] Progress stepper wraps nicely on small screens
- [ ] Step labels hide on very small screens
- [ ] Back buttons are accessible
- [ ] No horizontal scrolling

**Performance**:
- [ ] Page loads in <3s on 3G
- [ ] Animations are smooth (60fps)
- [ ] No layout shift during load
- [ ] Images load progressively

---

## 🎭 Phase 6: Edge Cases & Error Scenarios

### Test Error Handling

**Scenario 1: Invalid Tenant Slug**
- [ ] Navigate to `/catering/invalid-slug`
- [ ] Expect: "Restaurant Not Found" error
- [ ] "Try Again" button works

**Scenario 2: No Packages Available**
- [ ] Tenant with zero packages
- [ ] Expect: Empty state with contact info
- [ ] Contact information displays correctly

**Scenario 3: Network Failure During Submission**
- [ ] Disable network in DevTools
- [ ] Try to submit order
- [ ] Expect: Error message displays
- [ ] Form data is not lost
- [ ] Re-enable network and retry succeeds

**Scenario 4: Invalid Form Data**
- [ ] Try to submit with missing required fields
- [ ] Expect: Validation errors show
- [ ] Submit button remains disabled
- [ ] Errors clear when fields fixed

**Scenario 5: Back/Forward Navigation**
- [ ] Fill form partially
- [ ] Navigate back to packages
- [ ] Select different package
- [ ] Navigate forward
- [ ] Expect: Form resets with new package

### Browser Compatibility

**Test in Multiple Browsers**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Check for**:
- [ ] Animations work consistently
- [ ] Forms submit correctly
- [ ] Date picker functions
- [ ] LocalStorage works
- [ ] Console shows no errors

---

## 🐛 Known Issues to Watch For

Based on the refactoring, monitor these potential issues:

### Issue 1: Context Provider Missing
**Symptom**: Error "useCateringContext must be used within CateringProvider"  
**Cause**: Component outside CateringProvider wrapper  
**Check**: Verify CateringWidget wraps all steps in `<CateringProvider>`

### Issue 2: State Not Persisting
**Symptom**: Form data disappears when navigating back/forward  
**Cause**: Auto-save not triggering or localStorage blocked  
**Debug**: Check localStorage in DevTools Application tab

### Issue 3: Navigation Issues
**Symptom**: Steps don't advance or back button doesn't work  
**Cause**: currentStep state not updating in context  
**Debug**: Check React DevTools → CateringProvider state

### Issue 4: Validation Errors
**Symptom**: Form shows unexpected errors or doesn't validate  
**Cause**: Yup schema mismatch or fieldErrors state issue  
**Debug**: Check console for validation errors

### Issue 5: Analytics Not Firing
**Symptom**: No GA4 events or server-side tracking  
**Cause**: Edge Function CORS or deployment issue  
**Debug**: Check Edge Function logs in Supabase dashboard

---

## 📊 Performance Benchmarks

### Expected Metrics

| Metric | Target | Acceptable | Red Flag |
|--------|--------|------------|----------|
| Initial Load | <2s | <3s | >5s |
| Step Navigation | <100ms | <200ms | >500ms |
| Form Auto-save | 2s debounce | 2s | >3s |
| Order Submission | <3s | <5s | >10s |
| Analytics Event | <500ms | <1s | >2s |

### How to Measure

**Chrome DevTools Performance**:
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Navigate through catering flow
5. Stop recording
6. Analyze timeline

**Look for**:
- [ ] No long tasks (>50ms)
- [ ] Smooth animations (60fps)
- [ ] Fast React render cycles
- [ ] Minimal re-renders

**Lighthouse Audit**:
1. Open DevTools
2. Go to Lighthouse tab
3. Select "Performance" + "Accessibility"
4. Click "Generate report"

**Target Scores**:
- [ ] Performance: >90
- [ ] Accessibility: >95
- [ ] Best Practices: >90

---

## ✅ Testing Completion Checklist

### Functional Requirements
- [ ] All 4 steps navigate correctly
- [ ] Package selection stores data in context
- [ ] Event customization validates guest count
- [ ] Contact form validates email/phone/name
- [ ] Order submission creates database record
- [ ] Confirmation screen displays complete summary

### Non-Functional Requirements
- [ ] Page loads in <3 seconds on 3G
- [ ] No console errors in production
- [ ] Analytics events fire for all user actions
- [ ] Auto-save triggers within 2 seconds
- [ ] Draft recovery prompts correctly
- [ ] Mobile responsive on <768px devices
- [ ] Accessible to screen readers (WCAG 2.1 AA)

### Data Integrity
- [ ] Server-side analytics records to `analytics_events`
- [ ] Catering orders save to `catering_orders`
- [ ] Tenant contact fields display in empty states
- [ ] No data loss during step navigation
- [ ] Draft persistence works across sessions

---

## 🚨 Bug Reporting Template

If you find issues, report using this format:

```markdown
## Bug Report

**Summary**: [One-line description]

**Component**: [CateringWidget | PackageSelection | CustomizeOrder | ContactDetails | OrderConfirmation]

**Steps to Reproduce**:
1. Navigate to [URL]
2. Click on [element]
3. Observe [behavior]

**Expected**: [What should happen]
**Actual**: [What actually happens]

**Environment**:
- Browser: [Chrome 118 / Firefox 119 / Safari 17]
- Device: [Desktop / Mobile / Tablet]
- URL: [https://app.blunari.ai/catering/...]

**Console Errors**: [Copy from F12 console]
**Screenshots**: [Attach if helpful]

**Severity**: [Critical | High | Medium | Low]
```

---

## 📞 Support & Documentation

**Documentation Files**:
- `COMPONENT_REFACTORING_COMPLETE.md` - Architecture guide (426 lines)
- `PHASE3_INTEGRATION_COMPLETE.md` - Integration summary
- `CONTINUATION_PROMPT_PHASE3_COMPLETE.md` - Continuation guide
- `.github/copilot-instructions.md` - Project instructions

**Vercel Deployment**:
- Dashboard: https://vercel.com/deewav3s-projects/client-dashboard/deployments
- Commit: a3a63900 (frontend integration)
- Status: ✅ Deployed

**Supabase Backend**:
- Database Migrations: Applied ✅
- Edge Function: `track-catering-analytics` deployed ✅
- Tables: `analytics_events`, `catering_orders`, `tenants`

---

## 🎯 Next Steps After Testing

Once testing is complete:

### Immediate Actions
1. Document any bugs found
2. Fix critical issues
3. Re-test after fixes
4. Update documentation with learnings

### Short-term (This Week)
1. Write unit tests for all 5 components
2. Write integration tests for complete flow
3. Set up E2E tests with Playwright
4. Run accessibility audit with axe-core

### Medium-term (This Month)
1. Performance optimization (if needed)
2. Add loading skeletons
3. Implement error boundaries per component
4. Add optimistic UI updates

---

**Ready to Test!** 🚀

Start with local testing (http://localhost:5173/catering/{slug}), then move to production testing once confident.
