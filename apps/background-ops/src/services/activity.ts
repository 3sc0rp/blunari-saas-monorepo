import { logger } from "../utils/logger";
import { db } from "../database";
import { v4 as uuidv4 } from "uuid";

export interface ActivityData {
  type: string;
  service: string;
  message: string;
  status: "success" | "warning" | "error" | "info";
  details?: Record<string, any>;
  user_id?: string;
}

export interface ActivityFilter {
  service?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

class ActivityService {
  async getActivityFeed(filter: ActivityFilter = {}) {
    try {
      let query = `
        SELECT 
          id,
          type,
          service,
          message,
          status,
          details,
          user_id,
          timestamp
        FROM activity_feed
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (filter.service) {
        conditions.push(`service = $${values.length + 1}`);
        values.push(filter.service);
      }

      if (filter.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(filter.status);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      query += ` ORDER BY timestamp DESC`;

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
        activities: result.rows,
        total: result.rowCount,
      };
    } catch (error) {
      logger.error("Error fetching activity feed:", error);
      throw error;
    }
  }

  async logActivity(data: ActivityData) {
    try {
      const id = uuidv4();

      const query = `
        INSERT INTO activity_feed (
          id, type, service, message, status, details, user_id, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

      const result = await db.query(query, [
        id,
        data.type,
        data.service,
        data.message,
        data.status,
        JSON.stringify(data.details || {}),
        data.user_id || null,
      ]);

      logger.info(`Logged activity: ${data.service} - ${data.message}`);

      // Broadcast to WebSocket clients
      await this.broadcastActivity(result.rows[0]);

      return result.rows[0];
    } catch (error) {
      logger.error("Error logging activity:", error);
      throw error;
    }
  }

  async getActivityStats(timeRange: string = "24h") {
    try {
      let interval: string;

      switch (timeRange) {
        case "1h":
          interval = "1 hour";
          break;
        case "6h":
          interval = "6 hours";
          break;
        case "24h":
          interval = "24 hours";
          break;
        case "7d":
          interval = "7 days";
          break;
        default:
          interval = "24 hours";
      }

      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM activity_feed
        WHERE timestamp >= NOW() - INTERVAL $1
        GROUP BY status
      `;

      const result = await db.query(query, [interval]);

      const stats = {
        total: 0,
        success: 0,
        warning: 0,
        error: 0,
        info: 0,
      };

      result.rows.forEach((row) => {
        stats[row.status as keyof typeof stats] = parseInt(row.count);
        stats.total += parseInt(row.count);
      });

      return {
        ...stats,
        time_range: timeRange,
      };
    } catch (error) {
      logger.error("Error fetching activity stats:", error);
      throw error;
    }
  }

  async getActivityByService(serviceName: string, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT 
          id,
          type,
          service,
          message,
          status,
          details,
          user_id,
          timestamp
        FROM activity_feed
        WHERE service = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(query, [serviceName, limit, offset]);

      return {
        activities: result.rows,
        service: serviceName,
      };
    } catch (error) {
      logger.error("Error fetching activity by service:", error);
      throw error;
    }
  }

  async getTopServices(timeRange: string = "24h") {
    try {
      let interval: string;

      switch (timeRange) {
        case "1h":
          interval = "1 hour";
          break;
        case "6h":
          interval = "6 hours";
          break;
        case "24h":
          interval = "24 hours";
          break;
        case "7d":
          interval = "7 days";
          break;
        default:
          interval = "24 hours";
      }

      const query = `
        SELECT 
          service,
          COUNT(*) as activity_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_count
        FROM activity_feed
        WHERE timestamp >= NOW() - INTERVAL $1
        GROUP BY service
        ORDER BY activity_count DESC
        LIMIT 10
      `;

      const result = await db.query(query, [interval]);

      return result.rows;
    } catch (error) {
      logger.error("Error fetching top services:", error);
      throw error;
    }
  }

  private async broadcastActivity(activity: any) {
    try {
      // This would broadcast to WebSocket clients
      // Implementation depends on WebSocket setup
      logger.debug(`Broadcasting activity: ${activity.id}`);
    } catch (error) {
      logger.error("Error broadcasting activity:", error);
    }
  }

  async cleanup(olderThan: Date) {
    try {
      const query = `
        DELETE FROM activity_feed
        WHERE timestamp < $1
      `;

      const result = await db.query(query, [olderThan]);

      logger.info(`Cleaned up ${result.rowCount} old activity records`);

      return result.rowCount;
    } catch (error) {
      logger.error("Error cleaning up activity feed:", error);
      throw error;
    }
  }
}

export const activityService = new ActivityService();
