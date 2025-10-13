# Manual Production Tests for app.blunari.ai
**Date:** October 13, 2025  
**Domain:** https://app.blunari.ai  
**Purpose:** Verify all security fixes deployed successfully

---

## ✅ TEST 1: Input Validation

### 1.1 Email Validation
Navigate to: `https://app.blunari.ai/bookings` → Click "New Booking"

**Test invalid emails:**
- [ ] `notanemail` → Should show "Invalid email" error
- [ ] `missing@domain` → Should show "Invalid email" error
- [ ] `@nodomain.com` → Should show "Invalid email" error
- [ ] `test@.com` → Should show "Invalid email" error

**Test valid emails:**
- [ ] `test@example.com` → Should accept
- [ ] `user.name+tag@domain.co.uk` → Should accept

**Result:** ___________

---

### 1.2 Phone Validation
**Test invalid phones:**
- [ ] `123` → Should show "Invalid phone" error
- [ ] `abcdefg` → Should show "Invalid phone" error
- [ ] `12345678901234567890` → Should show "Too long" error

**Test valid phones:**
- [ ] `+12025551234` → Should accept
- [ ] `(555) 123-4567` → Should accept (formatted)

**Result:** ___________

---

### 1.3 Party Size Limits
**Test invalid party sizes:**
- [ ] `0` → Should show "Minimum 1 guest" error
- [ ] `-5` → Should show validation error
- [ ] `51` → Should show "Maximum 50 guests" error
- [ ] `999` → Should show "Maximum 50 guests" error

**Test valid party sizes:**
- [ ] `1` → Should accept
- [ ] `25` → Should accept
- [ ] `50` → Should accept

**Result:** ___________

---

### 1.4 XSS Protection
**Test malicious inputs in "Special Requests" field:**
- [ ] `<script>alert("XSS")</script>` → Should show "Invalid characters" error
- [ ] `<img src=x onerror=alert("XSS")>` → Should show error
- [ ] `javascript:alert("XSS")` → Should show error
- [ ] `onclick="alert('XSS')"` → Should show error

**Test safe input:**
- [ ] `Please prepare a table near the window` → Should accept

**Result:** ___________

---

## ✅ TEST 2: Rate Limiting

### 2.1 Booking Creation Rate Limit
Navigate to: `https://app.blunari.ai/bookings`

**Create 4 bookings in quick succession:**

1. [ ] **Booking 1:** Fill form → Submit → Should succeed
   - Email: `ratetest1@example.com`
   
2. [ ] **Booking 2:** Refresh → New booking → Submit → Should succeed
   - Email: `ratetest2@example.com`
   
3. [ ] **Booking 3:** Refresh → New booking → Submit → Should succeed
   - Email: `ratetest3@example.com`
   
4. [ ] **Booking 4:** Refresh → New booking → Submit → **Should be BLOCKED**
   - Email: `ratetest4@example.com`
   - Expected error: "Rate limit exceeded" or "Too many requests" or "Try again in X seconds"

**Check for user feedback:**
- [ ] Does the UI show remaining attempts? (e.g., "2 attempts remaining")
- [ ] Does it show when the limit resets? (e.g., "Try again in 45 seconds")

**Wait 60 seconds, then test:**
- [ ] **Booking 5:** After 60s → New booking → Submit → Should succeed again

**Result:** ___________

---

## ✅ TEST 3: PII-Safe Logging

### 3.1 Browser Console Inspection
Open browser DevTools (F12) → Console tab

Navigate to: `https://app.blunari.ai/bookings`

**Create a booking with sensitive data:**
- Name: `John Sensitive Doe`
- Email: `sensitive.pii.test@example.com`
- Phone: `+12125551234`
- Special Requests: `Please call me at +19876543210`

**Submit the booking and check console:**

- [ ] Search console for `sensitive.pii.test@example.com` → Should NOT find it
- [ ] Search console for `+12125551234` → Should NOT find it
- [ ] Search console for `John Sensitive Doe` → Should NOT find it
- [ ] Search console for `+19876543210` → Should NOT find it

**Look for redaction patterns:**
- [ ] Do you see `[REDACTED]` in logs?
- [ ] Do you see `***@***.***` email patterns?
- [ ] Do you see `+***********` phone patterns?

**Result:** ___________

---

### 3.2 Network Tab Inspection
Open DevTools → Network tab → Filter by "Fetch/XHR"

**Check request/response bodies:**
- [ ] API requests should contain real data (needed for backend)
- [ ] BUT console logs should NOT echo this data back
- [ ] Verify no sensitive data appears in console after API calls

**Result:** ___________

---

## ✅ TEST 4: Secure Tenant Resolution

### 4.1 No Hardcoded Fallback Test
Open DevTools → Console tab

Navigate to: `https://app.blunari.ai/bookings`

**Search for demo tenant ID in all logs:**
- [ ] Search console for `f47ac10b-58cc-4372-a567-0e02b2c3d479`
- [ ] Should find ZERO matches
- [ ] If found = **CRITICAL SECURITY BUG**

**Check network requests:**
Open DevTools → Network tab
- [ ] Search all requests for demo tenant ID
- [ ] Should find ZERO matches

**Result:** ___________

---

### 4.2 Auth Redirect Test
**Test 1: No session → Should redirect to auth**
1. [ ] Open incognito/private window
2. [ ] Navigate to `https://app.blunari.ai/bookings`
3. [ ] Should redirect to `/auth` or `/login` or `/signin`
4. [ ] Should NOT show booking page without authentication

**Test 2: Valid session → Should load properly**
1. [ ] Log in normally
2. [ ] Navigate to `https://app.blunari.ai/bookings`
3. [ ] Should load booking page successfully
4. [ ] Should NOT see demo data from other tenants

**Result:** ___________

---

## ✅ TEST 5: End-to-End Integration

### 5.1 Complete Booking Flow
**Create a valid booking from start to finish:**

1. [ ] Navigate to `https://app.blunari.ai/bookings`
2. [ ] Click "New Booking" or "Create Booking"
3. [ ] Fill all fields with VALID data:
   - Name: `Integration Test User`
   - Email: `integration.test@example.com`
   - Phone: `+12025551234`
   - Party Size: `4`
   - Date: Future date (e.g., Oct 20, 2025)
   - Time: `19:30`
   - Special Requests: `Window seat preferred, celebrating anniversary`
4. [ ] Click Submit
5. [ ] Should see success message
6. [ ] Booking should appear in bookings list
7. [ ] All data should be saved correctly

**Result:** ___________

---

### 5.2 Error Recovery Test
**Test that validation works across wizard steps:**

1. [ ] Start new booking
2. [ ] Enter INVALID email: `bad-email`
3. [ ] Try to proceed to next step
4. [ ] Should be blocked with error message
5. [ ] Fix email to valid: `good@example.com`
6. [ ] Should now proceed to next step
7. [ ] Complete booking successfully

**Result:** ___________

---

## 📊 TEST RESULTS SUMMARY

| Test Category | Status | Notes |
|--------------|--------|-------|
| Email Validation | ⬜ Pass / ⬜ Fail | |
| Phone Validation | ⬜ Pass / ⬜ Fail | |
| Party Size Limits | ⬜ Pass / ⬜ Fail | |
| XSS Protection | ⬜ Pass / ⬜ Fail | |
| Rate Limiting | ⬜ Pass / ⬜ Fail | |
| PII Redaction | ⬜ Pass / ⬜ Fail | |
| No Demo Fallback | ⬜ Pass / ⬜ Fail | |
| Auth Redirect | ⬜ Pass / ⬜ Fail | |
| E2E Booking | ⬜ Pass / ⬜ Fail | |

---

## 🚨 CRITICAL ISSUES FOUND

If any test fails, document here:

1. **Issue:**
   - **Test:** 
   - **Expected:** 
   - **Actual:** 
   - **Severity:** Critical / High / Medium

2. **Issue:**
   - **Test:** 
   - **Expected:** 
   - **Actual:** 
   - **Severity:** 

---

## ✅ SIGN-OFF

**Tester Name:** ___________  
**Date:** ___________  
**Overall Result:** ⬜ PASS ⬜ FAIL ⬜ PASS WITH ISSUES  

**Production Recommendation:**
- ⬜ Approved for production (all tests pass)
- ⬜ Deploy with monitoring (minor issues)
- ⬜ DO NOT DEPLOY (critical issues found)

**Notes:**
