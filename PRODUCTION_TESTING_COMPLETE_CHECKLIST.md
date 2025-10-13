# Production Testing Checklist

## 🎯 Complete User Flow Testing Guide

This checklist ensures all critical paths work correctly in production before customer launch.

**Test Environment**: Production (app.blunari.ai, admin.blunari.ai)  
**Prerequisites**: Vercel environment variables configured, Sentry set up

---

## Part 1: Admin Dashboard Testing

### A. Admin Login & Authentication
- [ ] **Navigate to**: https://admin.blunari.ai
- [ ] **Log in** with admin credentials
- [ ] **Verify**: Dashboard loads without errors
- [ ] **Check console**: No error messages (F12)

### B. Tenant Management
- [ ] **Create new tenant**:
  - Click "Add Tenant" or equivalent
  - Fill in tenant details (name, slug, contact)
  - **Verify**: Tenant created successfully
  - **Check**: Success notification appears

- [ ] **View tenant list**:
  - **Verify**: All tenants display correctly
  - **Check**: Pagination works (if applicable)

- [ ] **Edit tenant**:
  - Select existing tenant
  - Update tenant information
  - **Verify**: Changes saved
  - **Check**: No 500 errors in network tab

- [ ] **Change tenant email**:
  - Select tenant
  - Update email address
  - **Verify**: New auth user created (check Supabase Auth dashboard)
  - **Verify**: Old admin user NOT modified
  - **Critical**: Check `employees` table - admin account unchanged

### C. Employee Management
- [ ] **Create employee**:
  - Navigate to Staff/Employee section
  - Add new employee with role
  - **Verify**: Employee appears in list

- [ ] **Assign roles**:
  - Edit employee
  - Change role (e.g., MANAGER → STAFF)
  - **Verify**: Role updated correctly

### D. System Settings
- [ ] **Update configuration**:
  - Navigate to settings
  - Modify system-wide settings
  - **Verify**: Changes persist after refresh

---

## Part 2: Client Dashboard Testing

### A. Tenant Owner Sign-Up Flow

#### Test Case 1: New Tenant Registration
- [ ] **Open**: https://app.blunari.ai
- [ ] **Sign up** with new email
- [ ] **Fill in details**:
  - Restaurant name: "Test Restaurant"
  - Email: `test+$(date +%s)@example.com`
  - Password: Strong password
- [ ] **Verify**: Account created
- [ ] **Check**: Welcome email received (if enabled)
- [ ] **Verify**: Redirected to dashboard

#### Test Case 2: Tenant Isolation
- [ ] **Log in as Tenant A**
- [ ] **Create booking**: Add test booking
- [ ] **Log out**
- [ ] **Log in as Tenant B**
- [ ] **Verify**: Cannot see Tenant A's booking
- [ ] **Critical**: RLS policies working correctly

### B. Password Setup Flow

#### Test Case 3: Password Setup Link (Admin-Created Tenant)
- [ ] **Admin creates tenant** without password
- [ ] **Admin generates password setup link**
- [ ] **Open link in incognito window**
- [ ] **Verify**: Password setup form appears
- [ ] **Set password**: Create password
- [ ] **Verify**: Redirected to dashboard
- [ ] **Verify**: Can log in with new password
- [ ] **Try reusing link**:
  - **Verify**: Link is invalid (single-use)
  - **Expected**: "Link has expired" message

### C. Dashboard Navigation
- [ ] **Navigate to each section**:
  - [ ] Dashboard Home
  - [ ] Bookings
  - [ ] Tables
  - [ ] Analytics
  - [ ] Widget Management
  - [ ] Waitlist Management
  - [ ] Customer Profiles
  - [ ] Catering
  - [ ] Messages
  - [ ] Staff Management
  - [ ] Inventory Management
  - [ ] Profile/Settings

- [ ] **Verify for each section**:
  - Page loads without errors
  - No console errors
  - Data displays correctly
  - Loading states work
  - Empty states display when no data

### D. Booking Management

#### Test Case 4: Create Booking
- [ ] **Navigate to**: Bookings section
- [ ] **Click**: "New Booking" or "+"
- [ ] **Fill in form**:
  - Guest name: "John Doe"
  - Party size: 4
  - Date: Tomorrow
  - Time: 19:00
  - Contact: "+1234567890"
  - Email: "john@example.com"
- [ ] **Submit booking**
- [ ] **Verify**: Booking appears in list
- [ ] **Check**: Status is "pending" or "confirmed"

#### Test Case 5: Edit Booking
- [ ] **Select booking** from list
- [ ] **Click**: Edit or pencil icon
- [ ] **Modify**: Change party size to 6
- [ ] **Save changes**
- [ ] **Verify**: Changes reflected in list
- [ ] **Check**: Updated timestamp

#### Test Case 6: Cancel Booking
- [ ] **Select booking**
- [ ] **Click**: Cancel button
- [ ] **Confirm cancellation**
- [ ] **Verify**: Status changed to "cancelled"
- [ ] **Verify**: Booking marked as cancelled (not deleted)

#### Test Case 7: Filter Bookings
- [ ] **Use filters**:
  - Filter by status (pending, confirmed, cancelled)
  - Filter by date range
  - Search by guest name
- [ ] **Verify**: Results update correctly
- [ ] **Check**: URL parameters update (if applicable)

### E. Table Management

#### Test Case 8: View Tables
- [ ] **Navigate to**: Tables section
- [ ] **Verify**: Floor plan displays
- [ ] **Check**: All tables show correct status
- [ ] **Test**: Click on table - details appear

#### Test Case 9: Table Availability
- [ ] **Select table**
- [ ] **View availability**: Check timeline
- [ ] **Verify**: Bookings shown on table
- [ ] **Check**: Blocked times display correctly

### F. Analytics

#### Test Case 10: Real Data Verification
- [ ] **Navigate to**: Analytics section
- [ ] **Verify**: Data displays (no "demo" or "mock" labels)
- [ ] **Check metrics**:
  - Total bookings count
  - Revenue (if applicable)
  - Guest count
  - Peak hours chart
- [ ] **Verify**: Numbers match booking records
- [ ] **Test date filters**: Change date range
- [ ] **Verify**: Data updates accordingly

**Critical Check**:
- [ ] Open browser console (F12)
- [ ] **Verify**: No "MOCK_DATA" or "demo" strings in network responses
- [ ] **Check**: API calls go to Supabase Edge Functions
- [ ] **Verify**: No hardcoded test data

#### Test Case 11: Analytics Debug Off
- [ ] **Check console**: No excessive debug logging
- [ ] **Verify**: `VITE_ANALYTICS_DEBUG` is NOT set
- [ ] **Expected**: Minimal console output

### G. Widget Management

#### Test Case 12: Generate Widget Code
- [ ] **Navigate to**: Widget Management
- [ ] **Click**: "Generate Widget Code"
- [ ] **Configure widget**:
  - Theme: Light/Dark
  - Primary color: Custom color
- [ ] **Copy code snippet**
- [ ] **Verify**: Code includes tenant slug

#### Test Case 13: Test Widget
- [ ] **Open**: Separate test HTML file
- [ ] **Paste widget code**
- [ ] **Open in browser**
- [ ] **Verify**: Widget displays correctly
- [ ] **Test booking through widget**:
  - Fill in booking form
  - Submit booking
  - **Verify**: Booking appears in dashboard
  - **Check**: Widget shows success message

#### Test Case 14: Widget Analytics
- [ ] **After widget booking**: Wait 1 minute
- [ ] **Navigate to**: Widget Management → Analytics
- [ ] **Verify**: Widget analytics show the booking
- [ ] **Check**: Source is "widget"
- [ ] **Verify**: Real-time data (not mock)

### H. Profile & Settings

#### Test Case 15: Update Profile
- [ ] **Navigate to**: Profile or Settings
- [ ] **Update information**:
  - Name: Change display name
  - Restaurant details: Update address
  - Contact: Update phone number
- [ ] **Upload avatar**: Select image
- [ ] **Save changes**
- [ ] **Refresh page**
- [ ] **Verify**: Changes persisted

#### Test Case 16: Change Password
- [ ] **Navigate to**: Security settings
- [ ] **Click**: "Change Password"
- [ ] **Enter**:
  - Current password
  - New password
  - Confirm password
- [ ] **Save**
- [ ] **Log out**
- [ ] **Log in with new password**
- [ ] **Verify**: Login successful

---

## Part 3: Error Handling & Edge Cases

### A. Network Errors
- [ ] **Disconnect internet**
- [ ] **Try to load page**
- [ ] **Verify**: Error boundary or offline message
- [ ] **Reconnect**
- [ ] **Verify**: App recovers gracefully

### B. Invalid Data
- [ ] **Try to create booking with**:
  - Past date
  - Invalid email format
  - Zero party size
- [ ] **Verify**: Form validation works
- [ ] **Check**: Error messages display

### C. Unauthorized Access
- [ ] **Log out**
- [ ] **Try to access**: https://app.blunari.ai/bookings
- [ ] **Verify**: Redirected to login
- [ ] **Log in**
- [ ] **Verify**: Redirected to intended page

### D. Rate Limiting (if enabled)
- [ ] **Make rapid API calls** (use test script)
- [ ] **Verify**: 429 responses after limit
- [ ] **Check**: Retry-After header present
- [ ] **Wait**: Until reset time
- [ ] **Verify**: Requests work again

---

## Part 4: Performance Testing

### A. Page Load Times
- [ ] **Use Chrome DevTools**:
  - Network tab → Disable cache
  - Reload each page
  - **Target**: First Contentful Paint < 2s
  - **Target**: Time to Interactive < 4s

### B. Bundle Size
- [ ] **Check Vercel build logs**:
  - Look for bundle sizes
  - **Target**: Main bundle < 500 KB gzipped
  - **Verify**: Code splitting working

### C. Mobile Testing
- [ ] **Open on mobile device** or use Chrome DevTools mobile emulation
- [ ] **Test key flows**:
  - Login
  - View bookings
  - Create booking
  - Navigate menu
- [ ] **Verify**: Responsive design works
- [ ] **Check**: Touch interactions work

---

## Part 5: Security Testing

### A. XSS Prevention
- [ ] **Try to inject script** in booking form:
  - Name: `<script>alert('XSS')</script>`
- [ ] **Submit**
- [ ] **Verify**: Script NOT executed
- [ ] **Check**: Data escaped/sanitized

### B. CSRF Protection
- [ ] **Check**: Supabase Auth tokens in requests
- [ ] **Verify**: No sensitive operations without auth

### C. SQL Injection
- [ ] **Try SQL injection** in search:
  - Search: `'; DROP TABLE bookings; --`
- [ ] **Verify**: Query handled safely
- [ ] **Check**: No database errors

---

## Part 6: Monitoring & Logging

### A. Sentry Error Tracking
- [ ] **Trigger an error** intentionally:
  - Navigate to non-existent route
  - OR modify code temporarily to throw error
- [ ] **Check Sentry dashboard**:
  - **Verify**: Error captured
  - **Check**: Stack trace available
  - **Verify**: User context attached
  - **Check**: Release/commit info present

### B. Supabase Logs
- [ ] **Go to**: Supabase Dashboard → Logs
- [ ] **Check Edge Function logs**:
  - **Verify**: Recent invocations logged
  - **Check**: No excessive errors
  - **Look for**: Unusual patterns

### C. Vercel Analytics (if enabled)
- [ ] **Go to**: Vercel Dashboard → Analytics
- [ ] **Check**:
  - Page views
  - Response times
  - Error rates
- [ ] **Verify**: Data populating

---

## Part 7: Production Readiness Verification

### A. Environment Variables
- [ ] **Verify in Vercel**:
  - `VITE_APP_ENV=production` ✅
  - `VITE_SENTRY_DSN` set ✅
  - `VITE_ENABLE_MOCK_DATA=false` ✅
  - No `VITE_ANALYTICS_DEBUG` ✅

### B. Debug Features Disabled
- [ ] **Try to access**: https://app.blunari.ai/test-widget
- [ ] **Expected**: 404 Not Found or redirected
- [ ] **Try**: https://app.blunari.ai/debug
- [ ] **Expected**: 404 Not Found

### C. Console Logging
- [ ] **Open console** (F12) on any page
- [ ] **Verify**: Minimal logging
- [ ] **Expected**: Only error logs or Sentry init message
- [ ] **Not expected**: Debug logs, "console.log" spam

### D. Security Headers
- [ ] **Check response headers** (Network tab):
  - `X-Content-Type-Options: nosniff` ✅
  - `X-Frame-Options: DENY` ✅
  - `Content-Security-Policy` present ✅
  - `Strict-Transport-Security` ✅

---

## Issues Tracker

Use this section to document any issues found during testing:

### Issue Template
```
### Issue #X: [Brief Description]
**Severity**: Critical | High | Medium | Low
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:

**Actual Behavior**:

**Screenshots/Logs**:

**Status**: Open | In Progress | Resolved
```

---

## Sign-Off

### Testing Completed By
- **Name**: ___________________
- **Date**: ___________________
- **Time**: ___________________

### Results Summary
- **Total Tests**: _____ 
- **Passed**: _____
- **Failed**: _____
- **Blocked**: _____

### Production Readiness Decision
- [ ] ✅ **APPROVED** - Ready for customer launch
- [ ] ⚠️ **APPROVED WITH MINOR ISSUES** - Launch with known issues documented
- [ ] ❌ **NOT APPROVED** - Critical issues must be fixed first

### Next Steps
_Document any follow-up actions needed..._

---

**Last Updated**: October 13, 2025  
**Version**: 1.0
