# 🧪 Profile Functionality Test Suite

**Date**: October 10, 2025  
**Focus**: Email Change Feature & Complete Profile Management  
**Status**: Ready for Testing

---

## ✅ Pre-Test Checklist

Before running tests, ensure:

- [ ] **SQL Scripts Run**: Both `FIX-ACTUAL-ADMIN-USER.sql` and `CREATE-AVATAR-STORAGE-BUCKET.sql` executed successfully
- [ ] **Database Verified**: Run `VERIFY-SETUP.sql` and confirm all checks pass
- [ ] **Admin Dashboard Running**: Dev server running on `http://localhost:5173` (or production URL)
- [ ] **Login Credentials**: You have access to `admin@blunari.ai` / `admin123`
- [ ] **Email Access**: You can access the email inbox for `admin@blunari.ai` and a test email

---

## 🎯 Test Suite Overview

### **Critical Tests** (Must Pass)
1. ✅ Profile Page Load
2. ✅ Data Fetching (Employee + Profile)
3. ✅ Email Change with Validation
4. ✅ Email Verification Flow
5. ✅ Avatar Upload
6. ✅ Profile Update (Names, Phone)
7. ✅ Error Handling

### **Secondary Tests** (Should Pass)
8. ✅ Form Validation
9. ✅ Cancel Changes
10. ✅ Copy Avatar URL
11. ✅ Auto-Reload After Save

---

## 📋 Detailed Test Cases

### **TEST 1: Profile Page Load** ⚡ CRITICAL

**Purpose**: Verify page loads without errors and displays real data

**Steps**:
1. Login to admin dashboard with `admin@blunari.ai` / `admin123`
2. Navigate to Profile Settings (click dropdown → Profile Settings, or press `Ctrl+P`)
3. Wait for page to load

**Expected Results**:
```
✅ Page loads within 2 seconds
✅ No console errors
✅ Profile card shows your data:
   - Avatar (or placeholder if none)
   - First Name: "Admin" (or your custom name)
   - Last Name: "User" (or your custom name)
   - Email: admin@blunari.ai
   - Phone: (empty or your phone)
   - Role Badge: SUPER_ADMIN (red badge)
   - Employee ID: EMP-ADMIN-001
   - Status: ACTIVE (green badge)
✅ Edit button is visible and enabled
```

**If Failed**:
- Check console for errors
- Run `VERIFY-SETUP.sql` to check database
- Ensure SQL scripts were executed
- Check if you're logged in as admin@blunari.ai

---

### **TEST 2: Email Validation** ⚡ CRITICAL

**Purpose**: Verify email validation prevents invalid emails

**Steps**:
1. Click "Edit" button in profile section
2. Change email to invalid formats and try to save each time:
   - `invalidemail` (no @ or domain)
   - `invalid@` (no domain)
   - `invalid@domain` (no TLD)
   - `@domain.com` (no local part)
   - `test @domain.com` (space in email)

**Expected Results**:
```
✅ Error toast appears for each invalid email:
   "Please enter a valid email address"
✅ Profile is NOT saved
✅ Original email remains unchanged
✅ Form validation works before network request
```

**If Failed**:
- Email validation logic needs review
- Check RealProfilePage.tsx validateEmail function
- Browser console should show validation error

---

### **TEST 3: Email Change - Valid Email** ⚡ CRITICAL

**Purpose**: Test email change with valid new email

**Prerequisites**: 
- Have access to a test email address (e.g., `your-test@example.com`)
- Be prepared to check BOTH email inboxes

**Steps**:
1. Click "Edit" button
2. Change email to a valid test email: `your-test@example.com`
3. Click "Save Changes"
4. Wait for success toast

**Expected Results**:
```
✅ Success toast appears:
   "Email Verification Required"
   "Please check both your old and new email for verification links"
✅ Profile shows loading indicator while saving
✅ No errors in console
✅ Page begins reload countdown (1 second)
✅ After reload, email still shows OLD email (admin@blunari.ai)
   This is CORRECT - email won't change until verified!
```

**What Happens Behind the Scenes**:
```sql
-- Supabase Auth actions:
1. Sends email to admin@blunari.ai with confirmation link
2. Sends email to your-test@example.com with verification link
3. Marks email change as "pending verification"
4. Updates profiles table immediately (but auth.users waits for verification)
5. Updates employees table with new email
```

**If Failed**:
- Check browser console for errors
- Check Network tab for failed requests
- Verify Supabase Auth is configured for email
- Check Supabase Auth → Email Templates

---

### **TEST 4: Email Verification Flow** ⚡ CRITICAL

**Purpose**: Complete the email verification process

**Prerequisites**: 
- Completed TEST 3 successfully
- Have access to both email inboxes

**Steps**:
1. **Check OLD email** (admin@blunari.ai):
   - Open email from Supabase
   - Subject: "Confirm email change"
   - Click the verification link
   - You should see a confirmation page

2. **Check NEW email** (your-test@example.com):
   - Open email from Supabase
   - Subject: "Verify your new email"
   - Click the verification link
   - You should see a confirmation page

3. **Verify Change**:
   - Go back to admin dashboard
   - Log out completely
   - Try to log in with OLD email → Should fail
   - Log in with NEW email + same password → Should succeed
   - Navigate to Profile Settings
   - Verify email now shows NEW email

**Expected Results**:
```
✅ Email 1 received at admin@blunari.ai with "Confirm Change" link
✅ Email 2 received at your-test@example.com with "Verify New Email" link
✅ Both verification links work and show success page
✅ Can no longer log in with old email
✅ Can log in with new email + same password
✅ Profile Settings shows new email
✅ Header dropdown shows correct email
✅ auth.users table shows new email
✅ profiles table shows new email
✅ employees table shows new email
```

**SQL Verification Query**:
```sql
-- Run this in Supabase SQL Editor to verify database changes
SELECT 
  'auth.users' as table_name,
  email
FROM auth.users 
WHERE id = (SELECT user_id FROM profiles WHERE email = 'your-test@example.com')
UNION ALL
SELECT 
  'profiles' as table_name,
  email
FROM profiles 
WHERE email = 'your-test@example.com'
UNION ALL
SELECT 
  'employees' as table_name,
  email
FROM employees 
WHERE email = 'your-test@example.com';

-- Expected: All 3 rows show your-test@example.com
```

**If Failed**:
- **No emails received**: Check Supabase Auth → Email Templates & SMTP settings
- **Verification link expired**: Links expire after 24 hours, repeat TEST 3
- **Can't log in with new email**: Check auth.users table for email_confirmed_at
- **Database not updated**: Check RLS policies on profiles and employees tables
- **Only 1 email received**: Check Supabase Auth settings for "Double opt-in"

---

### **TEST 5: Email Change Rollback** 🔄 CRITICAL

**Purpose**: Verify you can reject an email change

**Prerequisites**: 
- Have initiated an email change (TEST 3)
- Have NOT clicked verification links yet

**Steps**:
1. Go to OLD email inbox (admin@blunari.ai)
2. Open "Confirm email change" email
3. Look for "Reject this change" link (or don't click anything)
4. Wait 24 hours (or continue without verifying)
5. Try to log in with NEW email → Should fail
6. Try to log in with OLD email → Should succeed

**Expected Results**:
```
✅ If you don't verify within 24 hours, change is rejected
✅ Old email remains active
✅ New email is never activated
✅ Database reverts to old email (or stays unchanged)
```

**Security Note**: This prevents unauthorized email changes even if your account is compromised.

---

### **TEST 6: Profile Update - Names & Phone** ✅ IMPORTANT

**Purpose**: Test editing other profile fields

**Steps**:
1. Click "Edit" button
2. Change the following:
   - First Name: `John`
   - Last Name: `Doe`
   - Phone: `+1 (555) 123-4567`
3. Leave email unchanged
4. Click "Save Changes"

**Expected Results**:
```
✅ Success toast: "Profile updated successfully"
✅ Page reloads after 1 second
✅ After reload, profile shows:
   - First Name: John
   - Last Name: Doe
   - Phone: +1 (555) 123-4567
✅ Header dropdown shows "John Doe"
✅ No email verification required (email didn't change)
```

**SQL Verification**:
```sql
SELECT first_name, last_name, phone 
FROM profiles 
WHERE email = 'admin@blunari.ai';

-- Expected: John, Doe, +1 (555) 123-4567
```

**If Failed**:
- Check profiles table RLS policies
- Check console for update errors
- Verify user_id matches between auth.users and profiles

---

### **TEST 7: Avatar Upload** 📸 IMPORTANT

**Purpose**: Test avatar upload to Supabase Storage

**Prerequisites**: 
- Have a test image ready (JPG, PNG, GIF, or WebP)
- Image should be under 2MB

**Steps**:
1. Click "Edit" button
2. Click on the avatar image (hover should show "Upload" overlay)
3. Select your test image from file picker
4. You should see image preview immediately
5. Click "Save Changes"

**Expected Results**:
```
✅ File picker opens when avatar is clicked
✅ Preview shows immediately after selection
✅ Success toast after save: "Profile updated successfully"
✅ Page reloads after 1 second
✅ After reload, avatar shows your uploaded image
✅ Image is publicly accessible (no auth required)
✅ Storage bucket contains the file
```

**Image Requirements**:
- **Formats**: JPEG, JPG, PNG, GIF, WebP
- **Size**: Maximum 2MB
- **Path**: `avatars/{user_id}-{timestamp}.{ext}`

**Test Invalid Images**:
1. Try uploading a 5MB image → Should fail with error
2. Try uploading a PDF → Should fail (wrong file type)
3. Try uploading corrupted image → Should show error

**Storage Verification**:
```sql
-- Check storage bucket
SELECT * FROM storage.objects 
WHERE bucket_id = 'avatars' 
ORDER BY created_at DESC 
LIMIT 5;

-- You should see your uploaded avatar file
```

**If Failed**:
- Run `CREATE-AVATAR-STORAGE-BUCKET.sql` if not done
- Check storage policies (SELECT, INSERT, UPDATE, DELETE)
- Check file size limit (2MB)
- Check allowed MIME types
- Check console for upload errors

---

### **TEST 8: Form Validation** ✅ IMPORTANT

**Purpose**: Verify required field validation

**Steps**:
1. Click "Edit" button
2. Clear all required fields:
   - Delete First Name (clear entire field)
   - Delete Last Name (clear entire field)
   - Delete Email (clear entire field)
3. Try to click "Save Changes"

**Expected Results**:
```
✅ Error toast appears: "First name is required"
   (After fixing, next error appears: "Last name is required")
   (After fixing, next error appears: "Email is required")
✅ Profile is NOT saved to database
✅ Form validation prevents empty required fields
✅ Red asterisks (*) show required fields in UI
```

**Test Edge Cases**:
```javascript
// Test whitespace-only values
First Name: "   " → Should fail validation
Last Name: "\t\n" → Should fail validation
Email: "  @  " → Should fail validation

// Test extremely long values
First Name: 500 characters → Should truncate or show warning
Email: 300 characters → Should fail validation
```

**If Failed**:
- Check validation logic in handleSave function
- Ensure required fields have `.trim()` check
- Verify error messages are user-friendly

---

### **TEST 9: Cancel Changes** 🔄 FUNCTIONAL

**Purpose**: Test cancel button resets form

**Steps**:
1. Click "Edit" button
2. Make changes to multiple fields:
   - First Name: `Changed Name`
   - Email: `changed@example.com`
   - Phone: `999-999-9999`
3. **DO NOT** click Save
4. Click "Cancel" button

**Expected Results**:
```
✅ All fields reset to original values
✅ Avatar preview resets (if changed)
✅ No changes saved to database
✅ No network requests made
✅ Form returns to view mode (not edit mode)
```

**If Failed**:
- Check handleReset function
- Verify editedProfile state is reset to original profile
- Ensure avatarFile and avatarPreview are cleared

---

### **TEST 10: Copy Avatar URL** 📋 FUNCTIONAL

**Purpose**: Test copy-to-clipboard feature

**Steps**:
1. Ensure you have an avatar uploaded (or use default)
2. Look for "Copy URL" button near avatar
3. Click "Copy URL"
4. Paste into a text editor or new browser tab

**Expected Results**:
```
✅ Toast appears: "Avatar URL copied to clipboard!"
✅ Pasted URL is a valid Supabase Storage URL
✅ URL format: https://{project}.supabase.co/storage/v1/object/public/avatars/{filename}
✅ Opening URL in browser shows your avatar image
✅ No authentication required to view image
```

**If Failed**:
- Check if Clipboard API is supported
- Check avatar_url field in profile data
- Verify bucket is public
- Test in HTTPS context (localhost or production)

---

### **TEST 11: Auto-Reload After Save** 🔄 FUNCTIONAL

**Purpose**: Verify page reloads to refresh header data

**Steps**:
1. Note current header dropdown display name
2. Click "Edit" button
3. Change First Name to something different
4. Click "Save Changes"
5. Watch for page reload

**Expected Results**:
```
✅ Success toast appears first
✅ 1-second delay before reload
✅ Page reloads automatically
✅ Header dropdown updates with new name
✅ All data refreshes from database
✅ No manual refresh needed
```

**Why Auto-Reload?**
The header component fetches data on mount. Reloading ensures the header dropdown, avatar, and role badges all update with the latest data without requiring manual refresh.

**If Failed**:
- Check setTimeout logic in handleSave
- Verify window.location.reload() is called
- Check if browser blocks reload (some dev tools do this)

---

## 🐛 Common Issues & Troubleshooting

### **Issue 1: Profile Not Found**

**Symptoms**: 
- Page shows "Profile not found"
- Empty form fields

**Root Cause**: User missing profile or employee record

**Fix**:
```sql
-- Run this in Supabase SQL Editor
SELECT * FROM profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai');
SELECT * FROM employees WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai');

-- If empty, run FIX-ACTUAL-ADMIN-USER.sql
```

---

### **Issue 2: Avatar Upload Fails**

**Symptoms**: 
- Error toast: "Failed to upload avatar"
- Console shows 403 or 401 error

**Root Causes**:
1. Storage bucket doesn't exist
2. Storage policies missing
3. File size exceeds 2MB
4. Wrong file type

**Fix**:
```sql
-- Run CREATE-AVATAR-STORAGE-BUCKET.sql

-- Verify bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Verify policies
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

---

### **Issue 3: Email Not Changing**

**Symptoms**: 
- Email change seems to work but email stays the same
- No verification emails received

**Root Causes**:
1. Supabase Auth email disabled
2. SMTP not configured
3. Verification links expired
4. Email confirmations not completed

**Fix**:
1. Check Supabase Dashboard → Authentication → Email
2. Ensure "Enable email confirmations" is ON
3. Verify SMTP settings (or use Supabase's built-in email)
4. Check both email inboxes (old + new)
5. Click BOTH verification links

**Verification Query**:
```sql
SELECT 
  email, 
  email_confirmed_at,
  confirmation_sent_at
FROM auth.users 
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai');
```

---

### **Issue 4: Changes Don't Save**

**Symptoms**: 
- Success toast appears but changes not persisted
- After reload, old data shows

**Root Causes**:
1. RLS policies blocking update
2. user_id mismatch
3. Database constraints failing

**Fix**:
```sql
-- Check RLS policies on profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Test update manually
UPDATE profiles 
SET first_name = 'Test' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai');

-- If error, check RLS policy:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id);
```

---

### **Issue 5: Email Verification Links Expired**

**Symptoms**: 
- Click verification link → "Link expired" error
- Can't complete email change

**Root Cause**: Links expire after 24 hours

**Fix**:
1. Go back to Profile Settings
2. Change email again (to same new email)
3. New verification emails will be sent
4. Complete verification within 24 hours

---

### **Issue 6: Header Still Shows "Admin User"**

**Symptoms**: 
- Changed name in profile but header unchanged
- Dropdown shows generic "Admin User"

**Root Causes**:
1. Page didn't reload after save
2. Header component not fetching updated data
3. Profile update didn't save

**Fix**:
1. Manually refresh page (F5)
2. Check if auto-reload is working
3. Verify profile data saved:
```sql
SELECT first_name, last_name FROM profiles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai');
```

---

## 🎯 Performance Benchmarks

### **Expected Load Times**:
- Profile page initial load: < 2 seconds
- Data fetch (profiles + employees): < 500ms
- Avatar upload (1MB image): < 3 seconds
- Profile save (no email change): < 1 second
- Profile save (with email change): < 2 seconds

### **Browser Console Checks**:
```javascript
// Check for errors
console.errors() // Should be 0

// Check for warnings
console.warnings() // Should be minimal

// Check network requests
// Profile load: 2-3 requests (profiles, employees, storage)
// Profile save: 3-5 requests (storage upload, profiles update, employees update, auth update)
```

---

## ✅ Final Verification Checklist

### **Database Integrity**
- [ ] `auth.users` has admin@blunari.ai record
- [ ] `profiles` has matching record with user_id
- [ ] `employees` has matching record with user_id and SUPER_ADMIN role
- [ ] `storage.buckets` has 'avatars' bucket
- [ ] Storage policies exist (4 policies: SELECT, INSERT, UPDATE, DELETE)
- [ ] All foreign keys correctly linked

### **UI Functionality**
- [ ] Profile page loads without errors
- [ ] All fields display correct data
- [ ] Edit mode enables all inputs
- [ ] Email validation prevents invalid emails
- [ ] Avatar upload works with valid images
- [ ] Avatar upload rejects invalid files (size, type)
- [ ] Save button shows loading state
- [ ] Success/error toasts appear correctly
- [ ] Cancel button resets form
- [ ] Copy URL button works

### **Email Change Flow**
- [ ] Email validation works (format check)
- [ ] Valid email change triggers verification
- [ ] Verification emails sent to BOTH addresses
- [ ] Email change toast shows correct message
- [ ] Both verification links work
- [ ] After verification, can log in with new email
- [ ] Database updated in all 3 tables (auth.users, profiles, employees)
- [ ] Header dropdown updates after verification

### **Error Handling**
- [ ] Invalid email shows error
- [ ] Empty required fields show error
- [ ] Oversized avatar shows error
- [ ] Wrong file type shows error
- [ ] Network errors display user-friendly message
- [ ] Auth errors caught and displayed
- [ ] Database errors handled gracefully

### **Security**
- [ ] RLS policies prevent unauthorized updates
- [ ] Email change requires verification
- [ ] Avatar bucket is public (read-only for unauthenticated)
- [ ] Avatar upload restricted to authenticated users
- [ ] Password not exposed in UI or logs
- [ ] Session maintained across page reload

---

## 📊 Test Results Template

```
=== PROFILE FUNCTIONALITY TEST RESULTS ===
Date: ___________
Tester: ___________

CRITICAL TESTS:
[ ] TEST 1: Profile Page Load - PASS/FAIL - Notes: ___________
[ ] TEST 2: Email Validation - PASS/FAIL - Notes: ___________
[ ] TEST 3: Email Change - Valid Email - PASS/FAIL - Notes: ___________
[ ] TEST 4: Email Verification Flow - PASS/FAIL - Notes: ___________
[ ] TEST 5: Email Change Rollback - PASS/FAIL - Notes: ___________

IMPORTANT TESTS:
[ ] TEST 6: Profile Update - Names & Phone - PASS/FAIL - Notes: ___________
[ ] TEST 7: Avatar Upload - PASS/FAIL - Notes: ___________
[ ] TEST 8: Form Validation - PASS/FAIL - Notes: ___________

FUNCTIONAL TESTS:
[ ] TEST 9: Cancel Changes - PASS/FAIL - Notes: ___________
[ ] TEST 10: Copy Avatar URL - PASS/FAIL - Notes: ___________
[ ] TEST 11: Auto-Reload After Save - PASS/FAIL - Notes: ___________

OVERALL STATUS: PASS/FAIL
CRITICAL ISSUES FOUND: ___________
NON-CRITICAL ISSUES: ___________
RECOMMENDATIONS: ___________
```

---

## 🚀 Next Steps After Testing

### **If All Tests Pass** ✅
1. Mark feature as production-ready
2. Update user documentation
3. Train support team on email change flow
4. Monitor for edge cases in production

### **If Tests Fail** ❌
1. Document which tests failed
2. Review error logs and console output
3. Fix issues based on troubleshooting guide
4. Re-run failed tests
5. Consider adding more error handling

### **Future Enhancements** 🔮
1. Add password confirmation before email change
2. Email change history tracking
3. Two-factor authentication integration
4. Profile completion progress indicator
5. Image cropping tool for avatars
6. Social media links section
7. Export profile data (GDPR compliance)

---

## 📞 Support

If you encounter issues not covered in this guide:

1. Check Supabase logs: Dashboard → Logs
2. Check browser console: F12 → Console tab
3. Run diagnostic queries in SQL Editor
4. Review recent code changes in git log
5. Check Supabase Auth settings
6. Verify environment variables

---

**Document Version**: 1.0  
**Last Updated**: October 10, 2025  
**Author**: GitHub Copilot  
**Tested By**: ___________  
**Status**: ✅ Ready for Testing
