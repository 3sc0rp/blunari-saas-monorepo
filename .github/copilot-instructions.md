# Blunari SAAS - AI Agent Instructions

## Quick Reference: Common Workflows

### Deploy to Production
```powershell
# Test locally first
npm run dev:client  # or npm run dev:admin

# Commit and push (triggers Vercel auto-deploy)
git add .
git commit -m "feat: your changes"
git push origin master

# Monitor: https://vercel.com/deewav3s-projects/client-dashboard/deployments
```

### Supabase Edge Function Deployment
```powershell
cd supabase/functions/<function-name>
supabase functions deploy <function-name>
```

### Database Migration
```powershell
supabase db push
```

### Generate TypeScript Types from DB
```powershell
cd apps/client-dashboard
npx supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts
```

---

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

#### Client Dashboard (Vercel) - **ALWAYS USE GIT PUSH**
**CRITICAL WORKFLOW**: This project uses **automatic deployment via GitHub integration**. Never use `vercel` CLI directly.

**Standard Deployment Process**:
```powershell
# 1. Make your changes to client-dashboard code
# 2. Test locally
npm run dev:client

# 3. Commit and push to GitHub (triggers automatic deployment)
git add .
git commit -m "feat: your feature description"
git push origin master

# 4. Vercel will automatically:
#    - Detect the push to master branch
#    - Pull the latest code
#    - Run install command
#    - Run build command
#    - Deploy to production (app.blunari.ai)
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "cd apps/client-dashboard && npm run build",
  "outputDirectory": "apps/client-dashboard/dist",
  "installCommand": "cd apps/client-dashboard && npm install"
}
```

**IMPORTANT**: The `apps/client-dashboard/vercel.json` should have:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```
- App-level config takes precedence over root config
- DO NOT include `npm install` in buildCommand (runs automatically via installCommand)
- App-level config only needs relative paths since Vercel is already in that directory

**Key Points**:
- `installCommand` must `cd` into app directory (not `npm install --prefix`)
- Build dependencies (`vite`, `typescript`) are in `devDependencies` and get installed
- Automatic deployment typically takes 2-4 minutes
- Check deployment status at: https://vercel.com/deewav3s-projects/client-dashboard/deployments

**Why Git Push Over CLI?**:
- Maintains deployment history tied to commits
- Enables automatic rollbacks if needed
- Prevents environment variable mismatches
- Team members can track what was deployed when

#### Admin Dashboard (Vercel)
**Same automatic deployment pattern** as client-dashboard. Push to GitHub master branch to deploy.

```powershell
# Deploy admin dashboard changes
git add .
git commit -m "fix: your admin dashboard changes"
git push origin master
```

Check admin dashboard Vercel project for deployment status.

#### Background-Ops (Fly.io)
```powershell
cd apps/background-ops
fly deploy
```

## Code Patterns & Conventions

### Catering Widget Architecture (Phase 3 - October 2025)

**Context**: The catering widget underwent major refactoring from a 1,320-line monolithic component to a modular architecture.

**Current Structure** (`apps/client-dashboard/src/components/catering/`):
- `CateringWidget.tsx` (291 lines) - Main wrapper, handles routing/loading/errors
- `CateringContext.tsx` (304 lines) - State management with React Context
- `PackageSelection.tsx` (338 lines) - Package grid with animations
- `CustomizeOrder.tsx` (398 lines) - Event details form with validation
- `ContactDetails.tsx` (454 lines) - Contact form with submission logic
- `OrderConfirmation.tsx` (425 lines) - Success screen with animations

**Key Patterns**:
- **Context API**: All state managed by `CateringProvider`, no prop drilling
- **Component Isolation**: Each step is self-contained and independently testable
- **Auto-save**: Form data auto-saves to localStorage with 2-second debounce
- **Draft Recovery**: Prompts user to restore unsaved drafts on reload
- **Server-side Analytics**: Tracks events to `analytics_events` table via Edge Function
- **Type Safety**: All components fully typed with zero TypeScript errors

**When Working on Catering**:
- Use `useCateringContext()` hook to access/update state
- All components expect to be wrapped in `<CateringProvider>`
- Auto-save is automatic - don't manually save form data
- Analytics tracking is built-in - events fire automatically
- See `COMPONENT_REFACTORING_COMPLETE.md` for detailed architecture guide

### Analytics: Real Data Only Policy

**Context**: See `apps/client-dashboard/README.md` section "Real Data Only Policy"

Client dashboard intentionally **NEVER** fabricates or simulates analytics data. If Edge Functions or DB queries fail, components render **empty states** or **explicit errors**, never synthetic placeholders.

- Debug logging gated behind `VITE_ANALYTICS_DEBUG=true` flag
- Tests assert absence of mock/demo/placeholder strings in analytics payloads
- Fallback chain: Edge Function → Direct DB query → Empty state (never synthetic data)
- **Server-side tracking**: Catering widget now tracks events to `analytics_events` table

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
  - **Cause**: Vercel auto-detecting Turborepo and running `turbo run build` with wrong module resolution
  - **Immediate Fix**: Use `vercel-build.sh` script (current setup) - bypasses Turbo detection
  - **Proper Fix**: Set **Root Directory** to `apps/client-dashboard` in Vercel Dashboard → Settings → General
  - **Why Root Directory Works**: Vercel starts in app directory, doesn't see monorepo `turbo.json`, builds cleanly

- **Issue**: "Cannot find package 'vite'" during build
  - **Cause**: npm install not including devDependencies or running in wrong directory
  - **Fix**: Script now uses `npm ci --include=dev` and `npx --yes vite build`
  - **Verify**: Check build logs for "Vite binary found" confirmation

- **Issue**: App-level vercel.json conflicts with root vercel.json
  - **Current Setup**: Root `vercel.json` uses `bash vercel-build.sh` as buildCommand
  - **Best Practice**: Set Root Directory in Vercel, then use only app-level config
  - **Verify**: Check both `vercel.json` (root) and `apps/client-dashboard/vercel.json`

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

### Core Architecture
- **Tenant isolation logic**: `supabase/migrations/*tenant*isolation*.sql`
- **Edge Function patterns**: `supabase/functions/manage-tenant-credentials/index.ts`, `supabase/functions/widget-analytics/index.ts`, `supabase/functions/track-catering-analytics/index.ts`
- **Admin separation**: `ADMIN_TENANT_SEPARATION_COMPLETE.md`, `QUICK_REFERENCE_ADMIN_TENANT_SEPARATION.md`
- **Database schema overview**: `supabase/migrations/20250828052813_*.sql` (initial schema)

### Catering Widget (Phase 3 - October 2025)
- **Architecture Guide**: `COMPONENT_REFACTORING_COMPLETE.md` (426 lines)
- **Integration Summary**: `PHASE3_INTEGRATION_COMPLETE.md` (complete metrics)
- **Continuation Guide**: `CONTINUATION_PROMPT_PHASE3_COMPLETE.md` (testing instructions)
- **Component Files**: `apps/client-dashboard/src/components/catering/` (6 files, 2,210 lines)
- **Server Analytics**: `supabase/migrations/20251019_add_analytics_events_table.sql`
- **Tenant Contact Fields**: `supabase/migrations/20251019_add_tenant_contact_fields.sql`

### Analytics & Widgets
- **Widget Analytics**: `apps/client-dashboard/src/widgets/management/useWidgetAnalytics.ts`
- **Catering Analytics**: `apps/client-dashboard/src/utils/catering-analytics.ts`
- **Server-side Tracking**: `supabase/functions/track-catering-analytics/index.ts`
- **Analytics Debugging**: `ANALYTICS_DEBUGGING_GUIDE.md`

### Infrastructure
- **CORS handling**: `docs/cors-management.md`
- **Vercel deployment**: Root & app-level `vercel.json` files
- **Supabase config**: `supabase/config.toml`

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
