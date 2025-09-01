import { Express } from 'express';
import { metricsRoutes } from './metrics';
import { jobsRoutes } from './jobs';
import { eventsRoutes } from './events';
import { servicesRoutes } from './services';
import { webhooksRoutes } from './webhooks';
import { activityRoutes } from './activity';
import { healthRoutes } from './health';
import { alertsRoutes } from './alerts';
import { schedulerRoutes } from './scheduler';
import { tenantsRoutes } from './tenants';
import { cateringRoutes } from './catering';
import { getPerformanceMetrics } from '../middleware/performance';
import { getAdminAuditLog } from '../middleware/adminAudit';

export function setupRoutes(app: Express) {
  // Health check (public, no API prefix)
  app.use('/health', healthRoutes);
  
  // Prometheus metrics endpoint (public, no auth required)
  app.get('/metrics', metricsRoutes);
  
  // API prefix
  const apiPrefix = '/api/v1';
  
  // Core API routes
  app.use(`${apiPrefix}/jobs`, jobsRoutes);
  app.use(`${apiPrefix}/events`, eventsRoutes);
  app.use(`${apiPrefix}/metrics`, metricsRoutes);
  app.use(`${apiPrefix}/services`, servicesRoutes);
  app.use(`${apiPrefix}/activity`, activityRoutes);
  app.use(`${apiPrefix}/webhooks`, webhooksRoutes);
  app.use(`${apiPrefix}/alerts`, alertsRoutes);
  app.use(`${apiPrefix}/schedules`, schedulerRoutes);
  app.use(`${apiPrefix}/tenants`, tenantsRoutes);
  app.use(`${apiPrefix}/catering`, cateringRoutes);
  
  // Performance and audit routes
  app.get(`${apiPrefix}/performance`, getPerformanceMetrics);
  app.get(`${apiPrefix}/audit`, getAdminAuditLog);
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`
    });
  });
}