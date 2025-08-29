import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { activityService } from '../services/activity';
import { validateApiKey } from '../middleware/auth';
const router = Router();

// Apply API key authentication to all routes
router.use(validateApiKey);

// Get activity feed
router.get('/', async (req, res) => {
  try {
    const { service, status, limit = '50', offset = '0' } = req.query;
    
    const activities = await activityService.getActivityFeed({
      service: service as string,
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    
    res.json(activities);
  } catch (error) {
    logger.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Log new activity
const logActivitySchema = z.object({
  type: z.string(),
  service: z.string(),
  message: z.string(),
  status: z.enum(['success', 'warning', 'error', 'info']),
  details: z.record(z.any()).optional(),
  user_id: z.string().optional()
});

router.post('/', async (req, res) => {
  try {
    const activityData = logActivitySchema.parse(req.body);
    const activity = await activityService.logActivity(activityData);
    res.status(201).json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid activity data', details: error.errors });
      return;
    }
    logger.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Get activity statistics
router.get('/stats', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const stats = await activityService.getActivityStats(timeRange as string);
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
});

// Get activity by service
router.get('/service/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    
    const activities = await activityService.getActivityByService(
      serviceName,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(activities);
  } catch (error) {
    logger.error('Error fetching service activity:', error);
    res.status(500).json({ error: 'Failed to fetch service activity' });
  }
});

export { router as activityRoutes };