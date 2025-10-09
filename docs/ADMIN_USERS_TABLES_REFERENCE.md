# 🔍 Admin User Tables Reference

## Tables That Store Admin Users

### 1. **`auth.users`** (Supabase Authentication)
**Purpose:** Stores authentication credentials and user accounts

**Key Columns:**
- `id` - UUID (primary key)
- `email` - User's email address
- `encrypted_password` - Hashed password
- `email_confirmed_at` - Email verification timestamp
- `last_sign_in_at` - Last login time
- `created_at` - Account creation date
- `raw_user_meta_data` - JSON with first_name, last_name, etc.

**Location:** Managed by Supabase Auth, accessed via `auth.users`

---

### 2. **`employees`** (Your Application)
**Purpose:** Stores employee profiles, roles, and application-specific data

**Key Columns:**
- `id` - UUID (primary key)
- `user_id` - UUID (foreign key → auth.users.id)
- `email` - Employee email (synced from auth.users)
- `first_name` - First name
- `last_name` - Last name
- `role` - ENUM: `'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF'`
- `status` - ENUM: `'ACTIVE' | 'INACTIVE'`
- `created_at` - Record creation date
- `updated_at` - Last update date

**Location:** `public.employees` table

---

## Relationship

```
auth.users (authentication)
    ↓ (user_id)
employees (roles & profiles)
```

**Join:**
```sql
FROM employees e
LEFT JOIN auth.users u ON u.id = e.user_id
```

---

## How to View Your Admin Users

### Option 1: Supabase SQL Editor (Recommended)
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz
2. Navigate to: **SQL Editor**
3. Run the query from: `query-all-admins.sql`

This will show:
- ✅ All admin users with full details
- ✅ Summary statistics
- ✅ Checks for default admin accounts
- ✅ Sample of all users

### Option 2: Supabase Dashboard UI
1. Go to: **Authentication → Users**
2. Browse manually
3. Can't filter by role here (need SQL for that)

### Option 3: Run Script (Limited by RLS)
```bash
node query-admin-users.mjs
```
⚠️ May be blocked by RLS policies unless authenticated

---

## SQL Queries Created for You

### 1. **`find-admin-users.sql`**
Simple query to find admin users (requires RLS permissions)

### 2. **`query-all-admins.sql`** ⭐ (BEST)
Comprehensive report with:
- All admin users with auth details
- Summary statistics
- Default admin checks
- Sample of all users

### 3. **`query-admin-users.mjs`**
Node.js script (blocked by RLS without auth)

---

## Expected Admin Users

Based on your migrations, you should have:

### Default Admin Account
```sql
-- Created by: 20250828071557_eeeaed81-8a2b-4392-9c85-8abd0b992860.sql
Email:    admin@admin.com
Password: admin123 (bcrypt hashed in database)
Role:     SUPER_ADMIN
Status:   ACTIVE
```

This is created automatically when migrations run.

---

## Common Queries

### Find all SUPER_ADMIN users:
```sql
SELECT email, first_name, last_name, status, created_at
FROM employees
WHERE role = 'SUPER_ADMIN'
ORDER BY created_at;
```

### Find all active admins:
```sql
SELECT email, first_name, last_name, role, last_sign_in_at
FROM employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE role IN ('SUPER_ADMIN', 'ADMIN')
  AND status = 'ACTIVE'
ORDER BY last_sign_in_at DESC;
```

### Check if specific email exists:
```sql
SELECT 
  e.email,
  e.role,
  e.status,
  u.last_sign_in_at
FROM employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE e.email = 'admin@admin.com';
```

---

## Next Steps

1. **Run the comprehensive query:**
   - Open Supabase SQL Editor
   - Copy & paste from: `query-all-admins.sql`
   - Click "Run"
   - See all your admin users!

2. **If no admins exist:**
   - The migrations may not have run
   - Run: `npx supabase db push` to apply migrations
   - This will create the default admin account

3. **If you can't access:**
   - You may need Supabase service role key
   - Or log in as an existing admin first
   - Or reset via Supabase Dashboard

---

## Files Created

- ✅ `find-admin-users.sql` - Simple admin query
- ✅ `query-all-admins.sql` - Comprehensive report (USE THIS!)
- ✅ `query-admin-users.mjs` - Node.js script
- ✅ `ADMIN_CREDENTIALS.md` - Default credentials
- ✅ `ADMIN_USERS_TABLES_REFERENCE.md` - This document

---

**Last Updated:** October 8, 2025
