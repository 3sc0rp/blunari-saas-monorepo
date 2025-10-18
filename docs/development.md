# Development Guide

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd blunari-saas
npm install
```

### 2. Database Setup (Background-ops)

```bash
# Install PostgreSQL
# Create database
createdb blunari_dev

# Set environment variables in apps/background-ops/.env
DATABASE_URL=postgresql://username:password@localhost:5432/blunari_dev
```

### 3. Environment Configuration

#### apps/background-ops/.env

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/blunari_dev
WEBSOCKET_PORT=3001
LOG_LEVEL=debug
API_KEYS=dev-key-1,dev-key-2
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

#### apps/admin-dashboard/.env.local

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_ENV=development
```

#### apps/client-dashboard/.env.local

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_ENV=development
```

### 4. Start Development

```bash
# Install all dependencies
npm install

# Build shared packages
npm run build:packages

# Start all apps
npm run dev

# Or start individually
npm run dev:background-ops
npm run dev:admin
npm run dev:client
```

## Development Workflow

### Working with Shared Packages

When modifying shared packages, you'll need to rebuild them:

```bash
# After modifying packages/types
npm run build --workspace=packages/types

# After modifying packages/utils
npm run build --workspace=packages/utils

# After modifying packages/config
npm run build --workspace=packages/config
```

For active development, use watch mode:

```bash
# Watch and rebuild packages on changes
npm run dev:packages
```

### Adding New Features

1. **New Shared Type**

   ```bash
   # Edit packages/types/src/index.ts
   # Add new interface/type
   # Rebuild types package
   npm run build --workspace=packages/types
   ```

2. **New Utility Function**

   ```bash
   # Edit packages/utils/src/index.ts
   # Add new function with tests
   # Rebuild utils package
   npm run build --workspace=packages/utils
   ```

3. **New API Endpoint (Background-ops)**
   ```bash
   # Add route in apps/background-ops/src/routes/
   # Add service in apps/background-ops/src/services/
   # Update shared types if needed
   ```

### Testing

```bash
# Run all tests
npm run test

# Test specific package
npm run test --workspace=packages/utils

# Test specific app
npm run test --workspace=apps/background-ops

# Watch mode
npm run test:watch
```

### Type Checking

```bash
# Check all TypeScript
npm run type-check

# Check specific workspace
npm run type-check --workspace=apps/admin-dashboard
```

### Linting and Formatting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format all code
npm run format

# Check formatting
npm run format:check
```

## Debugging

### VS Code Setup

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Background-ops",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/background-ops/dist/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/apps/background-ops/dist/**/*.js"]
    }
  ]
}
```

### Database Debugging

```bash
# Connect to development database
psql $DATABASE_URL

# View logs
tail -f apps/background-ops/logs/app.log

# Monitor WebSocket connections
# Check browser dev tools Network tab
```

### API Testing

```bash
# Test API endpoints
curl -H "x-api-key: dev-key-1" http://localhost:3000/api/v1/health

# Test WebSocket
# Use browser dev tools or WebSocket clients
```

## Common Issues

### 1. Port Conflicts

If ports 3000-3002 are in use:

```bash
# Kill processes using ports
npx kill-port 3000 3001 3002

# Or modify port in package.json scripts
```

### 2. TypeScript Path Resolution

If imports from shared packages fail:

```bash
# Rebuild packages
npm run build:packages

# Check tsconfig.json paths configuration
```

### 3. Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep blunari

# Reset database
dropdb blunari_dev
createdb blunari_dev
```

### 4. WebSocket Connection Failed

```bash
# Check WebSocket server is running
netstat -an | grep 3001

# Verify CORS settings in websocket.ts
```

## Performance Optimization

### Build Performance

```bash
# Use Turborepo caching
npm run build --cache-dir=.turbo

# Parallel builds
npm run build --parallel

# Skip unchanged packages
npm run build --filter=...changed
```

### Development Performance

```bash
# Start only needed apps
npm run dev:background-ops

# Use TypeScript incremental compilation
# Enabled in tsconfig.json with "incremental": true
```

## IDE Configuration

### VS Code Extensions

- TypeScript Hero
- ESLint
- Prettier
- GitLens
- Thunder Client (API testing)

### Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```
