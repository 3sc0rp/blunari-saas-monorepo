# Blunari SAAS Monorepo

Welcome to the Blunari SAAS platform monorepo. This repository contains all applications and shared packages for the Blunari SAAS ecosystem.

## 📁 Project Structure

```
blunari-saas/
├── apps/                          # Applications
│   ├── background-ops/            # Backend API service
│   ├── admin-dashboard/           # Admin interface
│   └── client-dashboard/          # Client interface
├── packages/                      # Shared packages
│   ├── types/                     # Shared TypeScript types
│   ├── utils/                     # Shared utilities
│   ├── config/                    # Shared configuration
│   └── ui/                        # Shared UI components (to be added)
├── tools/                         # Build tools and scripts
└── docs/                          # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL (for background-ops)

### Installation

```bash
# Install dependencies for all packages
npm install
npm run dev
```

npm run dev:background-ops

# Start only admin dashboard
```

## 📋 Applications

### Background-ops API

- **Location**: `apps/background-ops/`
- **Tech Stack**: Node.js, TypeScript, Express, PostgreSQL
- **Purpose**: Backend API for job processing, scheduling, and system monitoring
- **Port**: 3000 (development)
- **Production**: https://services.blunari.ai

### Admin Dashboard

- **Location**: `apps/admin-dashboard/`
- **Tech Stack**: TBD (React/Next.js recommended)
- **Purpose**: Administrative interface for system management
- **Port**: 3001 (development)

### Client Dashboard

- **Location**: `apps/client-dashboard/`
- **Tech Stack**: TBD (React/Next.js recommended)
- **Purpose**: Client-facing interface
- **Port**: 3002 (development)

## 📦 Shared Packages

### @blunari/types

Shared TypeScript types and interfaces used across all applications.

### @blunari/utils

Common utility functions, date formatting, validation helpers, etc.

### @blunari/config

Shared configuration values, API endpoints, constants, and feature flags.

### @blunari/ui (planned)

Shared React components and design system.

## 🛠️ Development Workflow

### Adding New Dependencies

```bash
# Add to specific app
npm install package-name --workspace=apps/admin-dashboard

# Add to shared package
npm install package-name --workspace=packages/utils

# Add dev dependency to root
npm install -D package-name
```

### Building Packages

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=packages/types
```

### Type Checking

```bash
# Type check all packages
npm run type-check


## 🚢 Deployment

### Background-ops API

Currently deployed to Fly.io:


### Frontend Applications

Deployment configuration TBD (recommended: Vercel/Netlify)

## 🔧 Configuration

### Environment Variables

Each app manages its own environment variables:


### Shared Configuration

Common configuration is managed in `packages/config/src/index.ts`

## 📊 Monitoring & Observability

- **API Health**: https://services.blunari.ai/health
- **System Metrics**: Available via `/api/v1/metrics` endpoint
- **Real-time Updates**: WebSocket support at wss://services.blunari.ai
- **Alerts**: Configurable thresholds for system monitoring

## 🤝 Contributing

1. Make changes in feature branches
2. Ensure all tests pass: `npm run test`
3. Type check: `npm run type-check`

- [API Documentation](./docs/api.md) - Background-ops API reference
- [Development Guide](./docs/development.md) - Detailed development setup
| Command              | Description                        |
| `npm run dev`        | Start all apps in development mode |
| `npm run build`      | Build all packages and apps        |
| `npm run lint`       | Lint all code                      |
| `npm run test`       | Run all tests                      |
| `npm run type-check` | Type check all TypeScript          |
| `npm run clean`      | Clean all build artifacts          |
| `npm run format`     | Format code with Prettier          |

## 🏗️ Architecture

- **TypeScript** for type safety across all packages
- **Shared packages** for common functionality
- **Workspace** configuration for efficient dependency management

## 🔐 Security

- API authentication via API keys
- Environment variable management per application
- Audit logging for administrative actions
- Rate limiting and security headers

---

For detailed setup instructions and troubleshooting, see the individual app README files.

## ✅ Real Data Only Policy

All application dashboards and pages have been purged of mock / fabricated datasets. Any UI sections that previously displayed synthetic values now render empty states until real backend data is integrated. This ensures product decisions, QA, and stakeholder reviews are never influenced by artificial numbers.

### Scope Covered
- Widget analytics & versions
- Inventory, Staff, Waitlist, Kitchen Display
- Reservations & Table Optimization
- Financial Reporting & Advanced Analytics
- AI Business Insights (insights, predictions, alerts, models)
- Performance Optimization (metrics, recommendations, benchmarks, automation)
- Mobile App Center (no pre-seeded demo apps)

### Implementation Pattern
- Replaced `mock*` constants with `initial*` empty baselines (arrays/zeroed objects)
- Added `TODO(<area>-api)` comments where backend integration hooks are expected
- Guarded calculations (division by zero, averages) and replaced synthetic fallbacks with neutral values (0 / empty lists)
- Introduced a shared `EmptyState` component for consistent UX messaging

### Rationale
Using mock numbers in production-facing UI creates risk of:
- Misinterpreted metrics during demos or validation
- Accidental reliance on inflated baselines when implementing alerts/thresholds
- Test flakiness if synthetic assumptions drift from schema reality

### Next Steps (Backend)
Integrations expected to hydrate the empty baselines:
- Supabase / Edge Functions for operational metrics & analytics
- AI service endpoints for insights, anomaly detection, forecasting
- Streaming/realtime channels for live metrics (where noted by TODOs)

Until those are wired, empty states are intentional and signal integration priority rather than failure.

## ⚡ Widget Embedding Quickstart

Production-ready public widget bundle ships via the standalone multi-entry build at `/public-widget`.

### Booking Widget (Simple Iframe)
```html
<iframe
	src="https://app.yourdomain.com/public-widget/book/your-restaurant-slug?token=YOUR_SIGNED_TOKEN&embed=1"
	title="Reserve a Table"
	loading="lazy"
	sandbox="allow-scripts allow-forms allow-popups"
	referrerpolicy="strict-origin-when-cross-origin"
	style="width:100%;max-width:420px;height:620px;border:0;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.08);"
></iframe>
```

### Advanced Script Loader (Progressive)
```html
<div id="blunari-booking" style="min-height:620px"></div>
<script>
!function(){var c=document.getElementById('blunari-booking');if(!c)return;var f=document.createElement('iframe');f.src='https://app.yourdomain.com/public-widget/book/your-restaurant-slug?token=YOUR_SIGNED_TOKEN&embed=1';f.loading='lazy';f.referrerPolicy='strict-origin-when-cross-origin';f.sandbox='allow-scripts allow-forms allow-popups';f.style.cssText='width:100%;height:100%;border:0;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.08);background:#fff';c.appendChild(f);}();
</script>
```

### Security Notes
- No `allow-same-origin` in sandbox (prevents DOM escape).
- Use a short-lived signed token (do not expose tenant secrets).
- Apply a CSP on your host page restricting script-src to trusted origins.

### Optional CSP Snippet
```
Content-Security-Policy: default-src 'none'; frame-src https://app.yourdomain.com; img-src https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src https://api.yourdomain.com https://<supabase-project>.supabase.co; frame-ancestors *; base-uri 'none';
```

See `docs/embedding-security.md` for in-depth guidance (SRI, async patterns, origin validation, hardening checklist).

