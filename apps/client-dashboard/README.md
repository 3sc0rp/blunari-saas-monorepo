# Welcome to your Blunari project

## Project info

**Application**: Blunari Tenant Dashboard - Restaurant Management System

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Deploy this project using your preferred hosting platform (Vercel, Netlify, AWS, etc.).

```sh
# Build the project
npm run build

# The dist/ folder contains the production build
```

## Custom Domain Setup

Configure your custom domain through your hosting provider's dashboard.

## Real Data Only Policy

This dashboard intentionally does not fabricate, simulate, or backfill analytics or operational data. If real data is unavailable (e.g. Edge Function + DB failure), components render empty states or explicit error messages rather than synthetic placeholders.

Key guarantees:

- No preview/demo analytics mode.
- No randomly generated metrics in widgets.
- Fallback chain: Edge Function → Direct DB query → Empty state (never synthetic).
- Tests assert absence of placeholder strings like `mock`, `demo`, `sample`, `placeholder` in analytics payloads.

## Analytics Debug Logging

Verbose analytics lifecycle logs are gated behind an opt-in environment flag to avoid noisy consoles and accidental exposure of correlation IDs in production.

Enable in development:

```bash
VITE_ANALYTICS_DEBUG=true npm run dev
```

Or create a `.env.local` file in `apps/client-dashboard`:

```
VITE_ANALYTICS_DEBUG=true
```

What it does:

- Emits detailed fetch phases (cache hits, rate limiting, Edge vs DB fallback, retries).
- Logs correlation IDs to trace multi-attempt sequences.
- Suppressed entirely when `VITE_ANALYTICS_DEBUG` is not explicitly `true` (case-insensitive).

Production guidance:

- Do NOT enable in production – leave flag unset for minimal console output.
- Security: Debug logs may include tenant identifiers and timing metadata (never secrets), so keep flag off in shared staging environments unless diagnosing issues.

Associated files:

- `src/widgets/management/useWidgetAnalytics.ts` – wraps debug output in `debug()` / `debugWarn()` helpers.
- `analytics/__tests__/useWidgetAnalytics.test.ts` – contains guard test ensuring no synthetic placeholder strings.

## Troubleshooting Analytics

If analytics return empty values:

1. Confirm Edge Function deployment: `supabase/functions/widget-analytics` exists and responds.
2. Check network tab for the `widget-analytics` invocation status.
3. Temporarily enable `VITE_ANALYTICS_DEBUG` to inspect decision path (cache, edge retries, DB fallback).
4. Verify tenant ID format (UUID) to avoid forced direct-DB fallback in demo/test heuristics.
5. Inspect Supabase logs for function or DB errors.

If both Edge + DB fail, the UI will surface an error message and no data (by design – no fabrication). Fix upstream issues instead of bypassing the policy.
