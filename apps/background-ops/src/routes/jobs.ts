import express from 'express';
import { z } from 'zod';
import { authenticateRequest, validateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { createJob, getJob, cancelJob, queryJobs, getJobStats } from '../services/jobs';
import { CreateJobRequest, JobFilters, JobType } from '../types/jobs';
import { logger } from '../utils/logger';

const router = express.Router();

// Schema for job creation request
const CreateJobSchema = z.object({
  type: z.string(),
  payload: z.any(),
  priority: z.number().min(1).max(20).optional(),
  scheduledFor: z.string().datetime().optional(),
  maxRetries: z.number().min(0).max(10).optional()
});

// Schema for job query parameters
const JobQuerySchema = z.object({
  status: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  tenantId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

/**
 * POST /v1/jobs - Create and enqueue a new job
 */
router.post('/', authenticateRequest, idempotencyMiddleware, async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.requestId, tenantId: req.tenantId });
  
  try {
    // Validate request body
    const jobRequest = CreateJobSchema.parse(req.body) as CreateJobRequest;
    
    requestLogger.info('Creating job', {
      type: jobRequest.type,
      priority: jobRequest.priority,
      hasPayload: !!jobRequest.payload,
      scheduledFor: jobRequest.scheduledFor
    });

    // Create and enqueue job
    const job = await createJob(req.tenantId!, req.requestId!, jobRequest);

    res.status(201).json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        scheduledFor: job.scheduledFor?.toISOString(),
        createdAt: job.createdAt.toISOString()
      }
    });

    requestLogger.info('Job created successfully', { jobId: job.id });
  } catch (error) {
    requestLogger.error('Failed to create job', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else if (error instanceof Error && error.message.includes('Unknown job type')) {
      res.status(400).json({
        success: false,
        error: 'Invalid job type',
        message: error.message
      });
    } else if (error instanceof Error && error.message.includes('Invalid payload')) {
      res.status(400).json({
        success: false,
        error: 'Invalid job payload',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create job'
      });
    }
  }
});

/**
 * GET /v1/jobs/:id - Get job by ID
 */
router.get('/:id', validateApiKey, async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.headers['x-request-id'] as string });
  
  try {
    const jobId = req.params.id;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        tenantId: job.tenantId,
        status: job.status,
        priority: job.priority,
        payload: job.payload,
        attempts: job.attempts,
        maxRetries: job.maxRetries,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        scheduledFor: job.scheduledFor?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        failedAt: job.failedAt?.toISOString(),
        error: job.error,
        result: job.result
      }
    });
  } catch (error) {
    requestLogger.error('Failed to get job', { 
      jobId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get job'
    });
  }
});

/**
 * POST /v1/jobs/:id/cancel - Cancel a job
 */
router.post('/:id/cancel', authenticateRequest, idempotencyMiddleware, async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.requestId, tenantId: req.tenantId });
  
  try {
    const jobId = req.params.id;
    const cancelled = await cancelJob(jobId, req.requestId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or cannot be cancelled'
      });
    }

    res.json({
      success: true,
      data: {
        id: jobId,
        cancelled: true
      }
    });

    return requestLogger.info('Job cancelled successfully', { jobId });
  } catch (error) {
    requestLogger.error('Failed to cancel job', { 
      jobId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to cancel job'
    });
  }
});

/**
 * GET /v1/jobs - Query jobs with filters
 */
router.get('/', validateApiKey, async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.headers['x-request-id'] as string });
  
  try {
    // Parse and validate query parameters
    const queryParams = {
      status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
      type: req.query.type ? (Array.isArray(req.query.type) ? req.query.type : [req.query.type]) : undefined,
      tenantId: req.query.tenantId as string,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const filters: JobFilters = {
      status: queryParams.status as any,
      type: queryParams.type as any,
      tenantId: queryParams.tenantId,
      fromDate: queryParams.fromDate,
      toDate: queryParams.toDate,
      limit: queryParams.limit,
      offset: queryParams.offset
    };

    const result = await queryJobs(filters);

    res.json({
      success: true,
      data: {
        jobs: result.jobs.map(job => ({
          id: job.id,
          type: job.type,
          tenantId: job.tenantId,
          status: job.status,
          priority: job.priority,
          attempts: job.attempts,
          maxRetries: job.maxRetries,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
          scheduledFor: job.scheduledFor?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          failedAt: job.failedAt?.toISOString(),
          error: job.error
        })),
        total: result.total,
        pagination: {
          limit: filters.limit || 50,
          offset: filters.offset || 0
        }
      }
    });
  } catch (error) {
    requestLogger.error('Failed to query jobs', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to query jobs'
      });
    }
  }
});

/**
 * GET /v1/jobs/stats - Get job statistics
 */
router.get('/stats', validateApiKey, async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({ requestId: req.headers['x-request-id'] as string });
  
  try {
    const stats = await getJobStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    requestLogger.error('Failed to get job stats', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get job statistics'
    });
  }
});

export { router as jobsRoutes };