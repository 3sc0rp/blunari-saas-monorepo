# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Blunari SAAS is a comprehensive restaurant booking platform built as a monorepo with multiple applications and a modular architecture. The platform is **production-ready** and handles real restaurant bookings with multi-tenant support.

### Core Applications

1. **Admin Dashboard** (`apps/admin-dashboard/`) - Administrative interface for managing tenants, users, and platform operations
2. **Client Dashboard** (`apps/client-dashboard/`) - Restaurant owner interface for managing bookings, analytics, and operations
3. **Background Operations** (`apps/background-ops/`) - Node.js backend service handling APIs, WebSocket connections, and background tasks

## Common Development Commands

### Project Setup
```bash
# Install dependencies for all workspaces
npm install

# Setup environment secrets
npm run secrets:setup

# Initialize development environment
npm run setup
```

### Development Workflow
```bash
# Start all applications in parallel (recommended)
npm run start:dev

# Start individual applications
npm run dev:admin           # Admin dashboard only
npm run dev:client          # Client dashboard only
npm run dev:background-ops  # Backend service only
```

### Build & Testing
```bash
# Build all applications
npm run build

# Run all tests
npm run test

# Type checking across all workspaces
npm run type-check

# Lint and fix code issues
npm run lint
npm run lint:fix

# Format code
npm run format
```

### Production & Deployment
```bash
# Pre-deployment validation
npm run preflight
npm run validate:production

# Deploy Supabase functions
npm run deploy:functions

# Full deployment check
npm run deploy:check
npm run deploy:full

# Test production flow
npm run test:production-flow
```

### Database & Supabase Operations
```bash
# Start local Supabase
supabase start

# Apply database migrations
supabase db push

# Generate TypeScript types from database schema
supabase gen types typescript --local > types/database.ts

# Reset local database
supabase db reset
```

### Maintenance Commands
```bash
# Clean test data from production
npm run cleanup:auto
npm run cleanup:test-data

# Verify admin functionality
npm run verify:admin-live

# Monitor and diagnose
node scripts/diagnose-widget-analytics.mjs
```

## Architecture Overview

### Monorepo Structure
- **Turborepo** for build optimization and caching
- **TypeScript** throughout with strict type checking
- **Workspaces** pattern for shared dependencies
- **Modular architecture** with clear separation of concerns

### Key Technologies
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI, Zustand
- **Backend**: Node.js, Express, TypeScript, WebSocket
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Real-time**: WebSocket subscriptions for live updates
- **Testing**: Vitest, Jest, Playwright for E2E
- **Monitoring**: Sentry integration, structured logging

### Data Flow Architecture
```
Widget/Client → Client Dashboard → Background-ops API → Supabase Database
                     ↓
Admin Dashboard → Real-time notifications via WebSocket
```

## Key Components & Systems

### Widget Management System
Located in `apps/client-dashboard/src/components/widgets/`, this is a **world-class modular architecture** with:
- **6 specialized modules**: Configuration, Preview, Analytics, Real-time, Version Control, Deployment
- **Enterprise-grade infrastructure**: Logging, validation, performance monitoring, error handling
- **85% test coverage** with comprehensive testing framework

### Booking System
- **Multi-tenant** restaurant booking platform
- **Real-time** table management with WebSocket updates
- **Approval workflow** for pending reservations
- **Email notifications** for customers and restaurants
- **Row Level Security** for data isolation

### Command Center
Real-time operational dashboard with:
- Live floor plan visualization
- Booking management and approval
- Revenue and analytics tracking
- Table optimization algorithms

## Environment Configuration

### Development Environment
Required environment files:
- `apps/admin-dashboard/.env.local`
- `apps/client-dashboard/.env.local`
- `apps/background-ops/.env`

### Key Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://kbfbbkcaxhzlnbqxwgoz.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Application Environment
VITE_APP_ENV=development|production
VITE_ENABLE_MOCK_DATA=false

# Monitoring
VITE_SENTRY_DSN=<your-sentry-dsn>
```

## Testing Strategy

### Test Commands
```bash
# Client dashboard comprehensive testing
cd apps/client-dashboard
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:performance       # Performance benchmarks
npm run test:e2e              # End-to-end tests
npm run test:all              # Run complete test suite

# Background operations testing
cd apps/background-ops
npm test                      # Jest test suite
```

### Test Coverage
- **Widget System**: 39/46 tests passing (85% success rate)
- **Performance benchmarks**: All enterprise standards met
- **Accessibility**: WCAG 2.1 AA compliance
- **E2E testing**: Critical user journeys covered

## Database and Migrations

Supabase configuration lives in `supabase/config.toml`. Use the following commands during development:

```bash
# Create new migration
supabase migration new <name>

# Apply migrations
supabase db push

# Reset with fresh migrations
supabase db reset
```

## Production Readiness

### Current Status
✅ **PRODUCTION READY** - System is actively handling real customer bookings

### Key Production Features
- **Zero test data pollution** - All test data automatically cleaned
- **Real-time synchronization** - Live updates across all interfaces
- **Email notification system** - Automated customer and admin notifications
- **Performance optimized** - Sub-1000ms API response times
- **Security hardened** - RLS policies, HTTPS enforcement, API key protection

### Monitoring & Health Checks
- API response time monitoring
- Database query optimization
- Real-time WebSocket health
- Email delivery tracking
- Error aggregation via Sentry

## Security Considerations

### Authentication & Authorization
- Supabase Auth for user management
- Row Level Security (RLS) policies for data isolation
- API key authentication for external services
- Role-based access control (RBAC)

### Data Protection
- HTTPS enforcement everywhere
- Input validation and sanitization
- SQL injection protection via parameterized queries
- CORS properly configured for production

## Performance Optimization

### Frontend Performance
- **Vite** for fast development builds
- **Code splitting** and lazy loading
- **Virtual scrolling** for large data sets
- **Optimized re-renders** with React.memo and useMemo

### Backend Performance
- **Connection pooling** for database efficiency
- **Caching strategies** for frequently accessed data
- **Background job processing** for heavy operations
- **Rate limiting** to prevent abuse

## Troubleshooting

### Common Issues
1. **Port conflicts**: Use `npx kill-port 3000 3001 3002` to free ports
2. **Database connection**: Verify Supabase is running with `supabase status`
3. **WebSocket failures**: Check CORS settings and firewall configuration

### Debugging Tools
- Browser DevTools for frontend debugging
- VS Code debugger configuration available
- Supabase logs for database queries
- Structured logging for application events

## API Integration

### Key Endpoints
- `/api/v1/tenants` - Tenant management
- `/api/v1/bookings` - Reservation operations
- `/api/v1/tables` - Table management
- `/api/v1/analytics` - Usage metrics

### WebSocket Events
- `booking:created` - New reservation
- `booking:updated` - Status changes
- `table:updated` - Availability changes
- `notification:new` - System alerts

## Widget Embedding

### Embed Code Generation
Widgets are generated with customizable configuration and can be embedded on external websites:
```html
<script src="https://your-domain.com/widget.js"></script>
<div id="blunari-booking-widget" data-tenant="demo"></div>
```

### Customization Options
- Theme and color customization
- Device-specific responsive behavior
- Feature toggles (deposits, special requests, etc.)
- Custom CSS injection for advanced styling

---

*This documentation reflects a production-ready system with real customer bookings and comprehensive enterprise architecture. The codebase is optimized for scalability, maintainability, and operational excellence.*