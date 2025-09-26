# Client Dashboard Security & Tenant Hardening

This document summarizes the enforced guardrails ensuring no mock/demo data or insecure patterns leak into production.

## Policies
- No demo/test fallback logic for tenant or analytics resolution.
- Widget tokens require `VITE_ENABLE_WIDGET_TOKENS=true` and server Edge Function; local signing only in dev.
- Embed code sandbox excludes `allow-same-origin`.
- Direct DB analytics fallback only when `VITE_ALLOW_ANALYTICS_DB_FALLBACK=true` (or non-UUID legacy id) and never fabricates synthetic stats.

## Lint / Static Checks
- `npm run lint:tenant` – Applies `.eslintrc.tenant-hardening.cjs` disallowing literals: demo, placeholder, sample, owner@example.com, dev-jwt-secret.
- `npm run lint:client-strict` – Adds stricter TypeScript and console restrictions.
- GitHub Action `tenant-hardening.yml` runs on PR & master push.

## Runtime Guards
- `tokenUtils.createWidgetToken` throws if feature disabled or executed in production fallback path.
- `assertTenantScoped` can be used near any Supabase query to enforce tenant scoping during development.
- `TenantDiagnosticsPanel` surfaces tenant resolution state (DEV only).

## Environment Flags
| Flag | Purpose | Default |
|------|---------|---------|
| `VITE_ENABLE_WIDGET_TOKENS` | Enable widget token generation | false/undefined (disabled) |
| `VITE_ALLOW_ANALYTICS_DB_FALLBACK` | Allow DB fallback if edge fails | false |
| `TENANT_HARDEN` | Turn on extra restricted literals in base ESLint config | unset |

## Testing Enhancements
- `tokenUtils.test.ts` validates feature flag & prod hardening.
- `embedCode.test.ts` asserts sandbox security.
- `useTenant.provisionAbort.test.tsx` checks debounce/race safety.
- `analytics.rateLimit.test.ts` exercises rate limiting path.

## Future Ideas
- Add Cypress/Playwright policy tests ensuring sandbox attribute on deployed pages.
- Instrument metrics for tenant resolution latency.
- Enforce `RLS-OK` comment tag near all `.from('tenants')` or `.from('bookings')` calls.

---
Maintainers: Update this file whenever a new guardrail or flag is introduced.
