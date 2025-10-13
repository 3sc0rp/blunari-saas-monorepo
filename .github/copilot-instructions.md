# Blunari SAAS - AI Agent Instructions

## Project Overview

**Blunari** is a multi-tenant restaurant booking platform built as a Turborepo monorepo with three main applications: `admin-dashboard`, `client-dashboard`, and `background-ops`. The platform uses Supabase (PostgreSQL + Edge Functions) for backend services and enforces strict tenant isolation via Row-Level Security (RLS) policies.

## Architecture

### Monorepo Structure
```
apps/
  admin-dashboard/     # React + Vite - Admin management portal (admin.blunari.ai)
  client-dashboard/    # React + Vite - Tenant dashboard (app.blunari.ai)
  background-ops/      # Node.js + Express - Headless API service (Fly.io)
packages/
  types/              # Shared TypeScript types
  utils/              # Shared utilities
  config/             # Shared configurations
supabase/
  functions/          # Deno Edge Functions
  migrations/         # PostgreSQL migrations
```

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, React Query, Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Deployment**: Vercel (dashboards), Fly.io (background-ops)
- **Build System**: Turborepo with workspace-aware caching

## Critical Multi-Tenant Architecture

### Tenant Isolation Model

**CRITICAL**: This platform implements strict tenant isolation. Every database operation MUST respect tenant boundaries.

#### Key Tables & Relationships
- `tenants` - Core tenant records with `owner_id` (UUID) linking to auth user
- `auto_provisioning` - Maps `user_id` → `tenant_id` for access control
- `profiles` - User profiles with `role` field (admin, tenant_owner, employee, etc.)
- `employees` - Staff members with role-based permissions, linked to `tenant_id`
- `bookings`, `restaurant_tables`, `business_hours`, etc. - All have `tenant_id` foreign key

#### Admin vs Tenant User Separation
**Context**: See `ADMIN_TENANT_SEPARATION_COMPLETE.md` for full details.

- **Admin users** (employees table, role: `ADMIN`) can manage ALL tenants but their accounts MUST NOT be modified via tenant management operations
- **Tenant owners** have dedicated auth users linked via `tenants.owner_id`
- Edge Function `manage-tenant-credentials` auto-creates tenant owner users when needed
- Changing tenant email creates a NEW auth user for that tenant, never modifies admin users

#### RLS Policies Pattern
All tenant-scoped tables use RLS policies checking:
```sql
-- Standard pattern in migrations
CREATE POLICY "Tenant isolation" ON table_name
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);
```

Functions like `strict_tenant_access_check(tenant_id)` and `has_employee_role(role)` are defined in migrations for reusable authorization logic.

## Development Workflows

### Running the Monorepo

```powershell
# Install dependencies (from root)
npm install

# Start all apps in parallel
npm run start:dev

# Start individual apps
npm run dev:admin          # Admin dashboard on port 5174
npm run dev:client         # Client dashboard on port 5173
npm run dev:background-ops # Background service on port 3000

# Build all apps
npm run build

# Type checking across workspace
npm run type-check
```

### Supabase Development

```powershell
# Generate TypeScript types from database schema
cd apps/client-dashboard  # or apps/admin-dashboard
npx supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts

# Deploy Edge Functions (critical - see CORS caveat below)
cd supabase/functions/<function-name>
supabase functions deploy <function-name>

# Run database migration
supabase db push
```

**CRITICAL**: Supabase Edge Functions deployment has import path limitations. Shared modules (like CORS helpers in `_shared/`) MUST be duplicated into each function directory. See `docs/cors-management.md` for the hybrid approach pattern.

### Deployment

#### Client Dashboard (Vercel)
**IMPORTANT**: `vercel.json` specifies custom build/output paths for monorepo:
```json
{
  "buildCommand": "cd apps/client-dashboard && npm run build",
  "outputDirectory": "apps/client-dashboard/dist",
  "installCommand": "cd apps/client-dashboard && npm install"
}
```

**Key Points**:
- `installCommand` runs first and must `cd` into the app directory to install dependencies correctly
- `buildCommand` runs after install and executes the Vite build
- Build dependencies (like `vite`, `typescript`) are in `devDependencies` and MUST be installed

Deploy via:
```powershell
# Auto-deploy on git push to master (if Vercel GitHub integration configured)
git push origin master

# Manual deploy from root
cd apps/client-dashboard
vercel --prod
```

#### Admin Dashboard (Vercel)
Similar pattern - check project-specific `vercel.json` or Vercel dashboard settings.

#### Background-Ops (Fly.io)
```powershell
cd apps/background-ops
fly deploy
```

## Code Patterns & Conventions

### Analytics: Real Data Only Policy

**Context**: See `apps/client-dashboard/README.md` section "Real Data Only Policy"

Client dashboard intentionally **NEVER** fabricates or simulates analytics data. If Edge Functions or DB queries fail, components render **empty states** or **explicit errors**, never synthetic placeholders.

- Debug logging gated behind `VITE_ANALYTICS_DEBUG=true` flag
- Tests assert absence of mock/demo/placeholder strings in analytics payloads
- Fallback chain: Edge Function → Direct DB query → Empty state (never synthetic data)

### Supabase Client Pattern

**DO NOT** import `@supabase/supabase-js` in widget runtime code. Use the booking proxy pattern:
```typescript
// apps/client-dashboard/src/api/booking-proxy.ts
// Safe for public widget - no supabase-js import
async function getUserAccessToken(supabaseUrl?: string): Promise<string | undefined> {
  // Extracts token from browser storage or cookie
}
```

For authenticated dashboard code:
```typescript
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.from('bookings').select('*');
```

### React Query + Zustand State Management

- Use React Query for server state (data fetching, caching, synchronization)
- Use Zustand for client state (UI toggles, selected filters, local preferences)
- Pattern in `apps/client-dashboard/src/hooks/` and `apps/admin-dashboard/src/hooks/`

### TypeScript Strict Mode

All apps use strict TypeScript. When editing:
- Avoid `any` types - use `unknown` or proper types from `packages/types` or generated Supabase types
- Prefer type guards over type assertions
- Check `tsconfig.json` in each app for project-specific compiler options

## Common Debugging Scenarios

### "500 Internal Server Error" on Tenant Operations
1. Check Supabase Edge Function logs in dashboard
2. Verify RLS policies aren't blocking the operation
3. Confirm `service_role` key is used for admin operations (not `anon` key)
4. See `docs/DEBUGGING_500_ERROR.md` for systematic troubleshooting

### Analytics Showing Zeros or Empty
1. Enable `VITE_ANALYTICS_DEBUG=true` in `.env.local`
2. Check Edge Function `widget-analytics` deployment status
3. Verify `auto_provisioning` table has valid tenant mapping for current user
4. Inspect network tab for Edge Function invocation errors
5. See `ANALYTICS_DEBUGGING_GUIDE.md`

### RLS Policy Preventing Data Access
1. Check user's `auto_provisioning.status` is `'completed'`
2. Verify `profiles.role` matches required permission level
3. Query `employees` table for role-based access grants
4. Use service role in SQL editor to bypass RLS for diagnosis:
   ```sql
   SELECT * FROM bookings WHERE tenant_id = '<uuid>';
   ```

### Vercel Deployment Failures
- **Issue**: "vite: command not found" or "Error: Command failed with 127"
  - **Cause**: Build dependencies not installed properly in monorepo context
  - **Fix**: Ensure `installCommand` in `vercel.json` does `cd apps/client-dashboard && npm install` (not `npm install --prefix`)
  - **Why**: The `--prefix` flag doesn't create proper PATH context for build tools like Vite

- **Issue**: Monorepo root directory confusion
  - **Fix**: Ensure `vercel.json` or project settings specify correct `apps/client-dashboard` or `apps/admin-dashboard` paths
  - **Verify**: Check Vercel build logs for "Error: Cannot find module" or path resolution errors

- **Issue**: Build succeeds locally but fails on Vercel
  - **Check**: Verify Node.js version in Vercel project settings matches `engines` in package.json (>=18.0.0)
  - **Check**: Ensure all environment variables are set in Vercel dashboard (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.)

## Testing

```powershell
# Run all tests
npm run test

# Run tests for specific app
npm run test --workspace=apps/client-dashboard

# Client dashboard has extensive test types
cd apps/client-dashboard
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e              # Playwright E2E tests
npm run test:coverage         # Coverage report
```

## Critical Files for Context

When debugging or extending features, reference these files:

- **Tenant isolation logic**: `supabase/migrations/*tenant*isolation*.sql`
- **Edge Function patterns**: `supabase/functions/manage-tenant-credentials/index.ts`, `supabase/functions/widget-analytics/index.ts`
- **Admin separation**: `ADMIN_TENANT_SEPARATION_COMPLETE.md`, `QUICK_REFERENCE_ADMIN_TENANT_SEPARATION.md`
- **Analytics architecture**: `apps/client-dashboard/src/widgets/management/useWidgetAnalytics.ts`
- **CORS handling**: `docs/cors-management.md`
- **Database schema overview**: `supabase/migrations/20250828052813_*.sql` (initial schema)

## Documentation Notes

The root directory contains extensive `.md` files documenting fixes, features, and troubleshooting. These are **historical context** - check timestamps in filenames and content. Recent files (Oct 2025) reflect current architecture. Use them to understand:
- Past bugs and their resolutions
- Feature implementation rationale
- Database migration history
- Production deployment lessons learned

When making changes:
- Update relevant `.md` docs if changing core architecture
- Add new troubleshooting docs for non-obvious fixes
- Update this file if introducing new patterns that deviate from existing conventions
