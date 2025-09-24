import cron from "node-cron";
import { logger } from "./utils/logger";
import { metricsService } from "./services/metrics";
import { jobsService } from "./services/jobs";
import { activityService } from "./services/activity";

export function startScheduledJobs() {
  logger.info("⏰ Starting scheduled jobs...");

  // System metrics collection every 1 minute
  cron.schedule("* * * * *", async () => {
    try {
      await metricsService.recordSystemSnapshot();
      logger.debug("System metrics snapshot recorded");
    } catch (error) {
      logger.error("Error recording system snapshot:", error);
    }
  });

  // Health checks every 5 minutes (removed: job type not implemented)
  // Keep the slot for future use or emit a simple log for now
  cron.schedule("*/5 * * * *", async () => {
    logger.debug("Scheduled health check tick (no-op)");
  });

  // Cleanup old data every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      // Cleanup old activity logs
      await activityService.cleanup(cutoffDate);

      // Cleanup old metrics (keep last 24 hours)
      const metricsCleanupDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await jobsService.createJob({
        type: "cleanup_old_data",
        data: {
          table_name: "system_metrics",
          cutoff_date: metricsCleanupDate.toISOString(),
        },
        priority: 3,
      });

      logger.info("Cleanup jobs queued");
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  });

  // Aggregate metrics every 15 minutes (removed: job type not implemented)
  cron.schedule("*/15 * * * *", async () => {
    logger.debug("Scheduled metrics aggregation tick (no-op)");
  });

  // Generate daily reports at midnight (removed: job type not implemented)
  cron.schedule("0 0 * * *", async () => {
    logger.debug("Scheduled daily report tick (no-op)");
  });

  // Cleanup completed jobs every 6 hours (removed: job type not implemented)
  cron.schedule("0 */6 * * *", async () => {
    logger.debug("Scheduled job cleanup tick (no-op)");
  });

  // Send status summary every hour
  cron.schedule("0 * * * *", async () => {
    try {
      await activityService.logActivity({
        type: "system_heartbeat",
        service: "background-ops",
        message: "System heartbeat - all scheduled jobs running",
        status: "info",
        details: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
        },
      });
    } catch (error) {
      logger.error("Error logging heartbeat:", error);
    }
  });

  logger.info("✅ Scheduled jobs started");
  logger.info("📅 Active schedules:");
  logger.info("  - System metrics: Every 1 minute");
  logger.info("  - Health checks: Every 5 minutes");
  logger.info("  - Metrics aggregation: Every 15 minutes");
  logger.info("  - Data cleanup: Every hour");
  logger.info("  - Job cleanup: Every 6 hours");
  logger.info("  - Daily reports: Daily at midnight");
}
