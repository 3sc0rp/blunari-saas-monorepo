import { logger } from "../utils/logger";
import { db } from "../database";
import { v4 as uuidv4 } from "uuid";
import { jobsService } from "./jobs";
import * as cron from "node-cron";

export interface ScheduleData {
  name: string;
  jobType: string;
  schedule: string; // Cron expression
  payload?: Record<string, any>;
  timezone?: string;
  enabled?: boolean;
  maxRuns?: number;
  tags?: string[];
}

export interface ScheduleFilter {
  enabled?: boolean;
  tag?: string;
  limit?: number;
  offset?: number;
}

interface ActiveSchedule {
  id: string;
  task: any;
  schedule: any;
}

class SchedulerService {
  private activeSchedules = new Map<string, ActiveSchedule>();

  async initializeScheduler() {
    try {
      // Create job_schedules table if it doesn't exist
      await this.ensureScheduleTable();

      // Load and start all enabled schedules
      const schedules = await this.getSchedules({ enabled: true });

      for (const schedule of schedules.schedules) {
        await this.startSchedule(schedule);
      }

      logger.info(
        `✅ Scheduler initialized with ${schedules.schedules.length} active schedules`,
      );
    } catch (error) {
      logger.error("Failed to initialize scheduler:", error);
    }
  }

  private async ensureScheduleTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS job_schedules (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        job_type VARCHAR(100) NOT NULL,
        schedule_expression VARCHAR(100) NOT NULL,
        payload JSONB,
        timezone VARCHAR(50) DEFAULT 'UTC',
        enabled BOOLEAN DEFAULT true,
        max_runs INTEGER,
        current_runs INTEGER DEFAULT 0,
        tags TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_run_at TIMESTAMP WITH TIME ZONE,
        next_run_at TIMESTAMP WITH TIME ZONE
      )
    `;

    await db.query(createTableQuery);
  }

  async getSchedules(filter: ScheduleFilter = {}) {
    try {
      let query = `
        SELECT 
          id,
          name,
          job_type,
          schedule_expression,
          payload,
          timezone,
          enabled,
          max_runs,
          current_runs,
          tags,
          created_at,
          updated_at,
          last_run_at,
          next_run_at
        FROM job_schedules
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (filter.enabled !== undefined) {
        conditions.push(`enabled = $${values.length + 1}`);
        values.push(filter.enabled);
      }

      if (filter.tag) {
        conditions.push(`$${values.length + 1} = ANY(tags)`);
        values.push(filter.tag);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      query += ` ORDER BY created_at DESC`;

      if (filter.limit) {
        query += ` LIMIT $${values.length + 1}`;
        values.push(filter.limit);
      }

      if (filter.offset) {
        query += ` OFFSET $${values.length + 1}`;
        values.push(filter.offset);
      }

      const result = await db.query(query, values);

      return {
        schedules: result.rows,
        total: result.rowCount,
      };
    } catch (error) {
      logger.error("Error fetching schedules:", error);
      throw error;
    }
  }

  async getScheduleById(scheduleId: string) {
    try {
      const query = `
        SELECT *
        FROM job_schedules
        WHERE id = $1
      `;

      const result = await db.query(query, [scheduleId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Error fetching schedule by ID:", error);
      throw error;
    }
  }

  async createSchedule(scheduleData: ScheduleData) {
    try {
      // Validate cron expression
      if (!cron.validate(scheduleData.schedule)) {
        throw new Error("Invalid cron expression");
      }

      const id = uuidv4();
      const nextRun = this.calculateNextRun(
        scheduleData.schedule,
        scheduleData.timezone,
      );

      const query = `
        INSERT INTO job_schedules (
          id, name, job_type, schedule_expression, payload, timezone, 
          enabled, max_runs, tags, next_run_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await db.query(query, [
        id,
        scheduleData.name,
        scheduleData.jobType,
        scheduleData.schedule,
        JSON.stringify(scheduleData.payload || {}),
        scheduleData.timezone || "UTC",
        scheduleData.enabled !== false,
        scheduleData.maxRuns,
        scheduleData.tags || [],
        nextRun,
      ]);

      const schedule = result.rows[0];

      // Start the schedule if enabled
      if (schedule.enabled) {
        await this.startSchedule(schedule);
      }

      logger.info(`Created schedule: ${scheduleData.name} (${id})`);
      return schedule;
    } catch (error) {
      logger.error("Error creating schedule:", error);
      throw error;
    }
  }

  async updateSchedule(scheduleId: string, updateData: Partial<ScheduleData>) {
    try {
      // Stop existing schedule
      this.stopSchedule(scheduleId);

      const updates: string[] = [];
      const values: any[] = [];

      if (updateData.name) {
        updates.push(`name = $${values.length + 1}`);
        values.push(updateData.name);
      }

      if (updateData.jobType) {
        updates.push(`job_type = $${values.length + 1}`);
        values.push(updateData.jobType);
      }

      if (updateData.schedule) {
        if (!cron.validate(updateData.schedule)) {
          throw new Error("Invalid cron expression");
        }
        updates.push(`schedule_expression = $${values.length + 1}`);
        values.push(updateData.schedule);

        const nextRun = this.calculateNextRun(
          updateData.schedule,
          updateData.timezone,
        );
        updates.push(`next_run_at = $${values.length + 1}`);
        values.push(nextRun);
      }

      if (updateData.payload !== undefined) {
        updates.push(`payload = $${values.length + 1}`);
        values.push(JSON.stringify(updateData.payload));
      }

      if (updateData.timezone) {
        updates.push(`timezone = $${values.length + 1}`);
        values.push(updateData.timezone);
      }

      if (updateData.enabled !== undefined) {
        updates.push(`enabled = $${values.length + 1}`);
        values.push(updateData.enabled);
      }

      if (updateData.maxRuns !== undefined) {
        updates.push(`max_runs = $${values.length + 1}`);
        values.push(updateData.maxRuns);
      }

      if (updateData.tags) {
        updates.push(`tags = $${values.length + 1}`);
        values.push(updateData.tags);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE job_schedules
        SET ${updates.join(", ")}
        WHERE id = $${values.length + 1}
        RETURNING *
      `;

      values.push(scheduleId);

      const result = await db.query(query, values);
      const schedule = result.rows[0];

      if (schedule && schedule.enabled) {
        await this.startSchedule(schedule);
      }

      return schedule;
    } catch (error) {
      logger.error("Error updating schedule:", error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId: string) {
    try {
      // Stop the schedule
      this.stopSchedule(scheduleId);

      const query = `
        DELETE FROM job_schedules
        WHERE id = $1
        RETURNING id
      `;

      const result = await db.query(query, [scheduleId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error("Error deleting schedule:", error);
      throw error;
    }
  }

  async toggleSchedule(scheduleId: string, enabled: boolean) {
    try {
      const query = `
        UPDATE job_schedules
        SET enabled = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(query, [scheduleId, enabled]);
      const schedule = result.rows[0];

      if (schedule) {
        if (enabled) {
          await this.startSchedule(schedule);
        } else {
          this.stopSchedule(scheduleId);
        }
      }

      return schedule;
    } catch (error) {
      logger.error("Error toggling schedule:", error);
      throw error;
    }
  }

  async triggerSchedule(scheduleId: string) {
    try {
      const schedule = await this.getScheduleById(scheduleId);

      if (!schedule) {
        return null;
      }

      // Create and execute the job
      const job = await jobsService.createJob({
        type: schedule.job_type,
        data: schedule.payload,
        priority: 5,
      });

      // Update last run time and increment run count
      await db.query(
        "UPDATE job_schedules SET last_run_at = CURRENT_TIMESTAMP, current_runs = current_runs + 1 WHERE id = $1",
        [scheduleId],
      );

      logger.info(
        `Manually triggered schedule ${scheduleId}, created job ${job.id}`,
      );
      return job;
    } catch (error) {
      logger.error("Error triggering schedule:", error);
      throw error;
    }
  }

  async getScheduleHistory(
    scheduleId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    try {
      // Get jobs created by this schedule
      const query = `
        SELECT 
          bj.*
        FROM background_jobs bj
        WHERE bj.job_type = (
          SELECT job_type FROM job_schedules WHERE id = $1
        )
        ORDER BY bj.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(query, [
        scheduleId,
        options.limit || 50,
        options.offset || 0,
      ]);

      return {
        jobs: result.rows,
        total: result.rowCount,
      };
    } catch (error) {
      logger.error("Error fetching schedule history:", error);
      throw error;
    }
  }

  async validateCronExpression(expression: string) {
    try {
      const isValid = cron.validate(expression);

      if (!isValid) {
        return {
          valid: false,
          error: "Invalid cron expression format",
        };
      }

      // Calculate next few run times
      const nextRuns = [];
      const now = new Date();
      let current = new Date(now.getTime() + 60000); // Start from next minute

      for (let i = 0; i < 5; i++) {
        try {
          const nextRun = this.calculateNextRun(expression, "UTC", current);
          nextRuns.push(nextRun.toISOString());
          current = new Date(nextRun.getTime() + 60000);
        } catch {
          break;
        }
      }

      return {
        valid: true,
        nextRuns,
        description: this.describeCronExpression(expression),
      };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error validating cron expression",
      };
    }
  }

  private async startSchedule(schedule: any) {
    try {
      const task = cron.schedule(
        schedule.schedule_expression,
        async () => {
          await this.executeSchedule(schedule.id);
        },
        {
          scheduled: false,
          timezone: schedule.timezone,
        },
      );

      task.start();

      this.activeSchedules.set(schedule.id, {
        id: schedule.id,
        task,
        schedule,
      });

      logger.debug(`Started schedule: ${schedule.name} (${schedule.id})`);
    } catch (error) {
      logger.error(`Error starting schedule ${schedule.id}:`, error);
    }
  }

  private stopSchedule(scheduleId: string) {
    const activeSchedule = this.activeSchedules.get(scheduleId);

    if (activeSchedule) {
      activeSchedule.task.stop();
      this.activeSchedules.delete(scheduleId);
      logger.debug(`Stopped schedule: ${scheduleId}`);
    }
  }

  private async executeSchedule(scheduleId: string) {
    try {
      const schedule = await this.getScheduleById(scheduleId);

      if (!schedule || !schedule.enabled) {
        return;
      }

      // Check if max runs reached
      if (schedule.max_runs && schedule.current_runs >= schedule.max_runs) {
        await this.toggleSchedule(scheduleId, false);
        logger.info(`Schedule ${scheduleId} disabled - max runs reached`);
        return;
      }

      // Create and execute the job
      const job = await jobsService.createJob({
        type: schedule.job_type,
        data: schedule.payload,
        priority: 5,
      });

      // Update last run time and increment run count
      const nextRun = this.calculateNextRun(
        schedule.schedule_expression,
        schedule.timezone,
      );

      await db.query(
        "UPDATE job_schedules SET last_run_at = CURRENT_TIMESTAMP, current_runs = current_runs + 1, next_run_at = $2 WHERE id = $1",
        [scheduleId, nextRun],
      );

      logger.info(`Executed schedule ${scheduleId}, created job ${job.id}`);
    } catch (error) {
      logger.error(`Error executing schedule ${scheduleId}:`, error);
    }
  }

  private calculateNextRun(
    cronExpression: string,
    timezone: string = "UTC",
    from?: Date,
  ): Date {
    // Use node-cron's built-in scheduling to get next execution time
    const now = from || new Date();

    try {
      // For a simple implementation, we'll calculate the next minute/hour based on common patterns
      const parts = cronExpression.split(" ");
      if (parts.length !== 5) {
        throw new Error("Invalid cron expression format");
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      const nextRun = new Date(now);

      // Simple calculations for common patterns
      if (cronExpression === "0 * * * *") {
        // Every hour
        nextRun.setMinutes(0, 0, 0);
        nextRun.setHours(nextRun.getHours() + 1);
      } else if (cronExpression === "0 0 * * *") {
        // Daily at midnight
        nextRun.setHours(24, 0, 0, 0);
      } else if (cronExpression === "*/5 * * * *") {
        // Every 5 minutes
        const minutes = Math.ceil(nextRun.getMinutes() / 5) * 5;
        nextRun.setMinutes(minutes, 0, 0);
        if (minutes >= 60) {
          nextRun.setHours(nextRun.getHours() + 1);
          nextRun.setMinutes(0, 0, 0);
        }
      } else {
        // Default: next minute
        nextRun.setMinutes(nextRun.getMinutes() + 1, 0, 0);
      }

      return nextRun;
    } catch (error) {
      // Fallback: next minute
      const nextRun = new Date(now);
      nextRun.setMinutes(nextRun.getMinutes() + 1, 0, 0);
      return nextRun;
    }
  }

  private describeCronExpression(expression: string): string {
    // Basic cron description - could be enhanced with a proper parser
    const parts = expression.split(" ");
    if (parts.length !== 5) return "Custom schedule";

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    if (expression === "0 * * * *") return "Every hour";
    if (expression === "0 0 * * *") return "Daily at midnight";
    if (expression === "0 0 * * 0") return "Weekly on Sunday";
    if (expression === "0 0 1 * *") return "Monthly on the 1st";

    return `Custom: ${expression}`;
  }
}

export const schedulerService = new SchedulerService();
