import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { servicesService } from '../services/services';
import { validateApiKey } from '../middleware/auth';
const router = Router();

// Apply API key authentication to all routes
router.use(validateApiKey);

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await servicesService.getAllServices();
    res.json(services);
  } catch (error) {
    logger.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get service by ID
router.get('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = await servicesService.getServiceById(serviceId);
    
    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    
    res.json(service);
  } catch (error) {
    logger.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Update service status
const updateStatusSchema = z.object({
  status: z.enum(['online', 'warning', 'error', 'maintenance']),
  message: z.string().optional()
});

router.patch('/:serviceId/status', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const statusData = updateStatusSchema.parse(req.body);
    
    const service = await servicesService.updateServiceStatus(serviceId, statusData);
    
    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    
    res.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid status data', details: error.errors });
      return;
    }
    logger.error('Error updating service status:', error);
    res.status(500).json({ error: 'Failed to update service status' });
  }
});

// Run health check for a service
router.post('/:serviceId/health-check', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const healthStatus = await servicesService.runHealthCheck(serviceId);
    
    if (!healthStatus) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    
    res.json(healthStatus);
  } catch (error) {
    logger.error('Error running health check:', error);
    res.status(500).json({ error: 'Failed to run health check' });
  }
});

// Get service health history
router.get('/:serviceId/health-history', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { hours = '24' } = req.query;
    
    const history = await servicesService.getHealthHistory(
      serviceId,
      parseInt(hours as string)
    );
    
    res.json(history);
  } catch (error) {
    logger.error('Error fetching health history:', error);
    res.status(500).json({ error: 'Failed to fetch health history' });
  }
});

// Get service uptime statistics
router.get('/:serviceId/uptime', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { period = '30d' } = req.query;
    
    const uptime = await servicesService.getUptimeStats(
      serviceId,
      period as string
    );
    
    res.json(uptime);
  } catch (error) {
    logger.error('Error fetching uptime stats:', error);
    res.status(500).json({ error: 'Failed to fetch uptime stats' });
  }
});

export { router as servicesRoutes };