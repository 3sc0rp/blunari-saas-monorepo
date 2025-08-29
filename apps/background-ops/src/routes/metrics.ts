import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { metricsService } from '../services/metrics';
import { validateApiKey } from '../middleware/auth';
const router = Router();

// Apply API key authentication to all routes
router.use(validateApiKey);

// Get system metrics
router.get('/', async (req, res) => {
  try {
    const metrics = await metricsService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get metrics for a specific time range
const timeRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  interval: z.enum(['1m', '5m', '15m', '1h', '6h', '24h']).optional()
});

router.get('/range', async (req, res) => {
  try {
    const { start, end, interval } = timeRangeSchema.parse(req.query);
    const metrics = await metricsService.getMetricsInRange(
      new Date(start),
      new Date(end),
      interval
    );
    res.json(metrics);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      return;
    }
    logger.error('Error fetching metrics range:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Record a new metric
const recordMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  tags: z.record(z.string()).optional()
});

router.post('/', async (req, res) => {
  try {
    const metricData = recordMetricSchema.parse(req.body);
    const metric = await metricsService.recordMetric(metricData);
    res.status(201).json(metric);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid metric data', details: error.errors });
      return;
    }
    logger.error('Error recording metric:', error);
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

// Get aggregated metrics
router.get('/aggregated/:metricName', async (req, res) => {
  try {
    const { metricName } = req.params;
    const { timeRange = '1h' } = req.query;
    
    const aggregated = await metricsService.getAggregatedMetrics(
      metricName,
      timeRange as string
    );
    res.json(aggregated);
  } catch (error) {
    logger.error('Error fetching aggregated metrics:', error);
    res.status(500).json({ error: 'Failed to fetch aggregated metrics' });
  }
});

export { router as metricsRoutes };