# Background-Ops Server

A headless backend service for background operations, metrics collection, job processing, and webhooks.

## 🚀 **Pure Backend Service**

This is a **headless API-only service** with:
- ✅ REST APIs for metrics, jobs, services, webhooks
- ✅ WebSocket endpoints for real-time updates  
- ✅ Background workers for processing tasks
- ✅ Scheduled jobs for data collection
- ❌ No frontend/UI
- ❌ No authentication/login

## API Endpoints

### Health & Status
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with dependencies
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe

### Metrics
- `GET /api/v1/metrics` - Get current system metrics
- `GET /api/v1/metrics/range` - Get metrics for time range
- `POST /api/v1/metrics` - Record new metric
- `GET /api/v1/metrics/aggregated/:metricName` - Get aggregated metrics

### Jobs
- `GET /api/v1/jobs` - List all jobs (with filters)
- `GET /api/v1/jobs/:jobId` - Get specific job
- `POST /api/v1/jobs` - Create new job
- `POST /api/v1/jobs/:jobId/retry` - Retry failed job
- `DELETE /api/v1/jobs/:jobId` - Cancel job
- `GET /api/v1/jobs/stats/overview` - Job statistics

### Services
- `GET /api/v1/services` - List all services
- `GET /api/v1/services/:serviceId` - Get specific service
- `PATCH /api/v1/services/:serviceId/status` - Update service status
- `POST /api/v1/services/:serviceId/health-check` - Run health check
- `GET /api/v1/services/:serviceId/health-history` - Health history
- `GET /api/v1/services/:serviceId/uptime` - Uptime statistics

### Activity Feed
- `GET /api/v1/activity` - Get activity feed
- `POST /api/v1/activity` - Log new activity
- `GET /api/v1/activity/stats` - Activity statistics
- `GET /api/v1/activity/service/:serviceName` - Service-specific activity

### Webhooks
- `POST /api/v1/webhooks/generic` - Generic webhook handler
- `POST /api/v1/webhooks/health/:serviceId` - Service health webhook
- `POST /api/v1/webhooks/payment` - Payment webhook
- `POST /api/v1/webhooks/deployment` - Deployment webhook

## Environment Variables

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/background_ops

# Redis (for job queues)
REDIS_URL=redis://localhost:6379

# Security
API_KEY=your-internal-api-key
WEBHOOK_SECRET=webhook-verification-secret

# CORS
ALLOWED_ORIGINS=https://your-admin-dashboard.com,https://your-client-app.com
```

## Deployment to Fly.io

1. **Login to Fly.io:**
   ```bash
   fly auth login
   ```

2. **Deploy:**
   ```bash
   cd background-ops
   fly launch
   ```

3. **Set environment variables:**
   ```bash
   fly secrets set DATABASE_URL="postgresql://..."
   fly secrets set REDIS_URL="redis://..."
   fly secrets set API_KEY="your-internal-api-key"
   ```

4. **Deploy updates:**
   ```bash
   fly deploy
   ```

## Usage from Admin Dashboard

Once deployed, your admin dashboard can connect via Edge Functions:

```typescript
// Edge Function to proxy requests to background-ops
const BACKGROUND_OPS_URL = "https://your-app.fly.dev";

export default async function handler(req: Request) {
  const response = await fetch(`${BACKGROUND_OPS_URL}/api/v1/metrics`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  return new Response(await response.text(), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Features

- **Background Job Processing** with Bull queues
- **Real-time WebSocket Updates** for live monitoring
- **Scheduled Tasks** for periodic data collection
- **Webhook Handlers** for external integrations
- **Health Monitoring** with uptime tracking
- **Metrics Collection** with time-series data
- **Activity Logging** for audit trails