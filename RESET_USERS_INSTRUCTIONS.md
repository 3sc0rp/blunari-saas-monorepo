# 🔄 Reset All Users and Create New Admin

## ⚠️ WARNING
This will **DELETE ALL USERS** from your database and create a fresh admin account.

---

## 📋 Two Options

### Option 1: Quick Reset (Default Credentials)
**File:** `reset-and-create-admin.sql`

**Default Credentials:**
- Email: `admin@blunari.ai`
- Password: `admin123`
- Role: SUPER_ADMIN

**Steps:**
1. Open Supabase SQL Editor
2. Copy & paste entire file: `reset-and-create-admin.sql`
3. Click "Run"
4. Done! Log in with the credentials above

---

### Option 2: Custom Credentials ⭐ (Recommended)
**File:** `reset-and-create-admin-custom.sql`

**Steps:**
1. Open the file: `reset-and-create-admin-custom.sql`
2. Edit these lines (around line 16-18):
   ```sql
   v_admin_email TEXT := 'admin@blunari.ai';     -- 📧 CHANGE THIS
   v_admin_password TEXT := 'admin123';          -- 🔑 CHANGE THIS
   v_first_name TEXT := 'Admin';                 -- First name
   v_last_name TEXT := 'User';                   -- Last name
   ```
3. Save the file
4. Open Supabase SQL Editor
5. Copy & paste the entire modified file
6. Click "Run"
7. The script will show you the credentials in the output

---

## 🔍 What Gets Deleted

### ALL of these will be wiped:
- ✅ All records in `public.employees`
- ✅ All records in `auth.users`
- ⚠️ This includes ALL admin, staff, tenant owners, etc.

### What STAYS (not affected):
- ✅ Tenants (your restaurants/businesses)
- ✅ Bookings
- ✅ Tables
- ✅ All other data

---

## ✅ After Running

You'll have:
- 1 SUPER_ADMIN user
- Email confirmed (ready to log in)
- ACTIVE status
- No password reset required

**Verification Query:**
The script automatically runs a verification query at the end showing your new admin.

---

## 🔒 Security Best Practices

1. **Change the password immediately** after first login
2. Use a **strong password** (not `admin123` in production!)
3. Consider using a **real email** for password recovery
4. Enable **2FA** if available

---

## 📝 What the Script Does

1. **Deletes all employees** (step 1)
2. **Deletes all auth users** (step 2)
3. **Creates new admin in auth.users** (step 3)
   - Email confirmed automatically
   - Password encrypted with bcrypt
   - User metadata set
4. **Creates employee record** (step 4)
   - Links to auth user
   - Sets SUPER_ADMIN role
   - Sets ACTIVE status
5. **Verifies creation** (step 5)
   - Shows the new admin details
   - Confirms everything worked

---

## 🐛 Troubleshooting

### Error: "permission denied"
- You need to be a Supabase project admin
- Run this in the **SQL Editor** (not via API)

### Error: "foreign key constraint"
- The script handles this by deleting employees first
- If it still fails, check for other tables with foreign keys to users

### No admin appears after running
- Check the "Messages" tab in SQL Editor for errors
- Run the verification query manually:
  ```sql
  SELECT * FROM employees WHERE role = 'SUPER_ADMIN';
  SELECT * FROM auth.users;
  ```

---

## 🔄 Need to Reset Again?

Just run the same script again - it's idempotent and safe to run multiple times.

---

## 📁 Files

- `reset-and-create-admin.sql` - Quick reset with default credentials
- `reset-and-create-admin-custom.sql` - Customizable version (recommended)
- `RESET_USERS_INSTRUCTIONS.md` - This document

---

**Created:** October 8, 2025  
**Purpose:** Clean slate for user management
