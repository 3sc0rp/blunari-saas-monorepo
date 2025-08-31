import express from 'express';
import { validateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { metricsService } from '../services/metrics';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /metrics - Prometheus metrics endpoint (no auth required for Prometheus)
 */
router.get('/', async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate Prometheus metrics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).send('# Failed to generate metrics\n');
  }
});

// Apply authentication to all other routes
router.use(validateApiKey);

/**
 * GET /v1/metrics/json - Metrics in JSON format
 */
router.get('/json', async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.headers['x-request-id'] as string });
  
  try {
    const metrics = await metricsService.getMetricsJson();
    
    res.json({
      success: true,
      data: {
        metrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    requestLogger.error('Failed to get metrics JSON', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get metrics'
    });
  }
});

/**
 * GET /v1/metrics/health - Health check for metrics subsystem
 */
router.get('/health', async (req: AuthenticatedRequest, res) => {
  try {
    const healthMetrics = metricsService.getHealthMetrics();
    
    res.json({
      success: true,
      data: healthMetrics
    });
  } catch (error) {
    logger.error('Failed to get metrics health', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get metrics health'
    });
  }
});

/**
 * GET /v1/metrics/system - Legacy system metrics endpoint
 */
router.get('/system', async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.headers['x-request-id'] as string });
  
  try {
    const systemMetrics = await metricsService.getSystemMetrics();
    
    res.json({
      success: true,
      data: systemMetrics
    });
  } catch (error) {
    requestLogger.error('Failed to get system metrics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get system metrics'
    });
  }
});

/**
 * POST /v1/metrics/record - Record a custom metric (legacy support)
 */
router.post('/record', async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.headers['x-request-id'] as string });
  
  try {
    const { name, value, unit, tags } = req.body;
    
    if (!name || typeof value !== 'number' || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Missing required fields: name, value, unit'
      });
    }
    
    await metricsService.recordMetric({
      name,
      value,
      unit,
      tags: tags || {}
    });
    
    return res.json({
      success: true,
      data: {
        name,
        value,
        unit,
        recorded: true
      }
    });
  } catch (error) {
    requestLogger.error('Failed to record metric', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to record metric'
    });
  }
});

export { router as metricsRoutes };