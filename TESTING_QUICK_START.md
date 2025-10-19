# 🚀 Quick Start: Test Catering Widget NOW

**Status**: ✅ Dev Server Running | ✅ Production Deployed | ⏳ Awaiting Tests

---

## 🎯 Test URLs (Copy & Paste)

### Local Testing (RECOMMENDED FIRST)
```
http://localhost:5173/catering/droodwick-grille
http://localhost:5173/public-widget/catering/droodwick-grille
```

### Production Testing
```
https://app.blunari.ai/catering/droodwick-grille
https://app.blunari.ai/public-widget/catering/droodwick-grille
```

**Replace `droodwick-grille` with your actual tenant slug**

---

## ⚡ Quick Test Sequence (5 Minutes)

### 1️⃣ Package Selection (30 seconds)
- [ ] Load URL above
- [ ] Packages display in grid
- [ ] Click any package
- [ ] Click "Select This Package"
- [ ] ✅ Should navigate to customize step

### 2️⃣ Customize Order (1 minute)
- [ ] Enter event name: "Company Lunch"
- [ ] Pick date: 3+ days from today
- [ ] Enter time: "12:00 PM"
- [ ] Guest count: 25 (adjust for your package)
- [ ] Select service type: "Delivery"
- [ ] Click "Continue to Details"
- [ ] ✅ Should navigate to contact details

### 3️⃣ Contact Details (1 minute)
- [ ] Enter name: "John Doe"
- [ ] Enter email: "john@example.com"
- [ ] Enter phone: "555-123-4567" (optional)
- [ ] Review order summary on right
- [ ] Click "Place Order"
- [ ] ✅ Should see loading spinner, then confirmation

### 4️⃣ Confirmation (30 seconds)
- [ ] See success animation
- [ ] Review order summary
- [ ] Check "What Happens Next" section
- [ ] Click "Place Another Order"
- [ ] ✅ Should reload to package selection

---

## 🔍 Enable Debug Mode (30 seconds)

**In Browser Console (F12)**:
```javascript
// Enable analytics debugging
localStorage.setItem('ANALYTICS_DEBUG', 'true');
localStorage.setItem('VITE_ANALYTICS_DEBUG', 'true');

// Reload page
location.reload();
```

**What to Look For**:
- Console logs: "GA4 Event Sent: ..."
- Console logs: "Server-side analytics: ..."
- No red errors in console

---

## 💾 Test Auto-save (2 minutes)

### Save Draft
1. Select a package
2. Fill customize form **partially**
3. **Wait 3 seconds without typing**
4. Open DevTools → Application → Local Storage
5. Look for: `catering_draft_droodwick-grille`
6. ✅ Should see JSON with your form data

### Restore Draft
1. **Reload page** (F5)
2. ✅ Should see draft notification banner
3. Click "Restore Draft"
4. ✅ Form fields should populate
5. ✅ Navigation should advance to correct step

### Clear Draft
1. Click "Start Fresh"
2. ✅ Draft should clear
3. ✅ Return to package selection

---

## 🐛 Quick Issue Checks

### Issue: Blank Page
**Fix**: Check browser console (F12) for errors

### Issue: No Packages Show
**Fix**: Check if tenant has catering packages in database

### Issue: Can't Submit Order
**Fix**: Check all required fields are filled and valid

### Issue: Analytics Not Showing
**Fix**: Ensure debug mode is enabled (see above)

---

## 📊 Verify in Database (2 minutes)

**Go to Supabase Dashboard → SQL Editor**

### Check Recent Orders
```sql
SELECT 
  id,
  event_name,
  guest_count,
  contact_email,
  created_at
FROM catering_orders
WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = 'droodwick-grille')
ORDER BY created_at DESC
LIMIT 5;
```

### Check Analytics Events
```sql
SELECT 
  event_name,
  COUNT(*) as count,
  MAX(created_at) as last_event
FROM analytics_events
WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = 'droodwick-grille')
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_name
ORDER BY last_event DESC;
```

---

## ✅ Success Criteria

After completing quick test:

- [ ] All 4 steps navigate smoothly
- [ ] Order submits successfully
- [ ] Confirmation screen displays
- [ ] Console shows no errors
- [ ] Analytics events fire (check console)
- [ ] Auto-save works (check localStorage)
- [ ] Draft recovery works (reload test)
- [ ] Database records order (SQL check)

---

## 🆘 If Something Breaks

1. **Check Console**: F12 → Console tab → Look for red errors
2. **Check Network**: F12 → Network tab → Look for failed requests
3. **Check localStorage**: F12 → Application → Local Storage
4. **Check React State**: Install React DevTools → Check CateringProvider

---

## 📋 Full Testing Guide

**For comprehensive testing, see**: `PHASE3_TESTING_GUIDE.md`

Includes:
- Detailed functional tests for each component
- Mobile responsiveness checklist
- Performance benchmarks
- Edge case scenarios
- Bug reporting template

---

## 🎉 What's Working (Confirmed)

✅ TypeScript compilation (zero errors)  
✅ Vite build successful  
✅ Bundle size maintained (102.14 kB)  
✅ Component exports working  
✅ Context provider functional  
✅ Vercel deployment live  

**Ready for testing!** 🚀

---

## 📞 Quick References

**Component Files**:
- `CateringWidget.tsx` (291 lines) - Main wrapper
- `CateringContext.tsx` (304 lines) - State management
- `PackageSelection.tsx` (338 lines) - Step 1
- `CustomizeOrder.tsx` (398 lines) - Step 2
- `ContactDetails.tsx` (454 lines) - Step 3
- `OrderConfirmation.tsx` (425 lines) - Step 4

**Documentation**:
- `PHASE3_TESTING_GUIDE.md` - Full testing guide
- `COMPONENT_REFACTORING_COMPLETE.md` - Architecture
- `PHASE3_INTEGRATION_COMPLETE.md` - Integration summary

**Deployment**:
- Vercel: https://vercel.com/deewav3s-projects/client-dashboard/deployments
- Commit: a3a63900 (frontend) + 6f86a364 (docs)

---

**Start Testing Now!** Copy a URL above and paste in browser 🎯
