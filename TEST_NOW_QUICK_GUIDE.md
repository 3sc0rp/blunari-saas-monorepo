# 🚀 Quick Reference: What to Test Now

## ⏰ Deployment Status
**Status**: 🟢 Deploying to Vercel  
**ETA**: 2-4 minutes  
**Monitor**: https://vercel.com/deewav3s-projects/client-dashboard/deployments

---

## ✅ Critical Test (30 seconds)

### 1. Test Widget URL
```
https://app.blunari.ai/public-widget/catering/dpizza?token=YOUR_TOKEN
```

### 2. Expected Fixes
- ✅ No "Failed to submit catering order" error
- ✅ Order submission succeeds
- ✅ Confirmation page loads

---

## 🧪 Full Test Flow (5 minutes)

### Step 1: Choose Package (Per-Tray)
- Look for package showing "$80.00 /tray"
- Should show "Serves 8-10 guests" subtitle
- Click to select

### Step 2: Event Details
- Event Name: "Corporate Lunch"
- Date: Tomorrow
- Time: 12:00 PM
- Guest Count: **25**
- Service: Delivery

### Step 3: Contact Details
- Name: George Howson
- Email: drood.tech@gmail.com
- Phone: 4709791999
- Venue: Office
- Address: 4133 church st, clarkston, ga 30021, USA

### Step 4: Submit
- Click "Submit Catering Request"
- ✅ **MUST NOT** see "Failed to submit" error
- ✅ **MUST** navigate to confirmation page

### Step 5: Verify Confirmation
- Check price breakdown shows:
  ```
  $80.00 × 3 trays (25 guests) = $240.00
  ```
- Formula: Math.ceil(25 / 10) = 3 trays

---

## 🔍 Database Verification

### Query to Run
```sql
-- Get latest order
SELECT 
  contact_name,
  contact_email,
  contact_phone,
  venue_address->>'street' as address,
  guest_count,
  status,
  created_at
FROM catering_orders
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Result
```
contact_name: "George Howson"
contact_email: "drood.tech@gmail.com"
contact_phone: "4709791999" (NOT NULL)
address: "4133 church st, clarkston, ga 30021, USA"
guest_count: 25
status: "inquiry"
```

---

## 🎯 Success Criteria

### Must Pass ✅
- [ ] Widget loads without JavaScript errors
- [ ] Package displays "$X.XX /tray" format
- [ ] Order form accepts all inputs
- [ ] Submit button works (no HTTP 500)
- [ ] Confirmation page loads
- [ ] Price breakdown shows tray count
- [ ] Database record created

### Nice to Have
- [ ] Mobile responsive
- [ ] Analytics events logged
- [ ] Auto-save draft works

---

## 🐛 If Test Fails

### Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Screenshot error message

### Check Network Tab
1. Open DevTools Network tab
2. Find POST request to `/catering_orders`
3. Check response status (should be 200/201)
4. If 500, check response body for error message

### Check Database
```sql
-- See if record was created
SELECT COUNT(*) FROM catering_orders
WHERE created_at > NOW() - INTERVAL '10 minutes';
```

---

## 📊 What Was Fixed

### Bug 1: venue_address JSONB
**Before**: Widget sent string, database expected object  
**After**: Auto-converts to `{ street, city, state, zip_code, country }`

### Bug 2: contact_phone NOT NULL
**Before**: Widget sent empty string, database rejected  
**After**: Defaults to "Not provided" if empty

### Bug 3: Missing Pricing Fields
**Before**: API didn't return pricing_type, base_price, etc.  
**After**: SELECT query includes all fields for confirmation display

---

## 🎉 Expected Outcome

### Success Screen Should Show:
```
✅ Order Confirmed!

Package: [Package Name]
Date: [Event Date]
Time: [Event Time]
Guests: 25

Price Breakdown:
$80.00 × 3 trays (25 guests) = $240.00

We'll contact you within 24 hours!
```

---

## 📞 If You Need Help

1. **Check Documentation**:
   - `CATERING_WIDGET_PRODUCTION_TEST_CHECKLIST.md` (full test plan)
   - `SESSION_SUMMARY_OCT_20_2025.md` (what was built)

2. **Check Deployments**:
   - Vercel: https://vercel.com/deewav3s-projects/client-dashboard/deployments
   - Supabase: https://supabase.com/dashboard/project/[your-project]

3. **Check Logs**:
   - Browser Console (F12)
   - Vercel Function Logs
   - Supabase Database Logs

---

**Ready?** Wait for deployment to complete, then test the widget! 🚀
