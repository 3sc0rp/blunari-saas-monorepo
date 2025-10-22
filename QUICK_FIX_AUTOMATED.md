# Quick Fix Guide - Automated Owner User Creation

## What's Fixed

✅ **Tenant deletion** - Now works (permissions granted)
✅ **Automated owner fix** - New Edge Function creates separate owners

## How to Fix Your Tenants (Automated)

### Use the `fix-tenant-owner` Edge Function

Call this function for EACH tenant to give them their own owner user:

```bash
# Example for Warrior Factory
curl -X POST https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/fix-tenant-owner \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "WARRIOR_FACTORY_TENANT_ID",
    "newOwnerEmail": "wfactory-owner@yourdomain.com"
  }'
```

### Or Call from Admin Dashboard Console

Open browser console on admin dashboard and run:

```javascript
// Get your tenant IDs first
const tenants = await supabase.from('tenants').select('id, name, slug');
console.table(tenants.data);

// Fix Warrior Factory (replace with actual tenant ID)
const response = await supabase.functions.invoke('fix-tenant-owner', {
  body: {
    tenantId: 'TENANT_ID_HERE',
    newOwnerEmail: 'wfactory-owner@yourdomain.com'  // MUST BE UNIQUE!
  }
});

console.log(response);
// Save the temporary password shown in response!
```

### Step-by-Step

1. **Open Admin Dashboard** in browser
2. **Open DevTools Console** (F12 → Console tab)
3. **Get tenant IDs**:
   ```javascript
   const { data: tenants } = await supabase.from('tenants').select('id, name, slug');
   console.table(tenants);
   ```

4. **Fix each tenant** (one at a time):

   **Warrior Factory**:
   ```javascript
   const wfactory = await supabase.functions.invoke('fix-tenant-owner', {
     body: {
       tenantId: 'COPY_ID_FROM_STEP_3',
       newOwnerEmail: 'wfactory-owner@gmail.com'
     }
   });
   console.log('Password:', wfactory.data?.newOwner?.temporaryPassword);
   ```

   **Nature Village**:
   ```javascript
   const nature = await supabase.functions.invoke('fix-tenant-owner', {
     body: {
       tenantId: 'COPY_ID_FROM_STEP_3',
       newOwnerEmail: 'nature-owner@gmail.com'
     }
   });
   console.log('Password:', nature.data?.newOwner?.temporaryPassword);
   ```

   **droodwick**:
   ```javascript
   const dpizza = await supabase.functions.invoke('fix-tenant-owner', {
     body: {
       tenantId: 'COPY_ID_FROM_STEP_3',
       newOwnerEmail: 'dpizza-owner@gmail.com'
     }
   });
   console.log('Password:', dpizza.data?.newOwner?.temporaryPassword);
   ```

5. **Save the passwords** shown in console output!

6. **Verify it worked**:
   ```javascript
   const { data: check } = await supabase
     .from('tenants')
     .select('name, slug, owner_id, profiles(email)')
     .order('created_at', { ascending: false });
   console.table(check);
   ```
   Each tenant should now have different `owner_id` and email!

## After Fixing

✅ Each tenant has its own dedicated owner user
✅ Tenant deletion button will work
✅ Email updates work independently per tenant
✅ No more shared credentials

## Testing

1. **Try deleting a test tenant** - Should work now
2. **Try updating tenant email** - Should work without affecting others
3. **Check Login Credentials section** - Should show correct email per tenant

## Important Notes

- **Each email MUST be unique** across all tenants
- **Save the temporary passwords** - shown only once
- **No data loss** - All bookings, menus, tables preserved
- **Zero downtime** - Can do this while system is running

---

**Everything is deployed and ready!** Just run the JavaScript commands in your admin dashboard console. 🚀
