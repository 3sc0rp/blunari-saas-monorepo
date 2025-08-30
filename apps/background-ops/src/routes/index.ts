import { Express } from 'express';
import { metricsRoutes } from './metrics';
import { jobsRoutes } from './jobs';
import { servicesRoutes } from './services';
import { webhooksRoutes } from './webhooks';
import { activityRoutes } from './activity';
import { healthRoutes } from './health';
import { alertsRoutes } from './alerts';
import { schedulerRoutes } from './scheduler';
import { tenantsRoutes } from './tenants';
import { getPerformanceMetrics } from '../middleware/performance';
import { getAdminAuditLog } from '../middleware/adminAudit';

export function setupRoutes(app: Express) {
  // API prefix
  const apiPrefix = '/api/v1';
  
  // Health and status routes
  app.use('/', healthRoutes);
  
  // API routes
  app.use(`${apiPrefix}/metrics`, metricsRoutes);
  app.use(`${apiPrefix}/jobs`, jobsRoutes);
  app.use(`${apiPrefix}/services`, servicesRoutes);
  app.use(`${apiPrefix}/activity`, activityRoutes);
  app.use(`${apiPrefix}/webhooks`, webhooksRoutes);
  app.use(`${apiPrefix}/alerts`, alertsRoutes);
  app.use(`${apiPrefix}/schedules`, schedulerRoutes);
  app.use(`${apiPrefix}/tenants`, tenantsRoutes);
  
  // Performance and audit routes
  app.get(`${apiPrefix}/performance`, getPerformanceMetrics);
  app.get(`${apiPrefix}/audit`, getAdminAuditLog);
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`
    });
  });
}