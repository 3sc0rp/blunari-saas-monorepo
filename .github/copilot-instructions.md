# Blunari SAAS - AI Agent Instructions

## Quick Reference: Common Workflows

### Deploy to Production
```zsh
# Test locally first
npm run dev:client  # or npm run dev:admin

# Commit and push (triggers Vercel auto-deploy)
git add .
git commit -m "feat: your changes"
git push origin master

# Monitor: https://vercel.com/deewav3s-projects/client-dashboard/deployments
```

### Environment Setup & Validation
```zsh
# Setup development environment
cd apps/client-dashboard
cp .env.example .env
# Edit .env with your values

# Production scripts for validation & deployment
npm run preflight           # Pre-deployment checks
npm run verify:admin-live   # Test admin dashboard login
npm run deploy:check        # Validate production readiness
npm run test:production-flow # End-to-end production test
```

### Supabase Edge Function Deployment
```zsh
cd supabase/functions/<function-name>
supabase functions deploy <function-name>
```

### Database Migration
```zsh
supabase db push
```

### Generate TypeScript Types from DB
```zsh
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

### Environment Variable Validation Pattern

**CRITICAL**: All apps use runtime environment validation with Zod schemas at startup.

```typescript
// Pattern: apps/{app}/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // ... other env vars
});

export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  // ... etc
});
```

**Key Points**:
- Environment variables MUST be prefixed with `VITE_` for frontend apps
- Validation happens at startup - app won't start with missing/invalid env vars
- Use helper functions like `isDevelopment()`, `isProduction()` from env config
- Never hardcode env values - always reference through validated env object

### Production & Development Feature Gating

**Pattern**: All debug features, routes, and logging are gated behind environment checks:

```typescript
// Debug routes (like /test-widget) - only in development
if (import.meta.env.DEV) {
  // Development-only routes/features
}

// Console logging - only in development
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}

// Production vs development behavior
if (env.VITE_APP_ENV === 'production') {
  // Production-only features (Sentry, analytics)
}
```

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

### Vercel Environment Variables Missing
- **Issue**: `import.meta.env.VITE_XXX` returns `undefined` in production
- **Cause**: Environment variables not set in Vercel dashboard or missing `VITE_` prefix
- **Fix**: 
  1. Go to Vercel project → Settings → Environment Variables
  2. Add variables with `VITE_` prefix for frontend apps
  3. Set correct environment (Production/Preview/Development)
  4. Redeploy after adding variables
- **Required Variables**: See `VERCEL_ENV_SETUP_GUIDE.md` for complete list

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

```zsh
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

## Scripts & Automation

The project includes extensive automation scripts in the `scripts/` directory:

```zsh
# Production validation & deployment
npm run preflight              # Pre-deployment checks
npm run deploy:check           # Validate production readiness
npm run test:production-flow   # End-to-end production test
npm run verify:admin-live      # Test live admin dashboard login

# Database & tenant management
npm run cleanup:auto           # Auto cleanup test data
npm run cleanup:test-data      # Manual cleanup bookings
node scripts/create-missing-provisioning.mjs  # Fix provisioning issues

# Edge Function testing
node scripts/test-widget-analytics.js        # Test widget analytics
node scripts/test-complete-booking-flow.mjs  # End-to-end booking test
node scripts/sync-cors.js                    # Sync CORS settings
```

## Critical Files for Context

When debugging or extending features, reference these files:

- **Tenant isolation logic**: `supabase/migrations/*tenant*isolation*.sql`
- **Edge Function patterns**: `supabase/functions/manage-tenant-credentials/index.ts`, `supabase/functions/widget-analytics/index.ts`
- **Admin separation**: `ADMIN_TENANT_SEPARATION_COMPLETE.md`, `QUICK_REFERENCE_ADMIN_TENANT_SEPARATION.md`
- **Analytics architecture**: `apps/client-dashboard/src/widgets/management/useWidgetAnalytics.ts`
- **CORS handling**: `docs/cors-management.md`
- **Database schema overview**: `supabase/migrations/20250828052813_*.sql` (initial schema)
- **Catering widget**: `apps/client-dashboard/src/components/catering/CateringWidget.tsx`
  - **Pricing issue fix**: `CATERING_PRICING_MODEL_FIX.md` (multi-pricing model support)
  - **Production readiness**: `CATERING_PRODUCTION_READINESS.md` (15 critical issues checklist)
  - **Quick start**: `CATERING_ACTION_REQUIRED.md` (implementation summary)

## Important Feature: Catering Widget

**Location**: `apps/client-dashboard/src/components/catering/CateringWidget.tsx`

### Known Critical Issue: Pricing Model Limitation
**Status**: Solution ready, awaiting implementation  
**Files**: `CATERING_PRICING_MODEL_FIX.md`, `supabase/migrations/20251017000000_add_package_pricing_types.sql`

**Problem**: Widget only supports per-person pricing. Packages priced as flat-rate (e.g., tray serving 10-15 people for $150 total) are incorrectly displayed as "$150/person".

**Solution Created**:
- Database migration adds `pricing_type` enum (per_person | flat_rate | per_tray | per_package)
- Adds `serves_count` field for flat-rate packages
- Updates pricing calculation and display logic
- Backward compatible with existing packages

**When working on catering features**:
1. Check if pricing model migration has been deployed
2. If not deployed, be aware calculations assume per-person pricing
3. Reference `CATERING_PRICING_MODEL_FIX.md` for proper pricing logic
4. Test with multiple pricing types if migration is deployed

### Production Readiness Status
The catering widget has **15 identified issues** requiring fixes before production:
- 🔴 **5 Critical (P0)**: Security (XSS), accessibility (WCAG), pricing model, validation
- 🟡 **7 High (P1)**: Mobile UX, performance, error handling, analytics
- 🟢 **3 Medium (P2)**: TypeScript strict mode, unit tests, documentation

See `CATERING_PRODUCTION_READINESS.md` for complete checklist and implementation timeline.

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
