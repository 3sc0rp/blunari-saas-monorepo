# Test Guide: World-Class Catering Package Form

## Deployment Status

**Commit**: `fd50506f` - feat: Add world-class catering package form to client-dashboard with flexible pricing

**Monitor Deployment**: https://vercel.com/deewav3s-projects/client-dashboard/deployments

**Expected Deploy Time**: 2-4 minutes from push (pushed at current time)

---

## Test Checklist

### 1. Access the Form

1. Navigate to: **https://app.blunari.ai**
2. Login as a restaurant owner (tenant user)
3. Go to: **Catering → Packages** tab
4. Click: **"Add Package"** button

**Expected**: Dialog opens with new world-class form

---

### 2. Test Per-Person Pricing Package

**Visual Check**:
- ✅ Three pricing cards visible: "Per Person" | "Per Tray" | "Fixed Price"
- ✅ "Per Person" card is selected by default (highlighted)

**Create Package**:
1. **Package Name**: "Corporate Lunch Special"
2. **Pricing Type**: Keep "Per Person" selected
3. **Price Per Person**: $25
4. **Min Guests**: 10
5. **Max Guests**: 50
6. **Description**: "Premium lunch buffet for corporate events"
7. **Dietary Accommodations**: Check "Vegetarian" and "Gluten-Free"
8. **Services**: Enable "Setup", "Staffing", "Cleanup"
9. Click **"Save Package"** or **"Create Package"**

**Expected Results**:
- ✅ Form submits successfully
- ✅ Toast notification: "Package created successfully"
- ✅ Package appears in packages list
- ✅ Database record created with `pricing_type = 'per_person'`

---

### 3. Test Per-Tray Pricing Package

**Create Package**:
1. Click **"Add Package"** again
2. **Package Name**: "Mediterranean Mezze Trays"
3. **Pricing Type**: Click **"Per Tray"** card
4. **Price Per Tray**: $80
5. **Tray Sizing**: Select "Serves 10 people" from dropdown
6. **Min Trays**: 2
7. **Max Trays**: 10
8. **Description**: "Authentic Mediterranean mezze platters"

**Visual Checks**:
- ✅ "Per Tray" card is highlighted (blue border/background)
- ✅ Tray sizing dropdown visible with options: "Serves 10/15/20/25 people"
- ✅ "Min Trays" and "Max Trays" fields visible (NOT "Min Guests/Max Guests")
- ✅ Help text shows: "Enter minimum number of trays required"

**Submit**:
9. Click **"Save Package"**

**Expected Results**:
- ✅ Form submits successfully
- ✅ Package created with `pricing_type = 'per_tray'`
- ✅ Package shows tray sizing info in details

---

### 4. Test Fixed Price Package

**Create Package**:
1. Click **"Add Package"**
2. **Package Name**: "Executive Board Room Package"
3. **Pricing Type**: Click **"Fixed Price"** card
4. **Total Price**: $500
5. **Recommended Guests**: 15
6. **Description**: "All-inclusive executive meeting package"

**Visual Checks**:
- ✅ "Fixed Price" card highlighted
- ✅ Shows single "Total Price" field (no per-person or per-tray)
- ✅ Optional "Recommended Guests" field visible

**Submit**:
7. Click **"Save Package"**

**Expected Results**:
- ✅ Package created with `pricing_type = 'fixed'`
- ✅ Total price stored correctly

---

### 5. Test Package Editing

1. Click **Edit** icon on any existing package
2. Verify form pre-populates with package data
3. Change pricing type (e.g., Per Person → Per Tray)
4. **Visual Check**: Form fields update dynamically to show correct fields for new type
5. Update price and click **"Update Package"**

**Expected Results**:
- ✅ Form updates in real-time when changing pricing type
- ✅ Package updates successfully
- ✅ Toast: "Package updated successfully"

---

### 6. Test Form Validation

**Try to submit with missing required fields**:
1. Click **"Add Package"**
2. Leave "Package Name" empty
3. Click **"Save Package"**

**Expected**:
- ✅ Form shows validation error: "Package name is required"
- ✅ Form does NOT submit

**Try invalid pricing**:
1. Enter price as `-10` (negative)
2. Try to submit

**Expected**:
- ✅ Validation error: "Price must be greater than 0"

---

### 7. Database Verification

After creating packages, check Supabase:

**Query**:
```sql
SELECT 
  id, 
  name, 
  pricing_type,
  price_per_person,
  price_per_tray,
  fixed_price,
  tray_serves_people,
  min_guests,
  max_guests
FROM catering_packages
WHERE tenant_id = '<your-tenant-id>'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results**:
- ✅ Per-person package: `pricing_type = 'per_person'`, `price_per_person` populated
- ✅ Per-tray package: `pricing_type = 'per_tray'`, `price_per_tray` populated, `tray_serves_people` set
- ✅ Fixed package: `pricing_type = 'fixed'`, `fixed_price` populated

---

### 8. Widget Order Flow Test (Optional)

**Prerequisites**: Create a per-tray package first (e.g., $80/tray, serves 10)

**Test Steps**:
1. Open catering widget (embedded or standalone)
2. Select the per-tray package
3. Enter **25 guests** in the form
4. **Visual Check**: Widget should show: "$80.00 × 3 trays = $240.00"
   - (25 guests ÷ 10 per tray = 3 trays, rounded up)
5. Complete order form and submit

**Expected Results**:
- ✅ Tray calculation correct
- ✅ Order submits successfully
- ✅ Database record shows correct pricing breakdown

---

## Common Issues & Fixes

### Issue: Form doesn't appear / Shows old basic form
**Cause**: Browser cache or deployment not complete
**Fix**: 
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check Vercel deployment status
3. Wait 2-4 minutes for deployment to complete

### Issue: "Failed to create package" error
**Cause**: Missing tenant_id or RLS policy blocking
**Fix**:
1. Check browser console for errors
2. Verify user has `auto_provisioning` record with `status = 'completed'`
3. Check Supabase logs for RLS policy errors

### Issue: Pricing fields don't update when changing type
**Cause**: React state not re-rendering
**Fix**: Check browser console for React errors, try refreshing page

---

## Success Criteria

✅ **All 3 pricing types work** (per-person, per-tray, fixed)  
✅ **Visual pricing selector** shows 3 cards and highlights selected  
✅ **Form fields update dynamically** when changing pricing type  
✅ **Validation works** on required fields and numeric inputs  
✅ **Packages save to database** with correct `pricing_type` enum  
✅ **Editing existing packages** pre-populates form correctly  
✅ **Toast notifications** show on success/error  

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark todo items as completed
2. 🧹 Clean up admin-dashboard (remove accidental CateringPackageForm.tsx)
3. 📝 Update user documentation with new pricing options
4. 🚀 Test widget order flow with per-tray packages

If issues found:
1. 🐛 Document the issue
2. 🔍 Check browser console and Supabase logs
3. 🛠️ Create bug fix commit
4. 🔄 Re-test after fix deployed
