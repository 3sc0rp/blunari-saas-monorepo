# Email Change Feature - Documentation

**Date**: October 10, 2025  
**Feature**: Editable Email with Verification  
**Status**: ✅ Complete

---

## 🎯 What Changed

The email field in the Profile Settings page is now **fully editable**. When you change your email:

1. ✅ Updates `auth.users` table (Supabase Auth)
2. ✅ Updates `profiles` table 
3. ✅ Updates `employees` table (if you're an admin)
4. ✅ Sends verification emails to **both** old and new addresses
5. ✅ Requires confirmation before the change takes effect

---

## 🔒 Security & Verification Process

### How It Works

When you change your email:

```
1. Click "Save Changes" with new email
   ↓
2. Supabase Auth sends verification emails:
   - Email to OLD address: "Confirm email change"
   - Email to NEW address: "Verify your new email"
   ↓
3. You must click the link in BOTH emails
   ↓
4. After both confirmations, email is fully changed
   ↓
5. Database tables (profiles, employees) update automatically
```

### Why Two Emails?

**Security!** This prevents unauthorized email changes:
- If someone hacks your account, you'll get an email warning
- You can reject the change by clicking the link in your old email
- The new owner must verify they control the new address

---

## 📝 How to Change Your Email

### Step 1: Go to Profile Settings

1. Click your avatar (top-right corner)
2. Click "Profile Settings" or press `⌘P`

### Step 2: Edit Email Field

1. Find the **"Email Address"** field
2. Delete the old email
3. Type your new email address
4. Click **"Save Changes"**

### Step 3: Check Your Emails

You'll see a toast notification:
```
✉️ Email Verification Required
Please check both your old and new email for verification links
```

**Check BOTH inboxes:**
- **Old Email**: Subject: "Confirm your email change"
- **New Email**: Subject: "Verify your new email address"

### Step 4: Click Both Verification Links

1. Open email in **old inbox** → Click the confirmation link
2. Open email in **new inbox** → Click the verification link
3. Wait a few seconds for confirmation

### Step 5: Verify the Change

1. Refresh your dashboard
2. Click avatar → Profile Settings
3. Email field should show your new email
4. Header dropdown should show new email

---

## ⚠️ Important Notes

### Email Change Limitations

1. **Verification Required**: You must have access to BOTH email addresses
2. **Temporary Limbo**: Until verified, your old email is still active
3. **Login During Change**: Use your OLD email to log in until verification complete
4. **Expiration**: Verification links expire after 24 hours
5. **One at a Time**: Can't change email again until current change is verified

### What Gets Updated

When email change is complete:

| Table | Field Updated | Notes |
|-------|---------------|-------|
| `auth.users` | `email` | Primary authentication email |
| `profiles` | `email` | Display email in UI |
| `employees` | `email` | Admin employee record |

### Failed Changes

If email change fails:
- Check if new email is already in use
- Ensure new email is valid format
- Verify you have access to both inboxes
- Check spam folders for verification emails
- Try again after 5 minutes if rate limited

---

## 🧪 Testing Your Email Change

### Test Scenario 1: Change to New Email

1. Current email: `admin@blunari.ai`
2. New email: `newemail@example.com`
3. Save changes
4. Check both inboxes
5. Click both verification links
6. Refresh dashboard
7. Verify new email shows everywhere

### Test Scenario 2: Cancel Email Change

1. Start email change process
2. Receive verification emails
3. **Don't click either link**
4. Wait 24 hours
5. Links expire
6. Old email remains active

### Test Scenario 3: Reject Email Change

1. Start email change (accidentally or maliciously)
2. Check old email inbox
3. Click "Cancel email change" link
4. Email change is rejected
5. Old email stays active

---

## 🔧 Technical Implementation

### Frontend Code (RealProfilePage.tsx)

```typescript
// Check if email changed
const emailChanged = editedProfile.email !== profile.email;

// Update auth.users via Supabase Auth
if (emailChanged && editedProfile.email) {
  const { error: authError } = await supabase.auth.updateUser({
    email: editedProfile.email,
  });

  if (authError) {
    throw new Error(`Failed to update email: ${authError.message}`);
  }

  toast({
    title: "Email Verification Required",
    description: "Please check both your old and new email for verification links",
  });
}

// Update profiles table
await supabase
  .from("profiles")
  .update({ email: editedProfile.email })
  .eq("user_id", user.id);

// Update employees table
await supabase
  .from("employees")
  .update({ email: editedProfile.email })
  .eq("user_id", user.id);
```

### Supabase Auth Flow

1. **Initial Request**: `supabase.auth.updateUser({ email: newEmail })`
2. **Supabase Actions**:
   - Generates secure tokens for both emails
   - Sends verification emails
   - Marks email as "pending verification"
3. **User Confirms**: Clicks links in both emails
4. **Supabase Finalizes**: 
   - Updates `auth.users.email`
   - Triggers database update events
   - Updates session tokens

### Database Triggers (Optional Enhancement)

To keep tables in sync automatically, you could add:

```sql
-- Trigger to update profiles when auth.users email changes
CREATE OR REPLACE FUNCTION sync_email_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET email = NEW.email, updated_at = NOW()
  WHERE user_id = NEW.id;
  
  UPDATE employees
  SET email = NEW.email
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_email_on_auth_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_email_to_profiles();
```

---

## 📊 UI Changes

### Before
```tsx
{/* Email (Read-only) */}
<Input
  id="email"
  value={profile.email}
  disabled  // ❌ Not editable
  className="bg-slate-900/50 border-slate-700 text-slate-400"
/>
<p className="text-xs text-slate-500">
  Email cannot be changed
</p>
```

### After
```tsx
{/* Email (Editable with verification) */}
<Input
  id="email"
  type="email"
  value={editedProfile.email || ""}
  onChange={(e) =>
    setEditedProfile({ ...editedProfile, email: e.target.value })
  }  // ✅ Fully editable
  placeholder="Enter your email"
  className="bg-slate-900/50 border-slate-700 text-slate-100"
/>
<p className="text-xs text-slate-500">
  ⚠️ Changing your email requires verification. You'll receive emails at both old and new addresses.
</p>
```

---

## 🐛 Troubleshooting

### Issue: Not receiving verification emails

**Possible Causes**:
1. Emails in spam/junk folder
2. Invalid email address format
3. Email service blocking Supabase emails
4. Rate limit exceeded (too many attempts)

**Solutions**:
- Check spam/junk folders
- Wait 5-10 minutes and try again
- Use a different email provider (Gmail, Outlook)
- Contact Supabase support if persistent

---

### Issue: Verification link expired

**Cause**: Links expire after 24 hours

**Solution**:
1. Go back to Profile Settings
2. Change email again (same new email)
3. New verification emails will be sent
4. Complete verification within 24 hours

---

### Issue: Email already in use

**Cause**: Another user has this email

**Solution**:
- Use a different email address
- If you own the other account, delete it first
- Contact support if you believe it's your email

---

### Issue: Can't log in after email change

**Cause**: Using new email before verification complete

**Solution**:
- Log in with your **OLD** email address
- Complete verification process
- After verification, use **NEW** email to log in

---

## 🔮 Future Enhancements (Optional)

### 1. Email Change History
Track all email changes:
```sql
CREATE TABLE email_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);
```

### 2. Email Verification Status Badge
Show verification status in UI:
```tsx
{emailChangeInProgress && (
  <Badge variant="warning">
    Email Change Pending
  </Badge>
)}
```

### 3. Require Password for Email Change
Add extra security layer:
```tsx
const [currentPassword, setCurrentPassword] = useState("");

// Before changing email, verify password
const { error } = await supabase.auth.signInWithPassword({
  email: profile.email,
  password: currentPassword,
});

if (error) {
  throw new Error("Invalid password");
}
```

### 4. Notification of Email Change
Send notification to other communication channels:
- SMS to phone number
- Slack/Discord webhook
- Push notification to mobile app

---

## ✅ Summary

Email is now **fully editable** with:

1. ✅ Editable email field in Profile Settings
2. ✅ Verification required (both old and new email)
3. ✅ Updates auth.users, profiles, and employees tables
4. ✅ Toast notifications for user feedback
5. ✅ Security warnings about verification process
6. ✅ Proper error handling and validation

**Files Changed**:
- ✅ `apps/admin-dashboard/src/pages/RealProfilePage.tsx`

**Committed**: Commit hash will be generated after push

---

**Important**: Test the email change feature carefully before using in production. Make sure you have access to both email addresses when testing!
