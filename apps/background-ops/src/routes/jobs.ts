import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { jobsService } from '../services/jobs';
import { validateApiKey } from '../middleware/auth';
const router = Router();

// Apply API key authentication to all routes
router.use(validateApiKey);

// Get all jobs with enhanced filters
router.get('/', async (req, res) => {
  logger.info('Jobs API endpoint called', { query: req.query });
  try {
    const { 
      status, 
      type, 
      search,
      priority,
      startDate,
      endDate,
      limit = '50', 
      offset = '0',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;
    
    logger.info('Calling jobsService.getJobs with enhanced filters', { 
      status, type, search, priority, startDate, endDate,
      limit: parseInt(limit as string), offset: parseInt(offset as string),
      sortBy, sortOrder
    });
    
    const jobs = await jobsService.getJobs({
      status: status as string,
      type: type as string,
      search: search as string,
      priority: priority ? parseInt(priority as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });
    
    logger.info('Jobs fetched successfully', { jobCount: jobs.jobs.length, total: jobs.total });
    res.json(jobs);
  } catch (error) {
    logger.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get job by ID
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobsService.getJobById(jobId);
    
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    res.json(job);
  } catch (error) {
    logger.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Create a new job
const createJobSchema = z.object({
  type: z.string(),
  data: z.record(z.any()).optional(),
  priority: z.number().min(1).max(10).default(5),
  delay: z.number().min(0).optional(),
  attempts: z.number().min(1).max(10).default(3)
});

router.post('/', async (req, res) => {
  try {
    const jobData = createJobSchema.parse(req.body);
    const job = await jobsService.createJob(jobData);
    res.status(201).json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid job data', details: error.errors });
      return;
    }
    logger.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Retry a failed job
router.post('/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobsService.retryJob(jobId);
    
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    res.json(job);
  } catch (error) {
    logger.error('Error retrying job:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

// Cancel a job
router.delete('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const success = await jobsService.cancelJob(jobId);
    
    if (!success) {
      res.status(404).json({ error: 'Job not found or cannot be cancelled' });
      return;
    }
    
    res.json({ message: 'Job cancelled successfully' });
  } catch (error) {
    logger.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// Get job statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await jobsService.getJobStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching job stats:', error);
    res.status(500).json({ error: 'Failed to fetch job stats' });
  }
});

// Bulk operations for multiple jobs
router.post('/bulk/retry', async (req, res) => {
  try {
    const { jobIds } = req.body;
    if (!Array.isArray(jobIds)) {
      res.status(400).json({ error: 'jobIds must be an array' });
      return;
    }

    const results = await Promise.all(
      jobIds.map(id => jobsService.retryJob(id))
    );
    
    const successful = results.filter(Boolean).length;
    res.json({ 
      message: `${successful}/${jobIds.length} jobs retried successfully`,
      successful,
      total: jobIds.length
    });
  } catch (error) {
    logger.error('Error bulk retrying jobs:', error);
    res.status(500).json({ error: 'Failed to bulk retry jobs' });
  }
});

router.post('/bulk/cancel', async (req, res) => {
  try {
    const { jobIds } = req.body;
    if (!Array.isArray(jobIds)) {
      res.status(400).json({ error: 'jobIds must be an array' });
      return;
    }

    const results = await Promise.all(
      jobIds.map(id => jobsService.cancelJob(id))
    );
    
    const successful = results.filter(Boolean).length;
    res.json({ 
      message: `${successful}/${jobIds.length} jobs cancelled successfully`,
      successful,
      total: jobIds.length
    });
  } catch (error) {
    logger.error('Error bulk cancelling jobs:', error);
    res.status(500).json({ error: 'Failed to bulk cancel jobs' });
  }
});

// Export jobs data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', ...filters } = req.query;
    
    // Get all jobs matching the filters
    const jobs = await jobsService.getJobs({
      ...filters,
      limit: 10000, // Large limit for export
      offset: 0
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'Name', 'Type', 'Status', 'Priority', 'Attempts', 'Max Attempts',
        'Created At', 'Started At', 'Completed At', 'Failed At', 'Error Message'
      ];
      
      const csvData = jobs.jobs.map(job => [
        job.id,
        job.job_name,
        job.job_type,
        job.status,
        job.priority,
        job.attempts,
        job.max_attempts,
        job.created_at,
        job.started_at,
        job.completed_at,
        job.failed_at,
        job.error_message || ''
      ]);
      
      const csv = [csvHeaders, ...csvData]
        .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${timestamp}.csv"`);
      res.send(csv);
    } else {
      // JSON format (default)
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${timestamp}.json"`);
      res.json({
        exported_at: new Date().toISOString(),
        filters,
        total_jobs: jobs.total,
        jobs: jobs.jobs
      });
    }
    
    logger.info(`Jobs exported`, { 
      format, 
      count: jobs.jobs.length, 
      filters: JSON.stringify(filters) 
    });
    
  } catch (error) {
    logger.error('Error exporting jobs:', error);
    res.status(500).json({ error: 'Failed to export jobs' });
  }
});

export { router as jobsRoutes };