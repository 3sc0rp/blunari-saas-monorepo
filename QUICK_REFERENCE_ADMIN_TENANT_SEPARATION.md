# 🎯 QUICK REFERENCE: Admin vs Tenant Users

## How It Works Now

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD (admin.blunari.ai)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  👤 Admin User (YOU)                                 │  │
│  │  📧 drood.tech@gmail.com                             │  │
│  │  🔑 Manages ALL tenants                              │  │
│  │  ⚠️  Email NEVER changes via tenant management       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Manages ↓                                                   │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │ 🏪 Tenant: droodwick   │  │ 🏪 Tenant: Test Rest.  │    │
│  │ 👤 Owner: owner1@...   │  │ 👤 Owner: owner2@...   │    │
│  │ 🔑 Separate auth user  │  │ 🔑 Separate auth user  │    │
│  └────────────────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## When You Change Tenant Email

### ✅ What WILL Happen:
1. Edge Function checks if tenant has `owner_id`
2. If NO owner → Creates new auth user automatically
3. Updates tenant's `owner_id` to point to new user
4. Updates tenant's email
5. Creates profile for tenant owner
6. Success!

### ❌ What will NOT Happen:
- Your admin email stays `drood.tech@gmail.com`
- Your admin account is never touched
- No cross-tenant contamination

## Quick Commands

### Check Your Admin Email (Should Be Unchanged)
```sql
SELECT email FROM auth.users 
WHERE id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
-- Expected: drood.tech@gmail.com
```

### Check Tenant Owners
```sql
SELECT 
  t.name,
  t.email as tenant_email,
  au.email as owner_email,
  CASE 
    WHEN t.owner_id IS NULL THEN '❌ No owner'
    WHEN t.owner_id = '7d68eada-5b32-419f-aef8-f15afac43ed0' THEN '⚠️  ADMIN (BAD!)'
    ELSE '✅ Separate owner'
  END as status
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id;
```

### Remove Admin from Auto-Provisioning (If Needed)
```sql
DELETE FROM auto_provisioning 
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
```

## Safety Checks in Place

1. ✅ **Admin Detection**: Edge Function checks if user is admin
2. ✅ **Owner Validation**: Verifies owner is not admin before update
3. ✅ **Auto-Creation**: Creates owner if none exists
4. ✅ **Final Safety Check**: Refuses to modify admin users
5. ✅ **Logging**: Comprehensive logs for debugging

## Test Checklist

- [ ] Change tenant email via admin dashboard
- [ ] Verify your admin email unchanged
- [ ] Verify tenant has new owner_id
- [ ] Verify new auth user created
- [ ] Check Edge Function logs for success messages

## Emergency: If Admin Email Changed

```sql
-- 1. Check who changed it
SELECT * FROM security_events 
WHERE event_type = 'credential_change' 
ORDER BY created_at DESC LIMIT 5;

-- 2. Manually fix admin email
-- (Do this in Supabase Dashboard → Authentication → Users)

-- 3. Remove bad auto_provisioning links
DELETE FROM auto_provisioning 
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- 4. Remove bad owner_id links
UPDATE tenants 
SET owner_id = NULL 
WHERE owner_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
```

## Status

- ✅ Migration deployed
- ✅ Edge Function deployed  
- ✅ Safety checks active
- 🧪 Ready for testing

**Next**: Test changing a tenant email!
