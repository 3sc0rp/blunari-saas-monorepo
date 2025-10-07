# 🎯 Supabase Update Checklist

## ✅ Completed (Already Done)

- [x] Fixed tenant-provisioning function (creates unique owner users)
- [x] Deployed tenant-provisioning to production
- [x] Fixed manage-tenant-credentials function (uses correct user_id column)
- [x] Deployed manage-tenant-credentials to production  
- [x] Fixed React components (TenantUserManagement.tsx, TenantDetailPage.tsx)
- [x] Committed all code changes to Git
- [x] Pushed all changes to GitHub
- [x] Created comprehensive database update scripts
- [x] Created detailed documentation guides

## ⏳ To Do (Action Required - 5 Minutes)

### Step 1: Run Database Update Script ⚠️ REQUIRED
- [ ] Open Supabase Dashboard: https://app.supabase.com
- [ ] Navigate to project: kbfbbkcaxhzlnbqxwgoz
- [ ] Go to SQL Editor → New Query
- [ ] Copy contents of `SUPABASE_DATABASE_UPDATE.sql`
- [ ] Paste and click "Run"
- [ ] Review summary report

**Expected Result:**
```
✅ profiles.user_id column exists
✅ RLS policies updated
✅ Indexes created
✅ Foreign keys verified
```

### Step 2: Check for Existing Tenants Needing Fix (Optional)
- [ ] Check summary report for "Tenants with admin email"
- [ ] If COUNT > 0, note which tenants need fixing
- [ ] For each tenant with admin@blunari.ai:
  - [ ] Open in admin dashboard
  - [ ] Go to User Management tab
  - [ ] Click "Regenerate Credentials"

### Step 3: Verify System Works
- [ ] Create a new test tenant
- [ ] Verify email is NOT admin@blunari.ai
- [ ] Try updating tenant email (should work)
- [ ] Try updating tenant password (should work)
- [ ] No 500 errors in console

### Step 4: Browser Refresh (If Needed)
- [ ] Hard refresh admin dashboard (Ctrl+Shift+R)
- [ ] Clear browser cache if React errors persist

## 📋 Quick Reference

**Files to Use:**
- `SUPABASE_DATABASE_UPDATE.sql` ← **RUN THIS IN SUPABASE**
- `SUPABASE_UPDATE_GUIDE.md` ← Read if you need detailed help
- `SUPABASE_ACTION_REQUIRED.md` ← Overview and troubleshooting

**Where to Run:**
- Supabase Dashboard → SQL Editor → New Query

**Time Required:**
- ~5 minutes to run script
- ~5-10 minutes per tenant if fixing existing ones

**Risk Level:**
- ✅ LOW - Script is idempotent (safe to run multiple times)
- ✅ No data deletion
- ✅ Only adds/updates policies and schema

## 🎉 Success Criteria

You're done when:
1. ✅ Database update script runs without errors
2. ✅ Summary report shows "PASS" for all checks
3. ✅ New tenants get unique emails (not admin@blunari.ai)
4. ✅ Credential updates work (no 500 errors)

## 🆘 Need Help?

**Problem:** Don't know how to run SQL in Supabase  
**Solution:** Check `SUPABASE_UPDATE_GUIDE.md` - has screenshots and step-by-step

**Problem:** Script has errors  
**Solution:** Check the error message, likely a permission issue or already-run script

**Problem:** Still seeing 500 errors  
**Solution:** 
1. Verify script ran successfully
2. Check edge function logs in Supabase
3. Verify functions are deployed (they are ✅)

**Problem:** React errors still appearing  
**Solution:** Hard refresh browser (Ctrl+Shift+R) - code is fixed, just need new load

---

## 🚀 Ready to Go!

**Next Action:** Open `SUPABASE_DATABASE_UPDATE.sql` and run it in Supabase Dashboard

**Total Time:** ~5 minutes  
**Difficulty:** Easy (copy-paste SQL script)  
**Impact:** HIGH (completes the credential management fix)
