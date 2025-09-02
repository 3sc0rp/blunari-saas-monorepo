import { Router } from "express";
import { logger } from "../utils/logger";
import { databaseHealth, db } from "../database";
import { validateApiKey } from "../middleware/auth";

const router = Router();

// Basic health check (mounted at /health)
router.get("/", async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV,
    };

    res.json(health);
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Simple database test endpoint
router.get("/db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() as current_time");
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: result.rows[0].current_time,
    });
  } catch (error) {
    logger.error("Database health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Test jobs table specifically
router.get("/health/jobs-table", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*) as job_count FROM background_jobs",
    );
    res.json({
      status: "healthy",
      jobs_table: "accessible",
      job_count: result.rows[0].job_count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Jobs table check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      jobs_table: "error",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed health check with dependencies
router.get("/detailed", async (req, res) => {
  try {
    const [dbHealth] = await Promise.allSettled([databaseHealth()]);

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      dependencies: {
        database: dbHealth.status === "fulfilled" ? "healthy" : "unhealthy",
      },
    };

    // If any dependency is unhealthy, mark overall status as unhealthy
    const isUnhealthy = Object.values(health.dependencies).some(
      (status) => status === "unhealthy",
    );
    if (isUnhealthy) {
      health.status = "unhealthy";
      res.status(503);
    }

    res.json(health);
  } catch (error) {
    logger.error("Detailed health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Readiness probe
router.get("/ready", async (req, res) => {
  try {
    // Check if server is ready to accept traffic
    const ready = {
      status: "ready",
      timestamp: new Date().toISOString(),
    };

    res.json(ready);
  } catch (error) {
    logger.error("Readiness check failed:", error);
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: "Readiness check failed",
    });
  }
});

// Liveness probe
router.get("/live", (req, res) => {
  res.json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

// Auth test endpoint (for debugging)
router.get("/auth-test", validateApiKey, async (req, res) => {
  res.json({
    message: "Authentication successful",
    timestamp: new Date().toISOString(),
    authenticated: true,
  });
});

// Debug endpoint (no auth required)
router.get("/debug", async (req, res) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers["x-api-key"] as string;

  res.json({
    message: "Debug info",
    timestamp: new Date().toISOString(),
    headers: {
      authorization: authHeader ? "present" : "missing",
      "x-api-key": apiKey ? "present" : "missing",
      authHeaderStart: authHeader
        ? authHeader.substring(0, 10) + "..."
        : "none",
      apiKeyStart: apiKey ? apiKey.substring(0, 10) + "..." : "none",
    },
    expectedKeyStart: process.env.X_API_KEY
      ? process.env.X_API_KEY.substring(0, 10) + "..."
      : "not set",
  });
});

// Database schema check endpoint (no auth required for debugging)
router.get("/schema-check", async (req, res) => {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
    };

    // Check if background_jobs table exists and its columns
    try {
      const jobsTableInfo = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'background_jobs' 
        ORDER BY ordinal_position
      `);
      results.background_jobs = {
        exists: jobsTableInfo.rows.length > 0,
        columns: jobsTableInfo.rows,
      };
    } catch (error) {
      results.background_jobs = { error: (error as Error).message };
    }

    // Check if system_metrics table exists and its columns
    try {
      const metricsTableInfo = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'system_metrics' 
        ORDER BY ordinal_position
      `);
      results.system_metrics = {
        exists: metricsTableInfo.rows.length > 0,
        columns: metricsTableInfo.rows,
      };
    } catch (error) {
      results.system_metrics = { error: (error as Error).message };
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: "Schema check failed",
      message: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as healthRoutes };
