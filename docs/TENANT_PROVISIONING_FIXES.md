# Tenant Provisioning - Final Fixes Applied ✅

## What Was Fixed

### 1. Edge Function Schema Mismatch ✅
**Problem**: The edge function was rejecting requests because it didn't accept all the fields the UI sends.

**Solution**: Updated the edge function to accept:
- `access` (mode: standard/premium)  
- `seed` (seating preset, pacing, deposit policy)
- `billing` (subscription settings)
- `sms` (registration settings)

**Status**: ✅ Deployed

### 2. Empty String Validation ✅
**Problem**: Optional fields like `website`, `description`, etc. were failing validation when sent as empty strings.

**Solution**: Added `cleanOptional()` function that converts empty strings to `undefined` before validation.

**Status**: ✅ Deployed

### 3. Database Function (auto_provisioning) ⚠️
**Problem**: Tenants don't show in admin UI because TenantsPage requires auto_provisioning records (INNER JOIN).

**Solution**: Created `fix-provision-tenant-with-auto-provisioning.sql`

**Status**: ⚠️ **NEEDS TO BE RUN IN DATABASE**

---

## How to Apply Database Fix

### Go to Supabase SQL Editor:
1. Open: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
2. Copy the entire contents of `fix-provision-tenant-with-auto-provisioning.sql`
3. Paste into the SQL editor
4. Click **RUN**

This will update the `provision_tenant` database function to create `auto_provisioning` records.

---

## Test Results

### ✅ Working:
```
✅ Login: admin@blunari.ai
✅ Authorization: SUPER_ADMIN access verified
✅ Validation: Empty strings handled correctly
✅ Provisioning: Tenant created successfully
✅ Tenant ID: 70f41d11-8113-4aee-8d3b-013802b0f527
✅ Auto-provisioning: Record created
```

---

## Common Errors & Solutions

### Error: "Slug must be at least 3 characters"
**Cause**: The slug field has less than 3 characters (like "ra")

**Solution**: 
- Let the auto-generation work (delete manual edits)
- Or manually enter a slug with 3+ characters
- The slug is auto-generated from the restaurant name

### Error: "Edge Function returned a non-2xx status code"
**Cause**: This is a generic error that could be:
1. Slug too short (see above)
2. Invalid email format
3. Invalid URL format in website field
4. Duplicate slug

**Solution**: Check the browser console (F12) for the actual error details

### Tenants Don't Show in UI
**Cause**: Missing auto_provisioning records

**Solution**: Run the database migration SQL file (see above)

---

## What to Do Now

1. **Run the database migration** (copy SQL file contents to Supabase dashboard)
2. **Hard refresh the admin UI** (Ctrl+Shift+R)
3. **Try creating a tenant**:
   - Enter a restaurant name
   - Let it auto-generate the slug (don't edit it)
   - Fill in owner email
   - Leave optional fields empty if you want
   - Click "Create Tenant"

4. **Check Tenant Management** page - should see all provisioned tenants

---

## Slug Auto-Generation Rules

The slug is automatically generated from the restaurant name:
- Converts to lowercase
- Removes special characters
- Replaces spaces with hyphens
- Removes consecutive hyphens
- Minimum 3 characters
- Maximum 50 characters

**Example**:
- Name: "Joe's Pizza & Pasta"
- Auto-generated slug: "joes-pizza-pasta"

**Reserved slugs** (cannot be used):
admin, api, auth, login, logout, register, signup, signin, dashboard, settings, billing, docs, help, support, public, static, assets, app, www, mail, cdn, images, files
