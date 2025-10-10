# How to Create Auto_Provisioning Records for Your Tenants

## 📋 Quick Guide

### Step 1: Open the SQL File
Open the file: **`CREATE-AUTO-PROVISIONING.sql`** (in your workspace root)

### Step 2: Copy the SQL
- Press `Ctrl+A` to select all
- Press `Ctrl+C` to copy

### Step 3: Paste into SQL Editor
- I've opened the Supabase SQL Editor for you (Simple Browser tab)
- Click in the editor area
- Press `Ctrl+V` to paste

### Step 4: Run the Script
- Click the green **"Run"** button in the top right
- Wait 2-3 seconds for execution

### Step 5: Check the Results
You should see output like:
```
STEP 1: Current Tenant Status
❌ droodwick - Missing auto_provisioning
❌ Test Restaurant - Missing auto_provisioning

STEP 2: Creating Missing Records
NOTICE: Using user ID: xxx-xxx-xxx as provisioner
NOTICE: Creating auto_provisioning for: droodwick
NOTICE: Creating auto_provisioning for: Test Restaurant
NOTICE: ✅ SUCCESS: Created 2 auto_provisioning records

STEP 3: Verification
✅ droodwick - COMPLETE
✅ Test Restaurant - COMPLETE

SUMMARY
total_tenants: 2
with_auto_provisioning: 2
still_missing: 0
```

### Step 6: Verify
Run this command in your terminal to double-check:
```powershell
node scripts/check-all-tenants-provisioning.mjs
```

Expected output:
```
✅ droodwick - Has auto_provisioning: YES
✅ Test Restaurant - Has auto_provisioning: YES
```

---

## 🎯 What This Does

The SQL script will:

1. **Find all tenants** that don't have auto_provisioning records
2. **Get the first user** from your auth.users table to use as the provisioner
3. **Create auto_provisioning records** for each tenant with:
   - User ID (from step 2)
   - Tenant details (name, slug, timezone, currency)
   - Status: 'completed'
   - Login email (tenant email or generated)
   - Created/completed timestamps
4. **Create/update profiles** to ensure the user has a profile
5. **Show verification** that everything worked

---

## 🔧 After Creating Records

Once the auto_provisioning records are created:

### Test Credential Management
1. Hard refresh your browser: `Ctrl+Shift+R`
2. Navigate to: Admin Dashboard → Tenants → (select a tenant)
3. Go to the **Users** tab
4. Try these actions:
   - ✅ Update Email
   - ✅ Generate Password
   - ✅ Change Password
   - ✅ Reset Password
5. **All should work without 500 errors!**

### Create New Tenants
Going forward, new tenants will automatically get auto_provisioning records thanks to the updated `provision_tenant()` function we deployed earlier.

---

## ❓ Troubleshooting

### "No users found in auth.users table"
If you see this error, you need to create at least one user first:

1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/auth/users
2. Click "Add user" 
3. Create a user with your email
4. Then run the SQL script again

### "Still getting 500 errors"
1. Make sure you ran the SQL script and saw success messages
2. Hard refresh your browser (Ctrl+Shift+R)
3. Check Edge Function logs: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions/manage-tenant-credentials/logs
4. Look for error messages in the logs

### "Script says 0 records created"
This means the records already exist! Check:
```powershell
node scripts/check-all-tenants-provisioning.mjs
```

If it shows tenants have records but you still get 500 errors, the issue might be with RLS policies or the user_id being invalid.

---

## 📝 What Are Auto_Provisioning Records?

Auto_provisioning records link tenants to their owner users. They're required for:

- **Tenant Visibility**: Tenants appear in admin dashboard
- **Credential Management**: Update emails, passwords
- **User Management**: Manage tenant users
- **Login Display**: Show correct owner emails

Without these records:
- ❌ Tenants may not appear in admin dashboard
- ❌ Credential management returns 500 errors
- ❌ Login emails show incorrect values
- ❌ Some features won't work properly

---

## 🚀 Summary

**Quick Steps:**
1. Open `CREATE-AUTO-PROVISIONING.sql`
2. Copy all (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor (Simple Browser tab)
4. Click "Run"
5. Verify with: `node scripts/check-all-tenants-provisioning.mjs`

**Time Required:** ~2 minutes

**Success Indicator:** All tenants show "✅ Has auto_provisioning: YES"

---

Need help? Let me know what error you're seeing!
