# Complete Functional Testing Guide

**Date**: October 10, 2025  
**Purpose**: Verify all profile functionality works correctly  
**Status**: Ready for Testing

---

## 🔧 STEP 1: Run Required SQL Scripts

### Script 1: Create Admin Employee and Profile

**File**: `FIX-ACTUAL-ADMIN-USER.sql`

**What it does**:
- ✅ Finds your admin@blunari.ai user
- ✅ Creates employee record with SUPER_ADMIN role
- ✅ Creates profile record with display names
- ✅ Updates auto_provisioning records

**How to run**:
1. Open: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Copy ALL content from `FIX-ACTUAL-ADMIN-USER.sql`
3. Paste into SQL Editor
4. Click **"Run"** button

**Expected Output**:
```
✅ Employee record created for admin@blunari.ai!
✅ Profile record created/updated for admin@blunari.ai!
✅ Auto_provisioning records updated to use admin@blunari.ai!
✅ Done! Everything is now linked to admin@blunari.ai
```

---

### Script 2: Create Avatar Storage Bucket

**File**: `CREATE-AVATAR-STORAGE-BUCKET.sql`

**What it does**:
- ✅ Creates 'avatars' storage bucket
- ✅ Sets up public access
- ✅ Configures upload/update/delete policies
- ✅ Sets 2MB file size limit

**How to run**:
1. Same SQL Editor as above
2. Copy ALL content from `CREATE-AVATAR-STORAGE-BUCKET.sql`
3. Paste into SQL Editor
4. Click **"Run"** button

**Expected Output**:
```
✅ Bucket configured successfully
✅ Policy active (4 policies)
✅ Avatar storage bucket is ready!
📝 Users can now upload avatars up to 2MB in size
```

---

## ✅ STEP 2: Verify Database Setup

Run these verification queries in Supabase SQL Editor:

### Check 1: Employee Record
```sql
SELECT 
  e.employee_id,
  e.email,
  e.role,
  e.status,
  e.user_id
FROM employees e
WHERE e.email = 'admin@blunari.ai';
```

**Expected**:
- 1 row returned
- role = 'SUPER_ADMIN'
- status = 'ACTIVE'
- employee_id starts with 'EMP-'

---

### Check 2: Profile Record
```sql
SELECT 
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.phone,
  p.role
FROM profiles p
WHERE p.email = 'admin@blunari.ai';
```

**Expected**:
- 1 row returned
- first_name = 'Admin' (or your actual name if you edited it)
- last_name = 'User' (or your actual name if you edited it)
- email matches

---

### Check 3: Storage Bucket
```sql
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'avatars';
```

**Expected**:
- 1 row returned
- public = true
- file_size_limit = 2097152 (2MB)
- allowed_mime_types includes image types

---

### Check 4: Storage Policies
```sql
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%Avatar%';
```

**Expected**:
- 4 policies returned:
  - Avatar public access (SELECT)
  - Avatar upload access (INSERT)
  - Avatar update access (UPDATE)
  - Avatar delete access (DELETE)

---

## 🧪 STEP 3: Test Admin Dashboard

### Test 1: Login
1. Navigate to: https://admin.blunari.ai/auth (or your local URL)
2. Enter credentials:
   - Email: `admin@blunari.ai`
   - Password: `admin123`
3. Click "Sign In"

**Expected**: 
- ✅ Successful login
- ✅ Redirected to /admin/dashboard

**If fails**:
- Check auth.users table for admin@blunari.ai
- Verify password is correct
- Check browser console for errors

---

### Test 2: Header Dropdown

1. Look at top-right corner
2. Click on your avatar

**Expected**:
- ✅ Shows "Admin User" (or your actual name if set)
- ✅ Shows "admin@blunari.ai"
- ✅ Shows "Super Admin" badge in red/orange
- ✅ Shows green online status dot (pulsing)
- ✅ Shows employee ID badge
- ✅ Shows "Active" badge with pulse
- ✅ Menu items: Profile Settings, Account Settings, Billing, Activity Log, System Status, Sign Out

**If shows generic data**:
- Employee or profile record might be missing
- Re-run FIX-ACTUAL-ADMIN-USER.sql
- Hard refresh browser (Ctrl+Shift+R)

---

### Test 3: Profile Page Load

1. Press `⌘P` (or Ctrl+P on Windows)
2. OR click avatar → "Profile Settings"

**Expected**:
- ✅ Page loads without errors
- ✅ Shows gradient header card
- ✅ Shows larger avatar with online dot
- ✅ Shows your name and email
- ✅ Shows role badge (Super Admin)
- ✅ Shows employee ID badge
- ✅ Shows "Active" badge
- ✅ Form shows 2 columns on desktop (First Name, Last Name)
- ✅ Email field is editable
- ✅ Phone field is editable
- ✅ Required fields have red asterisks (*)

**If errors occur**:
- Open browser console (F12)
- Check Network tab for failed requests
- Verify RLS policies allow profile read
- Check if profile record exists

---

### Test 4: Edit First Name

1. Click in "First Name" field
2. Change to your actual first name (e.g., "John")
3. Click anywhere outside the field

**Expected**:
- ✅ Value updates in the field
- ✅ "Save Changes" button appears at top-right
- ✅ "Cancel" button appears
- ✅ No errors in console

---

### Test 5: Edit Last Name

1. Click in "Last Name" field
2. Change to your actual last name (e.g., "Doe")
3. Click anywhere outside the field

**Expected**:
- ✅ Value updates in the field
- ✅ Buttons remain visible
- ✅ No errors in console

---

### Test 6: Edit Phone Number

1. Click in "Phone Number" field
2. Enter a phone number (e.g., "+1 555-123-4567")
3. Click anywhere outside

**Expected**:
- ✅ Value updates
- ✅ No validation errors (optional field)

---

### Test 7: Save Changes (Without Email Change)

1. Ensure you've made changes (name, phone)
2. Click **"Save Changes"** button

**Expected**:
- ✅ Button shows "Saving..." with spinner
- ✅ Toast notification: "Success - Profile updated successfully"
- ✅ Page reloads after 1 second
- ✅ After reload, changes are visible
- ✅ Header dropdown shows new name

**If fails**:
- Check browser console for errors
- Verify RLS policies allow UPDATE on profiles
- Check Network tab for 400/500 errors
- Verify user is authenticated

---

### Test 8: Upload Avatar

1. Hover over avatar circle
2. You should see "Upload" text and icon
3. Click on the avatar
4. Select an image file (JPEG, PNG, max 2MB)
5. Preview should appear immediately
6. Click **"Save Changes"**

**Expected**:
- ✅ File selection dialog opens
- ✅ Preview shows selected image
- ✅ "Save Changes" button appears
- ✅ Button shows "Saving..." with spinner
- ✅ Avatar uploads to Supabase Storage
- ✅ Toast: "Success - Profile updated successfully"
- ✅ Page reloads
- ✅ New avatar shows in header and profile page

**If fails**:
- Check if avatars bucket exists (run Script 2)
- Verify storage policies allow INSERT
- Check file size (must be < 2MB)
- Check file format (must be image)
- Check browser console for storage errors
- Verify authenticated user has upload permissions

---

### Test 9: Change Email (Advanced)

⚠️ **IMPORTANT**: Only test this if you have access to both email addresses!

1. Click in "Email Address" field
2. Change to a test email you control
3. Click **"Save Changes"**

**Expected**:
- ✅ Button shows "Saving..."
- ✅ Toast: "Email Verification Required - Please check both your old and new email"
- ✅ Another toast: "Success - Profile updated! Check your email to verify"
- ✅ Page reloads

**Then check emails**:
- ✅ OLD email receives: "Confirm your email change"
- ✅ NEW email receives: "Verify your new email address"
- ✅ Must click links in BOTH emails
- ✅ After clicking both, email is changed
- ✅ Can login with NEW email

**If email change fails**:
- Verify Supabase email settings are configured
- Check spam folders for verification emails
- Ensure new email isn't already in use
- Wait 5 minutes and try again (rate limiting)

---

### Test 10: Cancel Changes

1. Make some changes (name, phone, etc.)
2. Click **"Cancel"** button

**Expected**:
- ✅ All changes revert to original values
- ✅ Avatar preview clears (if uploaded)
- ✅ Save/Cancel buttons disappear
- ✅ No data is saved to database

---

### Test 11: Copy Avatar URL

1. Scroll to bottom of form
2. Look for "Current Avatar URL" section (only shows if avatar uploaded)
3. Click **"Copy"** button

**Expected**:
- ✅ Toast: "Copied! - Avatar URL copied to clipboard"
- ✅ URL is in clipboard (can paste elsewhere)

---

### Test 12: Required Fields Validation

1. Clear "First Name" field (delete all text)
2. Try to save

**Expected**:
- ✅ Browser validation prevents submission
- ✅ OR: Error message about required field

**Note**: Currently no custom validation, relies on browser HTML5 validation

---

## 🔍 STEP 4: Troubleshooting Common Issues

### Issue 1: "Profile Not Found" error

**Symptoms**: White card saying "Profile Not Found"

**Causes**:
- No profile record in database
- Wrong user_id in profile record
- RLS policy blocking read

**Fixes**:
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE email = 'admin@blunari.ai';

-- If missing, create it
INSERT INTO profiles (user_id, email, first_name, last_name, role)
SELECT id, email, 'Admin', 'User', 'owner'
FROM auth.users
WHERE email = 'admin@blunari.ai'
ON CONFLICT (user_id) DO NOTHING;
```

---

### Issue 2: Header still shows "Admin User"

**Symptoms**: Dropdown shows generic "Admin User" instead of real name

**Causes**:
- Employee record missing
- Profile has null first_name/last_name
- AdminHeader not fetching data

**Fixes**:
```sql
-- Update profile with real name
UPDATE profiles 
SET first_name = 'Your First Name', last_name = 'Your Last Name'
WHERE email = 'admin@blunari.ai';

-- Create employee record if missing
INSERT INTO employees (user_id, employee_id, role, status, email)
SELECT id, 'EMP-ADMIN-001', 'SUPER_ADMIN', 'ACTIVE', email
FROM auth.users
WHERE email = 'admin@blunari.ai'
ON CONFLICT (user_id) DO UPDATE SET role = 'SUPER_ADMIN';
```

Then hard refresh: `Ctrl+Shift+R`

---

### Issue 3: Avatar upload fails

**Symptoms**: Error when trying to upload avatar

**Causes**:
- Storage bucket doesn't exist
- Storage policies not set
- File too large (> 2MB)
- Wrong file format

**Fixes**:
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- If missing, run CREATE-AVATAR-STORAGE-BUCKET.sql

-- Check policies
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%Avatar%';

-- If missing policies, re-run CREATE-AVATAR-STORAGE-BUCKET.sql
```

Also:
- Compress image to < 2MB
- Use JPG/PNG format
- Try different image

---

### Issue 4: Changes don't save

**Symptoms**: Click "Save Changes" but nothing happens

**Causes**:
- RLS policy blocking UPDATE
- Network error
- Invalid data

**Fixes**:
```sql
-- Check if you can update manually
UPDATE profiles 
SET first_name = 'Test'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai');

-- If error, check RLS policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'UPDATE';

-- Create policy if missing
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

Check browser console for specific errors.

---

### Issue 5: Email verification not working

**Symptoms**: Don't receive verification emails

**Causes**:
- Supabase email not configured
- Emails going to spam
- Rate limiting

**Fixes**:
1. Check Supabase email settings:
   - Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/settings/auth
   - Verify SMTP configured OR using Supabase email service
2. Check spam/junk folders
3. Wait 5-10 minutes (rate limiting)
4. Try with different email provider (Gmail vs Outlook)

---

## 📊 STEP 5: Performance Check

### Check Loading Time
1. Open Profile Settings
2. Open DevTools (F12) → Network tab
3. Reload page (F5)

**Expected**:
- ✅ Initial load: < 2 seconds
- ✅ Profile data fetch: < 500ms
- ✅ Employee data fetch: < 500ms
- ✅ No failed requests (red entries)

---

### Check Memory Usage
1. Open DevTools (F12) → Performance tab
2. Click record button
3. Navigate to Profile Settings
4. Make some changes
5. Save changes
6. Stop recording

**Expected**:
- ✅ No memory leaks
- ✅ Smooth 60fps animations
- ✅ CPU usage returns to idle after actions

---

## ✅ STEP 6: Final Verification Checklist

### Database Setup
- [ ] Employee record exists for admin@blunari.ai
- [ ] Profile record exists for admin@blunari.ai
- [ ] Avatars storage bucket exists
- [ ] Storage policies are active (4 policies)
- [ ] auto_provisioning records linked to admin user

### UI Functionality
- [ ] Header dropdown shows real data
- [ ] Profile page loads without errors
- [ ] Can edit first name
- [ ] Can edit last name
- [ ] Can edit email
- [ ] Can edit phone number
- [ ] Can upload avatar
- [ ] Can save changes
- [ ] Can cancel changes
- [ ] Can copy avatar URL
- [ ] Page reloads after save
- [ ] Header updates after save

### Visual Design
- [ ] Gradient header card displays
- [ ] Avatar shows with online status dot
- [ ] Upload overlay shows on hover
- [ ] Badges display with correct colors
- [ ] Form uses 2-column grid on desktop
- [ ] Required asterisks show
- [ ] Email warning displays
- [ ] Buttons styled correctly
- [ ] Responsive on mobile

### Integration
- [ ] Auth integration works
- [ ] Database queries succeed
- [ ] Storage uploads work
- [ ] Toast notifications show
- [ ] Page reload works
- [ ] No console errors

---

## 🎯 Success Criteria

✅ **FULLY FUNCTIONAL** if:
1. All SQL scripts run without errors
2. All database checks pass
3. All UI tests pass
4. All functionality tests pass
5. No console errors
6. Changes persist after reload
7. Header updates with new data

---

## 📞 Support

If any tests fail:
1. Check this guide's troubleshooting section
2. Review browser console errors
3. Check Supabase logs
4. Verify RLS policies
5. Re-run SQL scripts
6. Hard refresh browser (Ctrl+Shift+R)

---

## 📝 Test Results Template

Copy this and fill it out as you test:

```
# Profile Functionality Test Results
Date: October 10, 2025
Tester: [Your Name]

## Database Setup
- [ ] Script 1 (Employee/Profile): PASS/FAIL
- [ ] Script 2 (Storage Bucket): PASS/FAIL
- [ ] Employee record verified: PASS/FAIL
- [ ] Profile record verified: PASS/FAIL
- [ ] Storage bucket verified: PASS/FAIL

## UI Tests
- [ ] Login: PASS/FAIL
- [ ] Header dropdown: PASS/FAIL
- [ ] Profile page load: PASS/FAIL
- [ ] Edit first name: PASS/FAIL
- [ ] Edit last name: PASS/FAIL
- [ ] Edit phone: PASS/FAIL
- [ ] Save changes: PASS/FAIL
- [ ] Upload avatar: PASS/FAIL
- [ ] Change email: PASS/FAIL
- [ ] Cancel changes: PASS/FAIL
- [ ] Copy URL: PASS/FAIL

## Issues Found
[List any issues here]

## Overall Status
PASS / FAIL / PARTIAL

## Notes
[Any additional notes]
```

---

**Ready to test!** Follow this guide step-by-step to ensure everything is fully functional. 🚀
