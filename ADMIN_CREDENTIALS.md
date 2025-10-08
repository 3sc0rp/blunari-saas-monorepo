# 🔐 Admin Credentials Reference

## Default Admin Accounts

Based on the database migrations, your system has these default admin accounts:

### Primary Admin Account
```
Email:    admin@admin.com
Password: admin123
Role:     SUPER_ADMIN
Status:   ACTIVE
```

This account is created by migration: `20250828071557_eeeaed81-8a2b-4392-9c85-8abd0b992860.sql`

### Secondary Admin (if exists)
```
Email:    admin@blunari.ai
Password: (Check your records or reset via Supabase dashboard)
```

---

## 🔍 How to Verify/Access

### Option 1: Use Default Credentials
Try logging into the admin dashboard with:
- **Email:** `admin@admin.com`
- **Password:** `admin123`

### Option 2: Check Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz
2. Navigate to: **Authentication → Users**
3. Find users with email: `admin@admin.com` or `admin@blunari.ai`
4. You can reset passwords here if needed

### Option 3: Query Database
Run this SQL in Supabase SQL Editor:

```sql
-- Find all admin users
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  e.first_name,
  e.last_name,
  e.role,
  e.status
FROM auth.users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE e.role IN ('SUPER_ADMIN', 'ADMIN')
ORDER BY u.created_at;
```

---

## 🔧 Reset Password (If Needed)

### Via Supabase Dashboard:
1. Go to **Authentication → Users**
2. Find the user (e.g., `admin@admin.com`)
3. Click the three dots menu → **Send password reset email**
4. Or directly set a new password

### Via SQL:
```sql
-- Reset password for admin@admin.com
UPDATE auth.users
SET 
  encrypted_password = crypt('YOUR_NEW_PASSWORD', gen_salt('bf')),
  updated_at = now()
WHERE email = 'admin@admin.com';
```

---

## 📋 Current Test Credentials

Based on your earlier messages:
- **You said the password is:** `admin123`
- **The email you've been using:** `admin@blunari.ai`

**But the database default is:**
- **Email:** `admin@admin.com`
- **Password:** `admin123`

---

## ✅ Recommended Action

Try logging in with:
```
Email:    admin@admin.com
Password: admin123
```

This is the account created by the database migration with SUPER_ADMIN role.

If that doesn't work:
1. Check Supabase Dashboard → Authentication → Users
2. Look for any user with SUPER_ADMIN role
3. Reset their password
4. Try again

---

## 🔒 Security Notes

⚠️ **IMPORTANT:** The default password `admin123` should be changed immediately in production!

**Steps to secure:**
1. Log in with default credentials
2. Go to Profile/Settings
3. Change password to something secure
4. Enable 2FA if available
5. Update this document with new credentials (store securely!)

---

## 📊 Where This Info Comes From

- **Migration File:** `supabase/migrations/20250828071557_eeeaed81-8a2b-4392-9c85-8abd0b992860.sql`
- **Lines 72-103:** Creates user with `admin@admin.com` / `admin123`
- **Auto-assigns:** SUPER_ADMIN role via trigger
- **Status:** ACTIVE by default

---

**Created:** October 8, 2025  
**Source:** Database migrations analysis
