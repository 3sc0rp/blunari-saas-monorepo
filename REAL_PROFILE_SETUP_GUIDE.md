# Setup Guide: Real Profile Data with Editing

**Date**: October 10, 2025  
**Status**: ✅ Ready to Deploy

---

## 🎯 What This Does

This setup enables your admin dashboard to:
1. ✅ Fetch **real user data** from the database (employees + profiles tables)
2. ✅ Display actual names, email, role, and avatar in the header dropdown
3. ✅ Allow **editing profile information** via Profile Settings page
4. ✅ Upload and change **profile avatars**
5. ✅ Automatically update the header when profile changes

---

## 🚀 Setup Steps (Run These in Order)

### Step 1: Create Your Admin Employee Record

**File**: `FIX-ACTUAL-ADMIN-USER.sql`

This script will:
- Find your admin@blunari.ai account
- Create employee record with SUPER_ADMIN role
- Create/update profile record with display data
- Link auto_provisioning records to your admin

**How to Run**:
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Open file `FIX-ACTUAL-ADMIN-USER.sql`
3. Copy all content (Ctrl+A, Ctrl+C)
4. Paste into SQL Editor (Ctrl+V)
5. Click **"Run"** button

**Expected Output**:
```
✅ Employee record created for admin@blunari.ai!
✅ Profile record created/updated for admin@blunari.ai!
✅ Auto_provisioning records updated to use admin@blunari.ai!
✅ Done! Everything is now linked to admin@blunari.ai
```

---

### Step 2: Create Avatar Storage Bucket

**File**: `CREATE-AVATAR-STORAGE-BUCKET.sql`

This script will:
- Create a public storage bucket for avatars
- Set up storage policies for upload/update/delete
- Allow avatars up to 2MB in size
- Support JPEG, PNG, GIF, WebP formats

**How to Run**:
1. Open Supabase SQL Editor (same link as above)
2. Open file `CREATE-AVATAR-STORAGE-BUCKET.sql`
3. Copy all content
4. Paste into SQL Editor
5. Click **"Run"** button

**Expected Output**:
```
✅ Bucket configured successfully
✅ Policy active (4 policies)
✅ Avatar storage bucket is ready!
```

---

### Step 3: Test the Profile Page

1. **Refresh** your admin dashboard
2. Click on your **avatar** in the top-right corner
3. Click **"Profile Settings"** (or press `⌘P`)
4. You should see the new profile page with:
   - ✅ Your current profile data (first name, last name, email, phone, bio)
   - ✅ Editable fields (all except email)
   - ✅ Avatar upload button (hover over avatar to see upload icon)
   - ✅ Save/Reset buttons when you make changes

---

## 📝 How to Edit Your Profile

### Change Your Name

1. Go to Profile Settings (`⌘P`)
2. Edit **First Name** and **Last Name** fields
3. Click **"Save Changes"** button
4. Page will reload automatically
5. Header dropdown will show your new name

### Upload an Avatar

1. Go to Profile Settings
2. **Hover over your avatar** → Upload icon appears
3. Click the avatar
4. Select an image file (max 2MB)
5. Preview will appear
6. Click **"Save Changes"**
7. Avatar uploads to Supabase Storage
8. Header dropdown updates with new avatar

### Update Contact Info

1. Go to Profile Settings
2. Edit **Phone Number** field (optional)
3. Edit **Bio** field (optional)
4. Click **"Save Changes"**

---

## 🔍 What Was Changed

### New Files Created

1. **`RealProfilePage.tsx`** (459 lines)
   - Real-time data fetching from database
   - Live editing with auto-save
   - Avatar upload to Supabase Storage
   - Form validation and error handling
   - Loading states and user feedback

2. **`FIX-ACTUAL-ADMIN-USER.sql`** (Updated)
   - Now creates BOTH employee and profile records
   - Profile record stores display data (names, avatar, phone, bio)
   - Employee record stores role and permissions

3. **`CREATE-AVATAR-STORAGE-BUCKET.sql`** (New)
   - Supabase Storage bucket setup
   - Public access for avatars
   - Security policies for upload/update/delete

### Modified Files

1. **`AdminHeader.tsx`**
   - Fetches employee data on mount
   - Fetches profile data for display names/avatar
   - Uses real data instead of mock data
   - Automatically re-fetches when profile changes

2. **`App.tsx`**
   - Changed route to use `RealProfilePage` instead of `ProfilePage`
   - All other routes unchanged

---

## 🎨 Profile Page Features

### Real-Time Data Fetching
```typescript
useEffect(() => {
  const fetchData = async () => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch employee
    const { data: empData } = await supabase
      .from("employees")
      .select("role, employee_id, status")
      .eq("user_id", user.id)
      .maybeSingle();
  };
}, [user?.id]);
```

### Avatar Upload
```typescript
const uploadAvatar = async () => {
  const fileExt = avatarFile.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  await supabase.storage
    .from("avatars")
    .upload(filePath, avatarFile, { upsert: true });

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return data.publicUrl;
};
```

### Form Validation
- First Name: Required
- Last Name: Required
- Email: Read-only (cannot be changed)
- Phone: Optional, any format
- Bio: Optional, up to 500 characters
- Avatar: Max 2MB, image formats only

### Auto-Save Detection
```typescript
const hasChanges = 
  JSON.stringify(editedProfile) !== JSON.stringify(profile) || 
  avatarFile !== null;

// Save/Reset buttons only show when hasChanges is true
```

---

## 🧪 Testing Checklist

### ✅ Header Dropdown
- [ ] Shows real first name + last name (not "Admin User")
- [ ] Shows correct role badge (Super Admin in red)
- [ ] Shows actual avatar if uploaded
- [ ] Shows initials if no avatar
- [ ] Shows online status indicator (green dot)
- [ ] Shows activity badge count if notifications exist
- [ ] System Status menu only visible to SUPER_ADMIN

### ✅ Profile Page
- [ ] Loads current profile data from database
- [ ] All fields are editable except email
- [ ] Avatar hover shows upload icon
- [ ] Can select and preview new avatar
- [ ] Save button only shows when changes made
- [ ] Reset button reverts all changes
- [ ] Saving shows loading spinner
- [ ] Success toast appears after save
- [ ] Page auto-reloads after save (header updates)

### ✅ Avatar Upload
- [ ] Can select image file
- [ ] Preview shows before saving
- [ ] Rejects files over 2MB
- [ ] Uploads to Supabase Storage
- [ ] Public URL is stored in profile
- [ ] Header updates with new avatar
- [ ] Old avatar is replaced (upsert)

---

## 🐛 Troubleshooting

### Issue: Profile page shows "Profile Not Found"

**Cause**: No profile record for admin user

**Fix**: Run `FIX-ACTUAL-ADMIN-USER.sql` script (Step 1)

**Verify**:
```sql
SELECT * FROM profiles WHERE email = 'admin@blunari.ai';
-- Should return 1 row with your data
```

---

### Issue: Avatar upload fails

**Cause**: Storage bucket doesn't exist or has wrong policies

**Fix**: Run `CREATE-AVATAR-STORAGE-BUCKET.sql` script (Step 2)

**Verify**:
```sql
SELECT * FROM storage.buckets WHERE id = 'avatars';
-- Should return 1 row with public = true
```

**Alternative**: Create bucket manually in Supabase Dashboard:
1. Go to Storage: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/storage/buckets
2. Click "Create bucket"
3. Name: `avatars`
4. Public: ✅ ON
5. File size limit: 2097152 (2MB)
6. Allowed MIME types: `image/jpeg, image/jpg, image/png, image/gif, image/webp`

---

### Issue: Header still shows "Admin User"

**Cause**: Profile doesn't have first_name/last_name

**Fix**: Edit profile via Profile Settings page:
1. Go to Profile Settings (`⌘P`)
2. Enter your First Name and Last Name
3. Click "Save Changes"
4. Page will reload with updated name

**Or via SQL**:
```sql
UPDATE profiles 
SET 
  first_name = 'Your First Name',
  last_name = 'Your Last Name'
WHERE email = 'admin@blunari.ai';
```

---

### Issue: Changes not saving

**Cause**: Database permissions or RLS policies

**Check RLS policies**:
```sql
-- Profiles should have UPDATE policy
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'UPDATE';
```

**Fix**: Ensure profiles table allows authenticated users to update their own records:
```sql
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### Issue: Avatar not displaying in header

**Cause**: Avatar URL not properly saved or bucket not public

**Check avatar URL**:
```sql
SELECT avatar_url FROM profiles WHERE email = 'admin@blunari.ai';
```

**Should look like**:
```
https://kbfbbkcaxhzlnbqxwgoz.supabase.co/storage/v1/object/public/avatars/avatars/abc123.jpg
```

**Fix**: Ensure bucket is public:
```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';
```

---

## 📊 Database Schema

### profiles table
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### employees table
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  employee_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔮 Future Enhancements (Optional)

### 1. Real-Time Updates
Use Supabase Realtime to update header when profile changes in another tab:
```typescript
const subscription = supabase
  .channel('profile-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    setEmployeeData(payload.new);
  })
  .subscribe();
```

### 2. Image Cropping
Add image cropping tool before upload (react-easy-crop):
```typescript
import Cropper from 'react-easy-crop';

const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
```

### 3. Avatar Templates
Provide default avatar templates if user doesn't upload:
- Gradient backgrounds
- Initial patterns
- Icon-based avatars

### 4. Profile Completeness
Show profile completion percentage:
```typescript
const completeness = [
  profile.first_name,
  profile.last_name,
  profile.phone,
  profile.bio,
  profile.avatar_url
].filter(Boolean).length / 5 * 100;
```

### 5. Activity Timeline
Show recent profile changes on profile page:
```sql
CREATE TABLE profile_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  changed_fields JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Summary

Your admin dashboard now has:

1. ✅ Real data fetching from employees + profiles tables
2. ✅ Enhanced header dropdown with actual user info
3. ✅ Editable profile page with live updates
4. ✅ Avatar upload to Supabase Storage
5. ✅ Auto-reload after profile changes
6. ✅ Role-based badges and conditional menu items
7. ✅ Form validation and error handling
8. ✅ Loading states and user feedback

**Next Steps**:
1. Run `FIX-ACTUAL-ADMIN-USER.sql` 
2. Run `CREATE-AVATAR-STORAGE-BUCKET.sql`
3. Refresh dashboard and test Profile Settings page
4. Upload your avatar and update your name
5. Verify header dropdown shows real data

🚀 **You're all set!** Your admin profile is now fully functional with real data and editing capabilities.
