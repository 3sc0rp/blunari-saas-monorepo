# 🧪 Complete Testing Guide - October 2025 Deployment

**Date:** October 3, 2025  
**Version:** 1.0.0  
**Status:** ✅ **ALL SYSTEMS READY FOR TESTING**

---

## 🎯 WHAT TO TEST

You've deployed **2 major feature sets** today:
1. October 2025 Core Features (notifications, staff invites, timezone, admin)
2. Complete Catering System (management + widget)

---

## 🔐 ADMIN DASHBOARD TESTS

**URL:** https://admin.blunari.ai

### Test 1: Staff Invitation System ⭐ CRITICAL

**Steps:**
1. Sign in as admin (admin@blunari.ai)
2. Navigate to `/admin/employees`
3. Click "Invite Employee" button
4. Fill out form:
   - Email: `newstaff@example.com`
   - Role: `SUPPORT`
   - Department: (optional)
5. Click "Send Invitation"

**Expected Result:**
- ✅ Success toast appears
- ✅ Invitation link in browser console (F12)
- ✅ Link format: `https://admin.blunari.ai/accept-invitation?token=...`
- ✅ Invitation appears in "Staff Invitations" table below

**Test Acceptance:**
6. Copy invitation link from console
7. Open in incognito window
8. Should see "Accept Invitation" page
9. Enter password (min 8 chars) twice
10. Click "Accept & Join Team"

**Expected Result:**
- ✅ Account created
- ✅ Auto-signed in
- ✅ Redirected to dashboard
- ✅ New employee appears in employees list

---

### Test 2: Employee Management

**Steps:**
1. Go to `/admin/employees`
2. View employees list
3. Check invitation management table

**Expected Result:**
- ✅ Employees list loads (with email, role, status)
- ✅ Pending invitations show in table
- ✅ Can copy invitation links
- ✅ No console errors

---

## 📱 CLIENT DASHBOARD TESTS

**URL:** https://your-client-dashboard.com

### Test 3: Notification Sync ⭐ CRITICAL

**Device A (Desktop):**
1. Sign in as tenant user
2. Go to Command Center (or any page with notifications)
3. Click notifications bell icon
4. Mark a notification as read

**Device B (Phone/Another Browser):**
5. Sign in with same account
6. Go to notifications

**Expected Result:**
- ✅ Notification marked on Device A shows as read on Device B
- ✅ Sync happens within 5 seconds
- ✅ Unread count matches across devices
- ✅ Works across different browsers

---

### Test 4: Timezone-Safe Dates

**Steps:**
1. Check tenant timezone in database:
   ```sql
   SELECT name, timezone FROM tenants WHERE id = 'YOUR_TENANT_ID';
   ```
2. Go to Command Center
3. Select a date
4. Create a booking for 11 PM local time

**Expected Result:**
- ✅ Date initializes to "today" in tenant timezone
- ✅ 11 PM booking appears on correct day (not next day)
- ✅ No UTC drift issues

---

### Test 5: Catering Management ⭐ NEW FEATURE

**URL:** `/dashboard/catering`

**Test 5A: Package Management**
1. Go to Packages tab
2. Click "New Package"
3. Fill out form:
   - Name: "Corporate Lunch Package"
   - Description: "Perfect for business meetings"
   - Price: $45.00 per person
   - Min guests: 10
   - Max guests: 100
   - Enable: Setup, Service, Cleanup
   - Mark as Popular
4. Click "Create Package"

**Expected Result:**
- ✅ Package created successfully
- ✅ Appears in grid view
- ✅ "Popular" badge shows
- ✅ Pricing displays correctly ($45.00/person)
- ✅ Guest range shows (10-100)
- ✅ Service badges show

**Test 5B: Edit Package**
5. Click "Edit" on the package
6. Change price to $50.00
7. Click "Update Package"

**Expected Result:**
- ✅ Package updated
- ✅ New price shows in grid
- ✅ Toast confirmation appears

---

### Test 6: Menu Builder

**Steps:**
1. Go to Menu tab
2. Click "New Category"
3. Create "Appetizers" category
4. Create "Main Courses" category
5. Click "New Item"
6. Fill form:
   - Category: Appetizers
   - Name: "Bruschetta Platter"
   - Description: "Fresh tomatoes, basil, mozzarella"
   - Price: $12.99
   - Dietary: Check "Vegetarian"
7. Click "Create Item"

**Expected Result:**
- ✅ Categories created
- ✅ Menu item appears under Appetizers
- ✅ Price displays correctly
- ✅ Vegetarian badge shows
- ✅ Can switch between Categories and All Items views

---

### Test 7: Order Management

**Steps:**
1. Go to Orders tab
2. View existing catering orders (if any)
3. Use search to find orders
4. Filter by status
5. Click "View" on an order
6. Change status in dropdown

**Expected Result:**
- ✅ Orders list loads
- ✅ Search works
- ✅ Filter works
- ✅ Order details dialog opens
- ✅ Status can be updated
- ✅ Pricing displays correctly

---

### Test 8: Analytics Dashboard

**Steps:**
1. Go to Analytics tab
2. View metrics cards
3. Check order status breakdown
4. Check revenue details

**Expected Result:**
- ✅ Metrics cards show data
- ✅ Status distribution shows
- ✅ Revenue breakdown displays
- ✅ Deposit tracking shows
- ✅ No loading errors

---

### Test 9: Widget Configuration ⭐ NEW FEATURE

**Steps:**
1. Go to Widget tab
2. Customize colors:
   - Primary: Orange (#f97316)
   - Secondary: Dark orange (#ea580c)
3. Change welcome message: "Book Your Event Catering"
4. Toggle "Show Dietary Filters" ON
5. Click "Save Configuration"

**Expected Result:**
- ✅ Configuration saves successfully
- ✅ Preview updates in real-time
- ✅ Device previews work (desktop/tablet/mobile)
- ✅ Embed code generates
- ✅ Can copy embed code
- ✅ Can copy widget URL

**Test Widget Embed:**
6. Copy the embed code
7. Create a test HTML file with the embed code
8. Open in browser

**Expected Result:**
- ✅ Widget loads in iframe
- ✅ Colors match configuration
- ✅ Packages display
- ✅ Can browse and inquire

---

### Test 10: Customer Order Tracking

**Steps:**
1. Create a test catering order (via widget or manually)
2. Note the order ID
3. Go to: `https://your-dashboard.com/catering-order/ORDER_ID?email=customer@email.com`

**Expected Result:**
- ✅ Email verification screen shows
- ✅ Enter email → order loads
- ✅ Progress timeline shows current status
- ✅ Event details display
- ✅ Pricing breakdown shows (if quoted)
- ✅ Contact information displays

---

## 🐛 COMMON ISSUES & FIXES

### Issue: "Employees page not loading"
**Fix:** Run `APPLY_EMPLOYEES_VIEW_MIGRATION.sql` if not already done

### Issue: "Catering tabs not showing"
**Fix:** Run `APPLY_CATERING_MIGRATION.sql` in Supabase

### Issue: "Widget preview not loading"
**Fix:** Check browser console for errors, verify widget token generation

### Issue: "Can't create packages"
**Fix:** Verify `catering_packages` table exists (from original migration)

### Issue: "Notifications not syncing"
**Fix:** Check `notification_reads` table exists

---

## ✅ SUCCESS CRITERIA

**Your deployment is successful when:**

### Admin Dashboard
- [ ] Can sign in without errors
- [ ] Employees page loads with list
- [ ] Can invite staff member
- [ ] Invitation link works
- [ ] New employee can accept and sign in

### Client Dashboard - Core
- [ ] Notifications sync across devices
- [ ] Dates display in correct timezone
- [ ] Command Center loads without errors

### Client Dashboard - Catering
- [ ] Catering management page loads at `/dashboard/catering`
- [ ] Can create catering package
- [ ] Can create menu categories and items
- [ ] Can view/filter orders
- [ ] Analytics dashboard shows metrics
- [ ] Widget configuration loads
- [ ] Embed code generates
- [ ] Order tracking page works

---

## 📊 VERIFICATION QUERIES

**Run these in Supabase SQL Editor to verify:**

```sql
-- Check notification_reads table
SELECT COUNT(*) as notification_reads_count FROM notification_reads;

-- Check employees table
SELECT COUNT(*) as active_employees FROM employees WHERE status = 'ACTIVE';

-- Check employee invitations
SELECT COUNT(*) as pending_invitations FROM employee_invitations 
WHERE accepted_at IS NULL AND expires_at > NOW();

-- Check catering widget configs
SELECT COUNT(*) as catering_widget_configs FROM catering_widget_configs;

-- Check catering packages
SELECT COUNT(*) as catering_packages FROM catering_packages;

-- All checks should return without errors
```

---

## 🎊 CONGRATULATIONS!

If all tests pass, you have successfully deployed:

**✅ Enterprise-grade features:**
- Multi-device notification sync
- Professional staff onboarding
- Timezone-aware booking system
- Complete catering platform

**✅ Production quality:**
- TypeScript strict mode
- Zero linter errors
- Comprehensive security (RLS)
- Full documentation

**✅ Business value:**
- Embeddable widgets
- Customer portals
- Analytics and reporting
- Staff management
- Order processing

---

**🚀 Start testing! All systems are GO!**

**Priority Tests:** 
1. Staff Invitation (Test 1)
2. Notification Sync (Test 3)
3. Catering Management (Test 5-9)

---

*See `BLUNARI_COMPLETE_DEPLOYMENT_SUMMARY.md` for complete deployment overview*

