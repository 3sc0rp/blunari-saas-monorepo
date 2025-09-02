import { Router } from "express";
import { z } from "zod";
import { logger } from "../utils/logger";
import { validateApiKey } from "../middleware/auth";
import { schedulerService } from "../services/scheduler";

const router = Router();

// Apply API key authentication to all routes
router.use(validateApiKey);

// Create job schedule schema
const createScheduleSchema = z.object({
  name: z.string().min(1),
  jobType: z.string().min(1),
  schedule: z.string().min(1), // Cron expression
  payload: z.record(z.any()).optional(),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  maxRuns: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

const updateScheduleSchema = createScheduleSchema.partial();

// Get all job schedules
router.get("/", async (req, res) => {
  try {
    const { enabled, tag, limit = "50", offset = "0" } = req.query;

    const schedules = await schedulerService.getSchedules({
      enabled:
        enabled === "true" ? true : enabled === "false" ? false : undefined,
      tag: tag as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json(schedules);
  } catch (error) {
    logger.error("Error fetching schedules:", error);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

// Get schedule by ID
router.get("/:scheduleId", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await schedulerService.getScheduleById(scheduleId);

    if (!schedule) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    res.json(schedule);
  } catch (error) {
    logger.error("Error fetching schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// Create a new schedule
router.post("/", async (req, res) => {
  try {
    const scheduleData = createScheduleSchema.parse(req.body);
    const schedule = await schedulerService.createSchedule(scheduleData);

    logger.info(`Created schedule: ${scheduleData.name} (${schedule.id})`);
    res.status(201).json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Invalid schedule data", details: error.errors });
      return;
    }
    logger.error("Error creating schedule:", error);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

// Update a schedule
router.put("/:scheduleId", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updateData = updateScheduleSchema.parse(req.body);

    const schedule = await schedulerService.updateSchedule(
      scheduleId,
      updateData,
    );

    if (!schedule) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    logger.info(`Updated schedule: ${scheduleId}`);
    res.json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Invalid schedule data", details: error.errors });
      return;
    }
    logger.error("Error updating schedule:", error);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// Delete a schedule
router.delete("/:scheduleId", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const success = await schedulerService.deleteSchedule(scheduleId);

    if (!success) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    logger.info(`Deleted schedule: ${scheduleId}`);
    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    logger.error("Error deleting schedule:", error);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

// Enable/disable a schedule
router.patch("/:scheduleId/toggle", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { enabled } = req.body;

    const schedule = await schedulerService.toggleSchedule(scheduleId, enabled);

    if (!schedule) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    logger.info(`${enabled ? "Enabled" : "Disabled"} schedule: ${scheduleId}`);
    res.json(schedule);
  } catch (error) {
    logger.error("Error toggling schedule:", error);
    res.status(500).json({ error: "Failed to toggle schedule" });
  }
});

// Trigger a schedule manually
router.post("/:scheduleId/trigger", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const job = await schedulerService.triggerSchedule(scheduleId);

    if (!job) {
      res
        .status(404)
        .json({ error: "Schedule not found or could not be triggered" });
      return;
    }

    logger.info(`Manually triggered schedule: ${scheduleId}`);
    res.json({ message: "Schedule triggered successfully", job });
  } catch (error) {
    logger.error("Error triggering schedule:", error);
    res.status(500).json({ error: "Failed to trigger schedule" });
  }
});

// Get schedule execution history
router.get("/:scheduleId/history", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    const history = await schedulerService.getScheduleHistory(scheduleId, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json(history);
  } catch (error) {
    logger.error("Error fetching schedule history:", error);
    res.status(500).json({ error: "Failed to fetch schedule history" });
  }
});

// Validate cron expression
router.post("/validate-cron", async (req, res) => {
  try {
    const { expression } = req.body;

    if (!expression) {
      res.status(400).json({ error: "Cron expression is required" });
      return;
    }

    const validation =
      await schedulerService.validateCronExpression(expression);
    res.json(validation);
  } catch (error) {
    logger.error("Error validating cron expression:", error);
    res.status(500).json({ error: "Failed to validate cron expression" });
  }
});

export { router as schedulerRoutes };
