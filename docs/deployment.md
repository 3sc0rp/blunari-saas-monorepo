# Deployment Guide

## Overview

This guide covers deployment strategies for all applications in the Blunari SAAS monorepo.

## Background-ops API (Production Ready)

### Fly.io Deployment (Current)

The background-ops API is currently configured for Fly.io deployment.

#### Prerequisites

```bash
# Install Fly CLI
# Windows
iwr https://fly.io/install.ps1 -useb | iex

# Login to Fly
fly auth login
```

#### Deployment Process

```bash
cd apps/background-ops

# Deploy to production
fly deploy

# Check status
fly status

# View logs
fly logs

# Scale application
fly scale count 2
```

#### Environment Variables

```bash
# Set production environment variables (align with apps/background-ops/src/config.ts)
fly secrets set NODE_ENV=production
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set X_API_KEY="your-32-char-min-secret"
fly secrets set JWT_SECRET="your-32-char-min-secret"
fly secrets set SIGNING_SECRET="your-32-char-min-secret"
fly secrets set ALLOWED_ORIGINS="https://admin.blunari.ai,https://client.blunari.ai"
fly secrets set LOG_LEVEL=info
fly secrets set RATE_LIMIT_WINDOW_MS=900000
fly secrets set RATE_LIMIT_MAX_REQUESTS=1000
```

#### Production URLs

- API Base: https://services.blunari.ai
- Health Check: https://services.blunari.ai/health
- WebSocket: wss://services.blunari.ai

### Alternative: Docker Deployment

#### Build Docker Image

```bash
cd apps/background-ops

# Build production image
docker build -t blunari/background-ops:latest .

# Run locally
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e API_KEYS="prod-key-1" \
  blunari/background-ops:latest
```

#### Deploy to Cloud Provider

```bash
# Push to registry
docker tag blunari/background-ops:latest your-registry/blunari/background-ops:latest
docker push your-registry/blunari/background-ops:latest

# Deploy to Kubernetes/ECS/etc
kubectl apply -f k8s-deployment.yaml
```

## Frontend Applications

### Admin Dashboard

#### Recommended: Vercel Deployment

```bash
cd apps/admin-dashboard

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://services.blunari.ai/api/v1
# NEXT_PUBLIC_WS_URL=wss://services.blunari.ai
```

#### Alternative: Netlify

```bash
# Build for production
npm run build

# Deploy to Netlify
# Upload dist/ folder via Netlify dashboard
# Or use Netlify CLI
npx netlify deploy --prod --dir=dist
```

### Client Dashboard

Same deployment process as Admin Dashboard:

```bash
cd apps/client-dashboard

# Vercel
vercel --prod

# Or Netlify
npm run build
npx netlify deploy --prod --dir=dist
```

## Database Setup

### Production PostgreSQL

#### Recommended: Supabase

```bash
# Create project at https://supabase.com
# Get connection string
# Set DATABASE_URL in Fly secrets
fly secrets set DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
```

#### Alternative: AWS RDS

```bash
# Create PostgreSQL RDS instance
# Configure security groups
# Set DATABASE_URL
fly secrets set DATABASE_URL="postgresql://username:password@host:5432/database"
```

#### Alternative: Self-hosted

```bash
# Install PostgreSQL on server
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb blunari_prod
sudo -u postgres createuser -P blunari

# Configure pg_hba.conf and postgresql.conf
sudo systemctl restart postgresql
```

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm run type-check

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'apps/background-ops')
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: ./apps/background-ops
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-admin:
    needs: test
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'apps/admin-dashboard')
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build --workspace=apps/admin-dashboard
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./apps/admin-dashboard

  deploy-client:
    needs: test
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'apps/client-dashboard')
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build --workspace=apps/client-dashboard
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          working-directory: ./apps/client-dashboard
```

## Environment Configuration

### Production Environment Variables

#### Background-ops API

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...
WEBSOCKET_PORT=8081
LOG_LEVEL=info
API_KEYS=prod-key-1,prod-key-2,admin-key
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
CORS_ORIGINS=https://admin.blunari.ai,https://client.blunari.ai
```

#### Admin Dashboard (Vite SPA)

```bash
# Vite envs must be prefixed with VITE_
# Background Ops
VITE_BACKGROUND_OPS_URL=https://services.blunari.ai
VITE_BACKGROUND_OPS_API_KEY=your-api-key
VITE_BACKGROUND_OPS_SIGNING_SECRET=your-signing-secret

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Client Dashboard (Vite SPA)

```bash
# Vite envs must be prefixed with VITE_
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Monitoring & Observability

### Application Monitoring

#### Fly.io Metrics (Background-ops)

```bash
# View metrics
fly dashboard

# Check logs
fly logs -a blunari-background-ops

# Monitor performance
fly metrics
```

#### Custom Monitoring

- Health checks: `/health` endpoint
- Metrics endpoint: `/api/v1/metrics`
- WebSocket status monitoring
- Database connection monitoring

### Alerting

#### Uptime Monitoring

Configure services like:

- UptimeRobot
- Pingdom
- StatusPage

#### Log Aggregation

```bash
# Forward logs to external service
# Configure in apps/background-ops/src/utils/logger.ts
```

## Security

### SSL/TLS

- Fly.io provides automatic SSL certificates
- Vercel/Netlify provide automatic HTTPS

### API Security

```bash
# Rotate API keys regularly
fly secrets set API_KEYS="new-key-1,new-key-2"

# Review CORS settings
# Check rate limiting configuration
```

### Database Security

```bash
# Use connection pooling
# Enable SSL connections
# Regular backups
# Monitor for suspicious activity
```

## Backup Strategy

### Database Backups

```bash
# Automated backups (Supabase/RDS handle this)
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20240101.sql
```

### Code Backups

- Git repository (primary backup)
- Regular pushes to main branch
- Tag releases for rollback capability

## Rollback Procedures

### API Rollback (Fly.io)

```bash
# View deployment history
fly releases

# Rollback to previous version
fly rollback --version <version-number>
```

### Frontend Rollback

```bash
# Vercel
vercel --prod --rollback

# Manual rollback
# Redeploy previous git commit
git checkout <previous-commit>
vercel --prod
```

## Performance Optimization

### API Optimization

- Enable response compression
- Database connection pooling
- Redis caching layer
- CDN for static assets

### Frontend Optimization

- Code splitting
- Image optimization
- Bundle analysis
- PWA capabilities

### Database Optimization

- Query optimization
- Proper indexing
- Connection pooling
- Read replicas for scaling

## Scaling Considerations

### Horizontal Scaling

```bash
# Scale Fly.io instances
fly scale count 3

# Load balancer configuration
# Database read replicas
```

### Vertical Scaling

```bash
# Increase instance resources
fly scale vm shared-cpu-2x

# Database scaling
# Increase memory/CPU
```

---

For specific deployment issues, check the troubleshooting section in each app's individual README.
