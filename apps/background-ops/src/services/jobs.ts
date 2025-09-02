import Bull from "bull";
import { createClient, RedisClientType } from "redis";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import { logger } from "../utils/logger";
import {
  BaseJob,
  JobStatus,
  JobPriority,
  CreateJobRequest,
  JobFilters,
  JOB_SCHEMAS,
  JobType,
  JobPayload,
} from "../types/jobs";

// Bull queue instance
let jobQueue: Bull.Queue;
let redis: RedisClientType;

// Initialize job processing infrastructure
export async function initializeJobService(): Promise<void> {
  try {
    // Skip Redis entirely for development - will be re-enabled for production
    logger.warn("🔄 Redis disabled for development - job service disabled");
    return;

    // Skip Redis entirely if URL is not provided or empty
    if (!config.REDIS_URL || config.REDIS_URL.trim() === "") {
      logger.warn("🔄 No REDIS_URL provided - job service disabled");
      return;
    }

    // Initialize Redis client
    redis = createClient({
      url: config.REDIS_URL,
    });

    redis.on("error", (err) => {
      // Only log in production
      if (config.NODE_ENV === "production") {
        logger.error("Jobs Redis client error:", err);
      }
    });

    await redis.connect();

    // Initialize Bull queue
    jobQueue = new Bull("job-processing", config.REDIS_URL, {
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: config.JOB_RETRY_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    // Add queue event listeners
    jobQueue.on("completed", (job) => {
      logger.info("Job completed", {
        jobId: job.id,
        type: job.data.type,
        duration: job.processedOn ? Date.now() - job.processedOn : 0,
      });
    });

    jobQueue.on("failed", (job, err) => {
      logger.error("Job failed", {
        jobId: job.id,
        type: job.data?.type,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    logger.info("Job service initialized successfully");
  } catch (error) {
    // Only throw error in production
    if (config.NODE_ENV === "production") {
      logger.error("Failed to initialize job service:", error);
      throw error;
    } else {
      logger.warn("🔄 Job service disabled - Redis not available");
    }
  }
}

/**
 * Validate job payload against schema
 */
function validateJobPayload(type: JobType, payload: any): void {
  const schema = JOB_SCHEMAS[type];
  if (!schema) {
    throw new Error(`Unknown job type: ${type}`);
  }

  try {
    schema.parse(payload);
  } catch (error) {
    throw new Error(
      `Invalid payload for job type ${type}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Create and enqueue a new job
 */
export async function createJob(
  tenantId: string,
  requestId: string,
  jobRequest: CreateJobRequest,
): Promise<BaseJob> {
  const jobLogger = logger.child({ requestId, tenantId });

  try {
    // Validate payload schema
    validateJobPayload(jobRequest.type, jobRequest.payload);

    const jobId = uuidv4();
    const now = new Date();
    const scheduledFor = jobRequest.scheduledFor
      ? new Date(jobRequest.scheduledFor)
      : now;

    const job: BaseJob = {
      id: jobId,
      type: jobRequest.type,
      tenantId,
      requestId,
      status: JobStatus.PENDING,
      priority: jobRequest.priority || JobPriority.NORMAL,
      payload: jobRequest.payload,
      attempts: 0,
      maxRetries: jobRequest.maxRetries || config.JOB_RETRY_ATTEMPTS,
      createdAt: now,
      updatedAt: now,
      scheduledFor: scheduledFor > now ? scheduledFor : undefined,
    };

    // Add to Bull queue
    const delay =
      scheduledFor > now ? scheduledFor.getTime() - now.getTime() : 0;
    const bullJob = await jobQueue.add(
      jobRequest.type,
      {
        ...job,
        tenantId,
        requestId,
      },
      {
        priority: job.priority,
        delay,
        jobId,
        attempts: job.maxRetries,
      },
    );

    jobLogger.info("Job created and enqueued", {
      jobId,
      type: jobRequest.type,
      priority: job.priority,
      scheduledFor: scheduledFor.toISOString(),
      delay,
    });

    return job;
  } catch (error) {
    jobLogger.error("Failed to create job", {
      type: jobRequest.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<BaseJob | null> {
  try {
    const bullJob = await jobQueue.getJob(jobId);
    if (!bullJob) {
      return null;
    }

    return convertBullJobToBaseJob(bullJob);
  } catch (error) {
    logger.error("Failed to get job", {
      jobId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(
  jobId: string,
  requestId?: string,
): Promise<boolean> {
  const jobLogger = logger.child({ requestId, jobId });

  try {
    const bullJob = await jobQueue.getJob(jobId);
    if (!bullJob) {
      return false;
    }

    // Only cancel if job is not already completed or failed
    const state = await bullJob.getState();
    if (["completed", "failed"].includes(state)) {
      jobLogger.warn("Cannot cancel job in final state", { state });
      return false;
    }

    await bullJob.remove();
    jobLogger.info("Job cancelled", { state });

    return true;
  } catch (error) {
    jobLogger.error("Failed to cancel job", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Query jobs with filters
 */
export async function queryJobs(filters: JobFilters): Promise<{
  jobs: BaseJob[];
  total: number;
}> {
  try {
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    // Get jobs from Bull queue based on status
    let bullJobs: Bull.Job[] = [];

    if (!filters.status || filters.status.length === 0) {
      // Get all jobs if no status filter
      const [waiting, active, completed, failed] = await Promise.all([
        jobQueue.getJobs(["waiting"], offset, offset + limit - 1),
        jobQueue.getJobs(["active"], 0, limit - 1),
        jobQueue.getJobs(["completed"], 0, limit - 1),
        jobQueue.getJobs(["failed"], 0, limit - 1),
      ]);
      bullJobs = [...waiting, ...active, ...completed, ...failed];
    } else {
      // Map our status types to Bull status types
      const bullStatuses: Bull.JobStatus[] = [];
      for (const status of filters.status) {
        switch (status) {
          case JobStatus.PENDING:
            bullStatuses.push("waiting");
            break;
          case JobStatus.PROCESSING:
            bullStatuses.push("active");
            break;
          case JobStatus.COMPLETED:
            bullStatuses.push("completed");
            break;
          case JobStatus.FAILED:
            bullStatuses.push("failed");
            break;
        }
      }

      if (bullStatuses.length > 0) {
        bullJobs = await jobQueue.getJobs(
          bullStatuses,
          offset,
          offset + limit - 1,
        );
      }
    }

    // Convert and filter jobs
    let jobs = bullJobs.map(convertBullJobToBaseJob);

    // Apply additional filters
    if (filters.tenantId) {
      jobs = jobs.filter((job) => job.tenantId === filters.tenantId);
    }

    if (filters.type && filters.type.length > 0) {
      jobs = jobs.filter((job) => filters.type!.includes(job.type as JobType));
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      jobs = jobs.filter((job) => job.createdAt >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      jobs = jobs.filter((job) => job.createdAt <= toDate);
    }

    return {
      jobs: jobs.slice(0, limit),
      total: jobs.length,
    };
  } catch (error) {
    logger.error("Failed to query jobs", {
      error: error instanceof Error ? error.message : "Unknown error",
      filters,
    });
    throw error;
  }
}

/**
 * Get job statistics
 */
export async function getJobStats(): Promise<{
  total: number;
  byStatus: Record<JobStatus, number>;
  byType: Record<string, number>;
  recentFailures: number;
}> {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      jobQueue.getWaiting(),
      jobQueue.getActive(),
      jobQueue.getCompleted(),
      jobQueue.getFailed(),
      jobQueue.getDelayed(),
    ]);

    const allJobs = [
      ...waiting,
      ...active,
      ...completed,
      ...failed,
      ...delayed,
    ];

    const byStatus: Record<JobStatus, number> = {
      [JobStatus.PENDING]: waiting.length + delayed.length,
      [JobStatus.PROCESSING]: active.length,
      [JobStatus.COMPLETED]: completed.length,
      [JobStatus.FAILED]: failed.length,
      [JobStatus.CANCELLED]: 0,
      [JobStatus.RETRYING]: 0,
    };

    const byType: Record<string, number> = {};
    for (const job of allJobs) {
      const type = job.data?.type || "unknown";
      byType[type] = (byType[type] || 0) + 1;
    }

    // Count recent failures (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentFailures = failed.filter(
      (job) =>
        job.failedReason && job.finishedOn && job.finishedOn > oneHourAgo,
    ).length;

    return {
      total: allJobs.length,
      byStatus,
      byType,
      recentFailures,
    };
  } catch (error) {
    logger.error("Failed to get job stats", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Convert Bull job to our BaseJob interface
 */
function convertBullJobToBaseJob(bullJob: Bull.Job): BaseJob {
  const data = bullJob.data;

  let status: JobStatus = JobStatus.PENDING;
  switch (
    bullJob.opts.delay &&
    Date.now() < (bullJob.processedOn || 0) + bullJob.opts.delay
      ? "delayed"
      : bullJob.finishedOn
        ? bullJob.failedReason
          ? "failed"
          : "completed"
        : "active"
  ) {
    case "completed":
      status = JobStatus.COMPLETED;
      break;
    case "failed":
      status = JobStatus.FAILED;
      break;
    case "active":
      status = JobStatus.PROCESSING;
      break;
    case "delayed":
      status = JobStatus.PENDING;
      break;
    default:
      status = JobStatus.PENDING;
  }

  return {
    id: bullJob.id?.toString() || "",
    type: data.type,
    tenantId: data.tenantId,
    requestId: data.requestId,
    idempotencyKey: data.idempotencyKey,
    status,
    priority: bullJob.opts.priority || JobPriority.NORMAL,
    payload: data.payload,
    attempts: bullJob.attemptsMade || 0,
    maxRetries: data.maxRetries || config.JOB_RETRY_ATTEMPTS,
    createdAt: new Date(bullJob.timestamp),
    updatedAt: new Date(bullJob.processedOn || bullJob.timestamp),
    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
    completedAt: bullJob.finishedOn ? new Date(bullJob.finishedOn) : undefined,
    failedAt:
      bullJob.failedReason && bullJob.finishedOn
        ? new Date(bullJob.finishedOn)
        : undefined,
    error: bullJob.failedReason,
    result: bullJob.returnvalue,
  };
}

// Export the queue for worker access
export { jobQueue };

// Legacy support - keep existing interface for backward compatibility
export interface JobData {
  type: string;
  data?: Record<string, any>;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface JobFilter {
  status?: string;
  type?: string;
  search?: string;
  priority?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

class JobsService {
  getQueue(): Bull.Queue {
    return jobQueue;
  }

  async getJobs(filter: JobFilter = {}) {
    // Map to new interface
    const filters: JobFilters = {
      status: filter.status ? [filter.status as JobStatus] : undefined,
      type: filter.type ? [filter.type as JobType] : undefined,
      tenantId: undefined,
      fromDate: filter.startDate,
      toDate: filter.endDate,
      limit: filter.limit,
      offset: filter.offset,
    };

    const result = await queryJobs(filters);
    return {
      jobs: result.jobs.map((job) => ({
        id: job.id,
        job_name: job.type,
        job_type: job.type,
        status: job.status,
        priority: job.priority,
        data: job.payload,
        attempts: job.attempts,
        max_attempts: job.maxRetries,
        created_at: job.createdAt,
        started_at: job.status === JobStatus.PROCESSING ? job.updatedAt : null,
        completed_at: job.completedAt,
        failed_at: job.failedAt,
        error_message: job.error,
        result: job.result,
      })),
      total: result.total,
    };
  }

  async getJobById(jobId: string) {
    const job = await getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      job_name: job.type,
      job_type: job.type,
      status: job.status,
      priority: job.priority,
      data: job.payload,
      attempts: job.attempts,
      max_attempts: job.maxRetries,
      created_at: job.createdAt,
      started_at: job.status === JobStatus.PROCESSING ? job.updatedAt : null,
      completed_at: job.completedAt,
      failed_at: job.failedAt,
      error_message: job.error,
      result: job.result,
    };
  }

  async createJob(jobData: JobData) {
    // Default tenant and request for legacy support
    const job = await createJob("default", uuidv4(), {
      type: jobData.type as JobType,
      payload: (jobData.data as any) || {},
      priority: jobData.priority as JobPriority,
      scheduledFor: jobData.delay
        ? new Date(Date.now() + jobData.delay * 1000).toISOString()
        : undefined,
      maxRetries: jobData.attempts,
    });

    return {
      id: job.id,
      job_name: job.type,
      job_type: job.type,
      payload: job.payload,
      priority: job.priority,
      max_retries: job.maxRetries,
      scheduled_at: job.scheduledFor,
      status: job.status,
    };
  }

  async retryJob(jobId: string) {
    // For Bull, retry means re-adding the job
    const job = await getJob(jobId);
    if (!job) return null;

    if (job.status !== JobStatus.FAILED) return null;

    // Re-create the job
    const newJob = await createJob(job.tenantId, uuidv4(), {
      type: job.type as JobType,
      payload: job.payload,
      priority: job.priority,
      maxRetries: job.maxRetries,
    });

    return {
      id: newJob.id,
      job_name: newJob.type,
      job_type: newJob.type,
      status: newJob.status,
      priority: newJob.priority,
    };
  }

  async cancelJob(jobId: string) {
    return await cancelJob(jobId);
  }

  async getJobStats() {
    const stats = await getJobStats();
    return {
      total: stats.total,
      pending: stats.byStatus[JobStatus.PENDING] || 0,
      running: stats.byStatus[JobStatus.PROCESSING] || 0,
      completed: stats.byStatus[JobStatus.COMPLETED] || 0,
      failed: stats.byStatus[JobStatus.FAILED] || 0,
      cancelled: stats.byStatus[JobStatus.CANCELLED] || 0,
      scheduled: 0,
    };
  }

  async updateJobStatus(
    jobId: string,
    status: string,
    error?: string,
    jobResult?: any,
  ) {
    // This is handled automatically by Bull
    logger.info("Job status update requested", {
      jobId,
      status,
      hasError: !!error,
    });
    return null;
  }

  async getNextJob() {
    // This is handled automatically by Bull workers
    return null;
  }
}

export const jobsService = new JobsService();
