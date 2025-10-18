import { Router } from "express";
import { logger } from "../utils/logger";
import { validateApiKey } from "../middleware/auth";
import { metricsService } from "../services/metrics";
import { jobsService } from "../services/jobs";

const router = Router();

// Apply API key authentication to all routes
router.use(validateApiKey);

interface AlertThresholds {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  responseTime: number;
  errorRate: number;
  failedJobsCount: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  cpuUsage: 90,
  memoryUsage: 85,
  diskUsage: 85,
  responseTime: 500,
  errorRate: 5,
  failedJobsCount: 10,
};

// Get current alert status
router.get("/status", async (req, res) => {
  try {
    const thresholds: AlertThresholds = {
      ...DEFAULT_THRESHOLDS,
      ...(req.query as any),
    };

    const [metrics, jobStats] = await Promise.all([
      metricsService.getLatestMetrics(),
      jobsService.getJobStats(),
    ]);

    const alerts = [];

    // CPU Usage Alert
    if (metrics.cpu_usage > thresholds.cpuUsage) {
      alerts.push({
        type: "critical",
        metric: "cpu_usage",
        current: metrics.cpu_usage,
        threshold: thresholds.cpuUsage,
        message: `CPU usage is ${metrics.cpu_usage.toFixed(1)}% (threshold: ${thresholds.cpuUsage}%)`,
      });
    }

    // Memory Usage Alert
    if (metrics.memory_usage > thresholds.memoryUsage) {
      alerts.push({
        type: "critical",
        metric: "memory_usage",
        current: metrics.memory_usage,
        threshold: thresholds.memoryUsage,
        message: `Memory usage is ${metrics.memory_usage.toFixed(1)}% (threshold: ${thresholds.memoryUsage}%)`,
      });
    }

    // Disk Usage Alert
    if (metrics.disk_usage > thresholds.diskUsage) {
      alerts.push({
        type: "warning",
        metric: "disk_usage",
        current: metrics.disk_usage,
        threshold: thresholds.diskUsage,
        message: `Disk usage is ${metrics.disk_usage.toFixed(1)}% (threshold: ${thresholds.diskUsage}%)`,
      });
    }

    // Response Time Alert
    if (metrics.response_time > thresholds.responseTime) {
      alerts.push({
        type: "warning",
        metric: "response_time",
        current: metrics.response_time,
        threshold: thresholds.responseTime,
        message: `Average response time is ${metrics.response_time.toFixed(1)}ms (threshold: ${thresholds.responseTime}ms)`,
      });
    }

    // Error Rate Alert
    if (metrics.error_rate > thresholds.errorRate) {
      alerts.push({
        type: "critical",
        metric: "error_rate",
        current: metrics.error_rate,
        threshold: thresholds.errorRate,
        message: `Error rate is ${metrics.error_rate.toFixed(2)}% (threshold: ${thresholds.errorRate}%)`,
      });
    }

    // Failed Jobs Alert
    if (jobStats.failed > thresholds.failedJobsCount) {
      alerts.push({
        type: "warning",
        metric: "failed_jobs",
        current: jobStats.failed,
        threshold: thresholds.failedJobsCount,
        message: `${jobStats.failed} failed jobs in the last 24 hours (threshold: ${thresholds.failedJobsCount})`,
      });
    }

    const status =
      alerts.length === 0
        ? "healthy"
        : alerts.some((alert) => alert.type === "critical")
          ? "critical"
          : "warning";

    res.json({
      status,
      alerts,
      alertCount: alerts.length,
      thresholds,
      metrics: {
        cpu_usage: metrics.cpu_usage,
        memory_usage: metrics.memory_usage,
        disk_usage: metrics.disk_usage,
        response_time: metrics.response_time,
        error_rate: metrics.error_rate,
        failed_jobs: jobStats.failed,
      },
    });

    // Log critical alerts
    if (alerts.some((alert) => alert.type === "critical")) {
      logger.warn("Critical alerts detected", {
        alerts: alerts.filter((a) => a.type === "critical"),
      });
    }
  } catch (error) {
    logger.error("Error checking alert status:", error);
    res.status(500).json({ error: "Failed to check alert status" });
  }
});

// Get alert history (if we want to store alerts)
router.get("/history", async (req, res) => {
  try {
    const { limit = "50", offset = "0" } = req.query;

    // For now, return empty history - could be expanded to store alerts in DB
    res.json({
      alerts: [],
      total: 0,
      message: "Alert history feature not yet implemented",
    });
  } catch (error) {
    logger.error("Error fetching alert history:", error);
    res.status(500).json({ error: "Failed to fetch alert history" });
  }
});

export { router as alertsRoutes };
