import express from "express";
import { validateApiKey, AuthenticatedRequest } from "../middleware/auth";
import { metricsService } from "../services/metrics";
import os from "os";
import { pool } from "../database";
import { execSync } from "child_process";
import { jobsService } from "../services/jobs";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * GET /metrics - Prometheus metrics endpoint (no auth required for Prometheus)
 */
router.get("/", async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error) {
    logger.error("Failed to generate Prometheus metrics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).send("# Failed to generate metrics\n");
  }
});

// Apply authentication to all other routes
router.use(validateApiKey);

/**
 * GET /v1/metrics/json - Metrics in JSON format
 */
router.get("/json", async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({
    requestId: req.headers["x-request-id"] as string,
  });

  try {
    const rawMetrics = await metricsService.getMetricsJson();

    // Derive summarized KPIs expected by admin dashboard
    const mem = process.memoryUsage();
    const memoryUsagePercent = mem.heapTotal > 0 ? (mem.heapUsed / mem.heapTotal) * 100 : 0;

    // CPU usage from cgroup if available (Fly.io / containers); fall back to loadavg
    let cpuUsagePercent = 0;
    try {
      // cgroup v2 paths
      const cpuStat = execSync("cat /sys/fs/cgroup/cpu.stat").toString();
      // cpu.stat content example: usage_usec 123456\nuser_usec 1111\nsystem_usec 2222
      const lines = Object.fromEntries(
        cpuStat
          .trim()
          .split(/\n/)
          .map((l) => l.trim().split(/\s+/)) as any,
      ) as Record<string, string>;
      const usageUsec = Number(lines["usage_usec"] || 0);
      // Calculate delta usage over short interval to estimate percent
      // Take a quick second sample
      await new Promise((r) => setTimeout(r, 200));
      const cpuStat2 = execSync("cat /sys/fs/cgroup/cpu.stat").toString();
      const lines2 = Object.fromEntries(
        cpuStat2
          .trim()
          .split(/\n/)
          .map((l) => l.trim().split(/\s+/)) as any,
      ) as Record<string, string>;
      const usageUsec2 = Number(lines2["usage_usec"] || 0);
      const deltaUsec = Math.max(0, usageUsec2 - usageUsec);
      // Over 200ms window; 1 CPU = 200ms = 200,000 usec
      const cpus = os.cpus()?.length || 1;
      const windowUsecCapacity = 200_000 * cpus;
      cpuUsagePercent = Math.min(100, Math.max(0, (deltaUsec / windowUsecCapacity) * 100));
    } catch {
      const cpus = os.cpus()?.length || 1;
      const load1 = os.loadavg?.()[0] || 0;
      cpuUsagePercent = Math.min(100, Math.max(0, (load1 / cpus) * 100));
    }

    // DB active connections via pg_stat_activity
    let dbActiveConnections = 0;
    try {
      const r = await pool.query(
        `select count(*)::int as n from pg_stat_activity where state = 'active' and datname = current_database()`,
      );
      dbActiveConnections = Number(r.rows?.[0]?.n || 0);
    } catch {
      // fallback to pool stats
      dbActiveConnections = (pool as any)?.totalCount != null && (pool as any)?.idleCount != null
        ? Math.max(0, (pool as any).totalCount - (pool as any).idleCount)
        : 0;
    }

    // Queue depth via jobs service (falls back to zeros if queue not available)
    let queue = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 } as Record<string, number>;
    try {
      const stats = await jobsService.getJobStats();
      // Map to expected fields
      queue = {
        waiting: (stats as any).pending || 0,
        active: (stats as any).running || 0,
        completed: (stats as any).completed || 0,
        failed: (stats as any).failed || 0,
        delayed: (stats as any).scheduled || 0,
      };
    } catch (e) {
      // keep defaults
    }

    // Disk usage percent from df (root filesystem)
    let diskUsagePercent = 0;
    try {
      const out = execSync("df -k /").toString().split("\n");
      const line = out[1]?.trim()?.split(/\s+/) || [];
      const usedKb = Number(line[2] || 0);
      const totalKb = Number(line[1] || 0);
      if (totalKb > 0) diskUsagePercent = (usedKb / totalKb) * 100;
    } catch {}

    // Active users in the last 5 minutes based on activity_feed table
    let activeUsersLast5m = 0;
    try {
      const r = await pool.query(
        `select count(distinct user_id)::int as n
         from activity_feed
         where user_id is not null and timestamp > now() - interval '5 minutes'`,
      );
      activeUsersLast5m = Number(r.rows?.[0]?.n || 0);
    } catch {}

    const summarized = {
      cpu_usage_percent: Number(cpuUsagePercent.toFixed(1)),
      memory_usage_percent: Number(memoryUsagePercent.toFixed(1)),
      disk_usage_percent: Number(diskUsagePercent.toFixed(1)),
      db_active_connections: dbActiveConnections,
      active_users_last_5m: activeUsersLast5m,
      queue,
    };

    res.json({
      success: true,
      data: {
        metrics: summarized,
        raw: rawMetrics,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    requestLogger.error("Failed to get metrics JSON", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get metrics",
    });
  }
});

/**
 * GET /v1/metrics/health - Health check for metrics subsystem
 */
router.get("/health", async (req: AuthenticatedRequest, res) => {
  try {
    const healthMetrics = metricsService.getHealthMetrics();

    res.json({
      success: true,
      data: healthMetrics,
    });
  } catch (error) {
    logger.error("Failed to get metrics health", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get metrics health",
    });
  }
});

/**
 * GET /v1/metrics/system - Legacy system metrics endpoint
 */
router.get("/system", async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({
    requestId: req.headers["x-request-id"] as string,
  });

  try {
    const systemMetrics = await metricsService.getSystemMetrics();

    res.json({
      success: true,
      data: systemMetrics,
    });
  } catch (error) {
    requestLogger.error("Failed to get system metrics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get system metrics",
    });
  }
});

/**
 * POST /v1/metrics/record - Record a custom metric (legacy support)
 */
router.post("/record", async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({
    requestId: req.headers["x-request-id"] as string,
  });

  try {
    const { name, value, unit, tags } = req.body;

    if (!name || typeof value !== "number" || !unit) {
      return res.status(400).json({
        success: false,
        error: "Bad request",
        message: "Missing required fields: name, value, unit",
      });
    }

    await metricsService.recordMetric({
      name,
      value,
      unit,
      tags: tags || {},
    });

    return res.json({
      success: true,
      data: {
        name,
        value,
        unit,
        recorded: true,
      },
    });
  } catch (error) {
    requestLogger.error("Failed to record metric", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to record metric",
    });
  }
});

export { router as metricsRoutes };
