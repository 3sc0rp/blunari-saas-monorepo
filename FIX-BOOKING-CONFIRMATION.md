# Fix: Booking Confirmation Failure

## 🔴 Current Error
```
Booking Error
Failed to confirm reservation
❌ CRITICAL: Booking creation failed - no reservation_id returned
```

## 🔍 Root Cause
The edge function is **successfully validating** tenant and hold, but **failing to insert** the booking into the database. The `reservation_id` is `undefined` because the database INSERT is failing.

---

## 🛠️ Solutions (Try in Order)

### Solution 1: Check Edge Function Logs for Actual Error

The edge function has detailed logging. Check the logs to see the actual database error:

```bash
npx supabase functions logs widget-booking-live --project-ref kbfbbkcaxhzlnbqxwgoz
```

Look for lines containing:
- `❌ DATABASE INSERTION FAILED`
- `First insert failed`
- `Legacy insert also failed`
- Error messages with codes like `42703` (column doesn't exist) or `23502` (not-null violation)

---

###  Solution 2: Fix Database Schema

The most common issue is missing or misconfigured columns in the `bookings` table.

#### Run this SQL in Supabase SQL Editor:

```sql
-- Check current bookings table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
```

#### Required Columns:

Your `bookings` table MUST have these columns:

```sql
-- If columns are missing, add them:
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_time TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS party_size INTEGER NOT NULL DEFAULT 2;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 120;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES restaurant_tables(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

---

### Solution 3: Check/Fix RLS Policies

Even though the edge function uses SERVICE_ROLE_KEY (which bypasses RLS), let's ensure RLS isn't causing issues:

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'bookings';

-- Temporarily disable RLS for testing (DON'T DO IN PRODUCTION!)
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Or add a policy for service role:
CREATE POLICY "Service role can insert bookings"
ON bookings FOR INSERT
TO service_role
WITH CHECK (true);
```

---

### Solution 4: Check for Constraint Violations

```sql
-- Check all constraints on bookings table
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'bookings';
```

Common issues:
- `NOT NULL` constraints on columns the edge function isn't providing
- `CHECK` constraints that are failing
- Foreign key constraints to non-existent records

---

### Solution 5: Minimal Schema Fix (Quick Solution)

If you're unsure about the schema, create a minimal working table:

```sql
-- Backup existing table
CREATE TABLE bookings_backup AS SELECT * FROM bookings;

-- Drop and recreate with minimal schema
DROP TABLE IF EXISTS bookings CASCADE;

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  booking_time TIMESTAMPTZ NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  special_requests TEXT,
  status TEXT DEFAULT 'pending',
  duration_minutes INTEGER DEFAULT 120,
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_amount INTEGER DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT FALSE,
  table_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for testing
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Or create proper policy:
CREATE POLICY "Enable all for service role"
ON bookings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Restore data
INSERT INTO bookings SELECT * FROM bookings_backup;
```

---

## 🧪 Test After Fixing

### Step 1: Redeploy Edge Function (if you made changes)

If you updated the edge function code, redeploy it following `DEPLOY-NOW.md`.

### Step 2: Test with the Simple Script

```bash
# Test tenant lookup still works
node test-widget-simple.mjs

# Should show: ✅ TEST PASSED
```

### Step 3: Test Full Booking Flow

Try creating a booking through the widget again.

### Step 4: Verify in Database

```sql
-- Check if booking was created
SELECT * FROM bookings 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📋 Common Database Errors & Fixes

### Error: `column "status" does not exist`
**Fix:**
```sql
ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'pending';
```

### Error: `null value in column "party_size" violates not-null constraint`
**Fix:**
```sql
ALTER TABLE bookings ALTER COLUMN party_size SET DEFAULT 2;
```

### Error: `permission denied for table bookings`
**Fix:**
```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
ON bookings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Error: `insert or update on table "bookings" violates foreign key constraint`
**Fix:** Ensure the `tenant_id` and `table_id` (if provided) exist in their respective tables.

---

## 🔍 Debug Checklist

- [ ] Check edge function logs for actual database error
- [ ] Verify `bookings` table has all required columns
- [ ] Check RLS policies allow inserts
- [ ] Verify no failing constraints
- [ ] Test with minimal data (no optional fields)
- [ ] Check `tenant_id` is valid UUID and exists
- [ ] Redeploy edge function if you made changes

---

## 💡 Quick Debug Commands

```bash
# Check logs
npx supabase functions logs widget-booking-live --project-ref kbfbbkcaxhzlnbqxwgoz

# Check schema
node check-bookings-schema.mjs

# Test booking
# (Try creating a booking through the widget)
```

---

## 🆘 If Still Failing

1. **Get the exact error message** from edge function logs
2. **Share the error** - it will tell us exactly what's wrong:
   - Column doesn't exist?
   - Constraint violation?
   - RLS blocking?
   - Invalid data type?

3. **Check database directly:**
   ```sql
   -- Try manual insert
   INSERT INTO bookings (tenant_id, booking_time, party_size, guest_name, guest_email, status)
   VALUES (
     'e26b8b83-f7e1-47b9-9dbd-a527cf3f0107', -- mpizza tenant
     NOW(),
     2,
     'Test Guest',
     'test@example.com',
     'pending'
   ) RETURNING *;
   ```

   If this fails, you'll see the exact error!

---

## ✅ Expected Result After Fix

```
✅ Booking created successfully
✅ Confirmation #: PEND123ABC
✅ Status: pending
✅ Reservation ID: [uuid]
```

Then in database:
```sql
SELECT id, guest_name, status, booking_time 
FROM bookings 
ORDER BY created_at DESC 
LIMIT 1;
```

Should show your new booking!

---

**Next Step:** Check the edge function logs to see the actual database error, then apply the appropriate fix above.
