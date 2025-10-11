# 🎯 Regenerate Supabase Types

The `owner_id` column was added to the `tenants` table via migration, but the TypeScript types haven't been regenerated yet.

## Current Status

✅ **Temporary fix applied:** Used type assertion in `TenantConfiguration.tsx` to access `owner_id`
⚠️ **Types out of sync:** `apps/admin-dashboard/src/integrations/supabase/types.ts` needs regeneration

---

## How to Regenerate Types

### Option 1: Using Supabase CLI (Recommended)

```powershell
# Navigate to project root
cd "c:\Users\Drood\Desktop\Blunari SAAS"

# Generate types from remote database
npx supabase gen types typescript --project-id <your-project-id> > apps/admin-dashboard/src/integrations/supabase/types.ts

# Also update client-dashboard types
npx supabase gen types typescript --project-id <your-project-id> > apps/client-dashboard/src/integrations/supabase/types.ts
```

To find your project ID:
1. Go to Supabase Dashboard
2. Settings → General → Project ID

### Option 2: Using Environment Variable

If you have `SUPABASE_PROJECT_REF` in your env:

```powershell
# For admin-dashboard
npx supabase gen types typescript --project-id $env:SUPABASE_PROJECT_REF > apps/admin-dashboard/src/integrations/supabase/types.ts

# For client-dashboard  
npx supabase gen types typescript --project-id $env:SUPABASE_PROJECT_REF > apps/client-dashboard/src/integrations/supabase/types.ts
```

### Option 3: Using Local Schema

If you have a local Supabase instance:

```powershell
# From local database
npx supabase gen types typescript --local > apps/admin-dashboard/src/integrations/supabase/types.ts
```

---

## What Will Be Updated

After regeneration, the `tenants` table type will include:

```typescript
tenants: {
  Row: {
    // ... existing fields
    owner_id: string | null  // ← NEW FIELD
  }
  Insert: {
    // ... existing fields
    owner_id?: string | null  // ← NEW FIELD
  }
  Update: {
    // ... existing fields
    owner_id?: string | null  // ← NEW FIELD
  }
}
```

---

## Files That Need Type Regeneration

1. **Admin Dashboard:**
   - `apps/admin-dashboard/src/integrations/supabase/types.ts`

2. **Client Dashboard:**
   - `apps/client-dashboard/src/integrations/supabase/types.ts`

---

## After Regeneration

Once types are regenerated, you can remove the type assertion:

### Current (with type assertion):
```typescript
const tenantWithOwner = tenantData as typeof tenantData & { owner_id?: string | null };
if (tenantWithOwner.owner_id) {
```

### After regeneration:
```typescript
// Can use directly
if (tenantData.owner_id) {
```

---

## Verification

After regenerating types, verify:

```powershell
# Check for TypeScript errors
cd "c:\Users\Drood\Desktop\Blunari SAAS\apps\admin-dashboard"
npm run type-check

# Or from root
cd "c:\Users\Drood\Desktop\Blunari SAAS"
npm run type-check
```

---

## Why Types Are Out of Sync

The `owner_id` column was added via SQL migration:
- File: `supabase/migrations/20251010120000_add_owner_id_to_tenants.sql`
- Applied to: Production database
- TypeScript types: Not yet regenerated

This is normal workflow - database changes first, then regenerate types.

---

## Quick Command Reference

```powershell
# Check Supabase CLI version
npx supabase --version

# Login to Supabase (if needed)
npx supabase login

# List projects
npx supabase projects list

# Generate types (replace <project-id>)
npx supabase gen types typescript --project-id <project-id> > apps/admin-dashboard/src/integrations/supabase/types.ts
```

---

**Status**: Types can be regenerated when convenient. App works with current type assertion. ✅
