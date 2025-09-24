import { Job } from "bull";
import { logger } from "./utils/logger";
import { jobsService } from "./services/jobs";
import { metricsService } from "./services/metrics";
import { config } from "./config";
import { BaseJob, JobStatus, JOB_SCHEMAS } from "./types/jobs";

let isWorkerRunning = false;
let metricsInterval: NodeJS.Timeout;
let holdSweeperInterval: NodeJS.Timeout;
let idempotencyCleanupInterval: NodeJS.Timeout;
let analyticsInterval: NodeJS.Timeout;
let cacheWarmerInterval: NodeJS.Timeout;

export async function startWorkers() {
  logger.info("🚀 Starting background workers...");

  try {
    // Start Bull workers
    await startBullWorkers();

    // Start cron jobs
    await startCronJobs();

    logger.info("✅ All workers started successfully");
  } catch (error) {
    logger.error("❌ Failed to start workers:", error);
    // Don't throw error if workers fail - allow API to continue running
    logger.warn("⚠️ Continuing without all workers...");
  }
}

// Export alias for backwards compatibility
export const startBackgroundWorkers = startWorkers;

async function startCronJobs() {
  logger.info("⏰ Starting scheduled jobs...");

  isWorkerRunning = true;

  // Start scheduled workers
  startHoldExpirationSweeper();
  startIdempotencyGarbageCollector();
  startAnalyticsAggregator();
  startAvailabilityCacheWarmer();
  startMetricsCollection();

  logger.info("✅ All scheduled jobs started");
}

async function startBullWorkers() {
  logger.info("🔄 Starting Bull queue workers...");

  // Process all job types with the same processor
  const queue = jobsService.getQueue();

  // Skip if queue is not available (Redis disabled)
  if (!queue) {
    logger.warn("🔄 Skipping Bull workers - queue not available");
    return;
  }

  // Start multiple workers for concurrency
  for (let i = 0; i < config.WORKER_CONCURRENCY; i++) {
    queue.process(`worker-${i}`, 1, processBullJob);
    logger.info(`✅ Bull worker ${i + 1} started`);
  }

  // Handle job events
  queue.on("completed", (job: Job, result: any) => {
    const jobData = job.data as BaseJob;
    logger.info(`✅ Job completed: ${jobData.type} (${job.id})`, { result });
    metricsService.incrementJobCounter(
      jobData.type,
      "completed",
      jobData.tenantId,
    );
  });

  queue.on("failed", (job: Job, err: Error) => {
    const jobData = job.data as BaseJob;
    logger.error(`❌ Job failed: ${jobData.type} (${job.id})`, {
      error: err.message,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    });
    metricsService.incrementJobCounter(
      jobData.type,
      "failed",
      jobData.tenantId,
    );
  });

  queue.on("stalled", (job: Job) => {
    const jobData = job.data as BaseJob;
    logger.warn(`⚠️ Job stalled: ${jobData.type} (${job.id})`);
    metricsService.incrementJobCounter(
      jobData.type,
      "stalled",
      jobData.tenantId,
    );
  });
}

async function processBullJob(job: Job): Promise<any> {
  const startTime = Date.now();
  const jobData = job.data as BaseJob;

  try {
    logger.info(`🔄 Processing job: ${jobData.type} (${job.id})`, {
      tenantId: jobData.tenantId,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
    });

    let result: any;

    // Route to specific job handler based on type
    switch (jobData.type) {
      case "hold.expiration":
        result = await processHoldExpiration(jobData);
        break;
      case "notification.send":
        result = await processNotificationSend(jobData);
        break;
      case "analytics.aggregate":
        result = await processAnalyticsAggregation(jobData);
        break;
      case "cache.warm_availability":
        result = await processCacheWarming(jobData);
        break;
      case "maintenance.idempotency_gc":
        result = await processIdempotencyGC(jobData);
        break;
      case "payment.process":
        result = await processPaymentProcessing(jobData);
        break;
      default:
        throw new Error(`Unknown job type: ${jobData.type}`);
    }

    const duration = Date.now() - startTime;
    metricsService.recordJobRun(jobData.type, "completed", duration);

    logger.info(`✅ Job completed: ${jobData.type} (${job.id})`, {
      duration: `${duration}ms`,
      result: typeof result === "object" ? Object.keys(result) : result,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    metricsService.recordJobRun(jobData.type, "failed", duration);

    logger.error(`❌ Job failed: ${jobData.type} (${job.id})`, {
      error: error instanceof Error ? error.message : "Unknown error",
      duration: `${duration}ms`,
      attempt: job.attemptsMade + 1,
    });

    throw error;
  }
}

// Job processors

async function processHoldExpiration(job: BaseJob): Promise<any> {
  const { holdId, resourceId, expirationTime } = job.payload;

  logger.info(`Processing hold expiration for hold ${holdId}`);

  // TODO: Implement hold expiration logic
  // This would typically:
  // 1. Mark hold as expired
  // 2. Release resource availability
  // 3. Clean up temporary reservations
  // 4. Update metrics

  return {
    holdId,
    expired: true,
    resourceId,
    expirationTime,
    availabilityReleased: true,
  };
}

async function processNotificationSend(job: BaseJob): Promise<any> {
  const startTime = Date.now();
  const { type, to, template, data, provider = "resend" } = job.payload;

  logger.info(
    `Sending ${type} notification via ${provider} to ${to} using template ${template}`,
  );

  try {
    let result: any;

    // Resolve per-tenant integration settings
    const tenantIntegrations = await fetchTenantIntegrations(job.tenantId);

    if (type === "email") {
      const emailProvider = tenantIntegrations?.email?.provider || provider;
      const fromEmail = tenantIntegrations?.email?.fromEmail || process.env.EMAIL_FROM || "noreply@blunari.ai";
      result = await sendEmailWithProvider({
        to,
        template,
        data,
        provider: emailProvider,
        from: fromEmail,
        apiKey: tenantIntegrations?.email?.resendApiKey || process.env.RESEND_API_KEY,
        smtp: {
          host: tenantIntegrations?.email?.smtpHost || process.env.SMTP_HOST,
          port: tenantIntegrations?.email?.smtpPort ? Number(tenantIntegrations.email.smtpPort) : (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined),
          user: tenantIntegrations?.email?.smtpUser || process.env.SMTP_USER,
          pass: tenantIntegrations?.email?.smtpPass || process.env.SMTP_PASS,
        },
      });
      const duration = Date.now() - startTime;
      metricsService.recordEmailSend(emailProvider, template, duration, "success");
    } else if (type === "sms") {
      const smsProvider = tenantIntegrations?.sms?.provider || "telnyx";
      const fromNumber = tenantIntegrations?.sms?.telnyxFromNumber || tenantIntegrations?.sms?.fromNumber || process.env.TWILIO_PHONE_NUMBER || process.env.TELNYX_FROM_NUMBER || "";
      result = await sendSmsWithProvider({ to, template, data, provider: smsProvider, from: fromNumber, telnyxMessagingProfileId: tenantIntegrations?.sms?.telnyxMessagingProfileId });
      const duration = Date.now() - startTime;
      metricsService.recordSmsSend(duration, "success");
    } else {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    return {
      type,
      to,
      template,
      provider,
      delivered: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (type === "email") {
      metricsService.recordEmailSend(provider, template, duration, "error");
    } else if (type === "sms") {
      metricsService.recordSmsSend(duration, "error");
    }

    throw error;
  }
}

async function processAnalyticsAggregation(job: BaseJob): Promise<any> {
  const { timeRange, metrics, granularity } = job.payload;

  logger.info(
    `Aggregating analytics for time range: ${timeRange} with granularity: ${granularity}`,
  );

  // TODO: Implement analytics aggregation
  // This would typically:
  // 1. Query raw event data
  // 2. Aggregate by time buckets and dimensions
  // 3. Store aggregated metrics
  // 4. Update dashboard data

  return {
    timeRange,
    metricsProcessed: metrics?.length || 0,
    granularity,
    aggregationsCreated: 5,
  };
}

async function processCacheWarming(job: BaseJob): Promise<any> {
  const { resourceType, startDate, endDate } = job.payload;

  logger.info(`Warming ${resourceType} cache from ${startDate} to ${endDate}`);

  // TODO: Implement cache warming logic
  // This would typically:
  // 1. Pre-load frequently accessed data
  // 2. Update Redis cache entries
  // 3. Verify cache consistency

  return {
    resourceType,
    dateRange: { startDate, endDate },
    cacheEntriesWarmed: 100,
    success: true,
  };
}

async function processIdempotencyGC(job: BaseJob): Promise<any> {
  const { olderThan } = job.payload;

  logger.info(
    `Running idempotency garbage collection for records older than ${olderThan}`,
  );

  // TODO: Implement idempotency cleanup
  // This is handled by TTL in Redis, but we can add manual cleanup for monitoring

  const { cleanupExpiredIdempotencyRecords } = await import(
    "./middleware/idempotency"
  );
  const cleaned = await cleanupExpiredIdempotencyRecords();

  return {
    olderThan,
    recordsCleaned: cleaned,
    success: true,
  };
}

async function processPaymentProcessing(job: BaseJob): Promise<any> {
  const { paymentId, amount, currency, action } = job.payload;

  logger.info(
    `Processing payment: ${paymentId} (${action} ${amount} ${currency})`,
  );

  // TODO: Implement payment processing via Stripe
  // This would typically:
  // 1. Call Stripe API for the specified action
  // 2. Update payment status in database
  // 3. Send confirmation notifications

  return {
    paymentId,
    action,
    amount,
    currency,
    processed: true,
    status: "succeeded",
  };
}

// Utility functions for notification sending

async function sendEmail(
  to: string,
  template: string,
  data: any,
  provider: string,
): Promise<any> {
  // TODO: Implement email sending via Resend or Nodemailer
  logger.info(`[MOCK] Sending email to ${to} via ${provider}`);

  return {
    messageId: `email_${Date.now()}`,
    provider,
    template,
    delivered: true,
  };
}

async function sendSms(to: string, template: string, data: any): Promise<any> {
  // TODO: Implement SMS sending via Twilio
  logger.info(`[MOCK] Sending SMS to ${to}`);

  return {
    messageId: `sms_${Date.now()}`,
    to,
    delivered: true,
  };
}

async function fetchTenantIntegrations(tenantId: string): Promise<any> {
  try {
    const { getDb } = await import("./database");
    const db = await getDb();
    const { rows } = await db.query(
      `select setting_value from tenant_settings where tenant_id = $1 and setting_key = 'integrations' limit 1`,
      [tenantId],
    );
    return rows?.[0]?.setting_value || {};
  } catch (e) {
    logger.warn("Failed to fetch tenant integrations; using defaults", e);
    return {};
  }
}

async function sendEmailWithProvider(opts: { to: string; template: string; data: any; provider: string; from: string; apiKey?: string; smtp?: { host?: string; port?: number; user?: string; pass?: string } }): Promise<any> {
  // Simple templating
  const subject = `${opts.data?.tenant_name || 'Reservation'} Confirmation ${opts.data?.confirmation_number || ''}`.trim();
  const html = `<p>Your reservation is confirmed.</p><p><b>${opts.data?.when || ''}</b> · Party ${opts.data?.party_size || ''}</p><p>Reference: <b>${opts.data?.confirmation_number || ''}</b></p>`;

  if (opts.provider === "resend" && opts.apiKey) {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({ from: opts.from, to: opts.to, subject, html }),
    });
    return { messageId: `resend_${Date.now()}`, ok: resp.ok };
  }

  // TODO: add fastmail/smtp transport if needed later
  return sendEmail(opts.to, opts.template, opts.data, opts.provider);
}

async function sendSmsWithProvider(opts: { to: string; template: string; data: any; provider: string; from: string; telnyxMessagingProfileId?: string }): Promise<any> {
  const text = `${opts.data?.tenant_name || 'Your booking'} confirmed for ${opts.data?.when || ''}. Party ${opts.data?.party_size || ''}. Ref ${opts.data?.confirmation_number || ''}.`;
  if (opts.provider === "telnyx" && process.env.TELNYX_API_KEY && (opts.from || opts.telnyxMessagingProfileId)) {
    const body = opts.from ? { from: opts.from, to: opts.to, text } : { messaging_profile_id: opts.telnyxMessagingProfileId, to: opts.to, text };
    const resp = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TELNYX_API_KEY}` },
      body: JSON.stringify(body),
    });
    return { messageId: `telnyx_${Date.now()}`, ok: resp.ok };
  }
  return sendSms(opts.to, opts.template, opts.data);
}

// Scheduled workers that run independently

function startHoldExpirationSweeper() {
  const sweeperInterval = 30000; // 30 seconds

  const runSweeper = async () => {
    if (!isWorkerRunning) return;

    const startTime = Date.now();

    try {
      logger.debug("🧹 Running hold expiration sweeper");

      // TODO: Implement hold expiration sweeper
      // This would typically:
      // 1. Query for expired holds
      // 2. Release availability
      // 3. Clean up hold records
      // 4. Send notifications if needed

      const expiredHolds = await findExpiredHolds();
      let processedCount = 0;

      for (const hold of expiredHolds) {
        try {
          await expireHold(hold);
          processedCount++;
        } catch (error) {
          logger.error(`Failed to expire hold ${hold.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      metricsService.recordHoldSweeperLag(duration);
      metricsService.incrementHoldsExpired(processedCount);

      if (processedCount > 0) {
        logger.info(
          `✅ Hold sweeper processed ${processedCount} expired holds in ${duration}ms`,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsService.recordHoldSweeperLag(duration);
      logger.error("Hold expiration sweeper error:", error);
    }
  };

  holdSweeperInterval = setInterval(runSweeper, sweeperInterval);
  logger.info(
    `✅ Hold expiration sweeper started (${sweeperInterval}ms interval)`,
  );
}

function startIdempotencyGarbageCollector() {
  const cleanupInterval = 60 * 60 * 1000; // 1 hour

  const runCleanup = async () => {
    if (!isWorkerRunning) return;

    try {
      logger.debug("🗑️ Running idempotency garbage collection");

      // This is handled by the idempotency middleware, but we can add manual cleanup
      const { cleanupExpiredIdempotencyRecords } = await import(
        "./middleware/idempotency"
      );
      const cleaned = await cleanupExpiredIdempotencyRecords();

      if (cleaned > 0) {
        logger.info(`✅ Cleaned up ${cleaned} expired idempotency records`);
      }
    } catch (error) {
      logger.error("Idempotency garbage collection error:", error);
    }
  };

  idempotencyCleanupInterval = setInterval(runCleanup, cleanupInterval);
  logger.info(
    `✅ Idempotency garbage collector started (${cleanupInterval}ms interval)`,
  );
}

function startAnalyticsAggregator() {
  const aggregationInterval = 5 * 60 * 1000; // 5 minutes

  const runAggregation = async () => {
    if (!isWorkerRunning) return;

    try {
      logger.debug("📊 Running analytics aggregation");

      // TODO: Implement analytics aggregation
      // This would typically:
      // 1. Query raw events from the last interval
      // 2. Aggregate by time buckets and dimensions
      // 3. Store aggregated results
      // 4. Update dashboard data

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - aggregationInterval);

      const results = await aggregateAnalytics(startTime, endTime);

      logger.info(`✅ Analytics aggregation completed`, {
        timeRange: `${startTime.toISOString()} to ${endTime.toISOString()}`,
        eventsProcessed: results.eventsProcessed,
        aggregationsCreated: results.aggregationsCreated,
      });
    } catch (error) {
      logger.error("Analytics aggregation error:", error);
    }
  };

  analyticsInterval = setInterval(runAggregation, aggregationInterval);
  logger.info(
    `✅ Analytics aggregator started (${aggregationInterval}ms interval)`,
  );
}

function startAvailabilityCacheWarmer() {
  const warmingInterval = 10 * 60 * 1000; // 10 minutes

  const runWarming = async () => {
    if (!isWorkerRunning) return;

    try {
      logger.debug("🔥 Running availability cache warming");

      // TODO: Implement cache warming
      // This would typically:
      // 1. Identify popular properties/time ranges
      // 2. Pre-load availability data
      // 3. Update Redis cache
      // 4. Verify cache hit rates

      const results = await warmAvailabilityCache();

      logger.info(`✅ Cache warming completed`, {
        resourcesWarmed: results.resourcesWarmed,
        cacheEntriesCreated: results.cacheEntriesCreated,
      });
    } catch (error) {
      logger.error("Cache warming error:", error);
    }
  };

  cacheWarmerInterval = setInterval(runWarming, warmingInterval);
  logger.info(
    `✅ Availability cache warmer started (${warmingInterval}ms interval)`,
  );
}

function startMetricsCollection() {
  metricsInterval = setInterval(async () => {
    if (!isWorkerRunning) return;

    try {
      // Update queue metrics only if queue is available
      const queue = jobsService.getQueue();
      if (queue) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        const delayed = await queue.getDelayed();

        await metricsService.updateQueueMetrics({
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
        });
      } else {
        // Record zero metrics when queue is not available
        await metricsService.updateQueueMetrics({
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        });
      }

      // Record system snapshot
      await metricsService.recordSystemSnapshot();
    } catch (error) {
      logger.error("Metrics collection error:", error);
    }
  }, 30000); // Every 30 seconds

  logger.info("✅ Metrics collection started (30s interval)");
}

// Helper functions for scheduled workers

async function findExpiredHolds(): Promise<any[]> {
  // TODO: Query database for expired holds
  // For now, return empty array
  return [];
}

async function expireHold(hold: any): Promise<void> {
  // TODO: Implement hold expiration logic
  logger.debug(`Expiring hold: ${hold.id}`);
}

async function aggregateAnalytics(
  startTime: Date,
  endTime: Date,
): Promise<any> {
  // TODO: Implement analytics aggregation
  return {
    eventsProcessed: 0,
    aggregationsCreated: 0,
    timeRange: { startTime, endTime },
  };
}

async function warmAvailabilityCache(): Promise<any> {
  // TODO: Implement cache warming
  return {
    resourcesWarmed: 0,
    cacheEntriesCreated: 0,
  };
}

export async function stopBackgroundWorkers() {
  logger.info("🛑 Stopping background workers...");

  isWorkerRunning = false;

  // Clear intervals
  if (metricsInterval) clearInterval(metricsInterval);
  if (holdSweeperInterval) clearInterval(holdSweeperInterval);
  if (idempotencyCleanupInterval) clearInterval(idempotencyCleanupInterval);
  if (analyticsInterval) clearInterval(analyticsInterval);
  if (cacheWarmerInterval) clearInterval(cacheWarmerInterval);

  // Close Bull queue if available
  try {
    const queue = jobsService.getQueue();
    if (queue) {
      await queue.close();
      logger.info("✅ Bull queue closed");
    }
  } catch (error) {
    logger.error("Error closing Bull queue:", error);
  }

  logger.info("✅ Background workers stopped");
}

// Graceful shutdown
process.on("SIGTERM", stopBackgroundWorkers);
process.on("SIGINT", stopBackgroundWorkers);
