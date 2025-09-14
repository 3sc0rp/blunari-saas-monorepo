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
