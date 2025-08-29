import { logger } from '../utils/logger';
import { db } from '../database';

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface MetricFilter {
  names?: string[];
  timeRange?: string;
  tags?: Record<string, string>;
}

class MetricsService {
  async getSystemMetrics() {
    try {
      // Get current system metrics
      const metrics = await db.query(`
        SELECT 
          metric_name as name,
          metric_value as value,
          labels,
          recorded_at
        FROM system_metrics 
        WHERE recorded_at >= NOW() - INTERVAL '1 hour'
        ORDER BY recorded_at DESC
        LIMIT 100
      `);
      
      return {
        metrics: metrics.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error fetching system metrics:', error);
      throw error;
    }
  }

  async getMetricsInRange(start: Date, end: Date, interval = '5m') {
    try {
      const query = `
        SELECT 
          metric_name as name,
          DATE_TRUNC($3, recorded_at) as timestamp,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as sample_count
        FROM system_metrics 
        WHERE recorded_at >= $1 AND recorded_at <= $2
        GROUP BY metric_name, DATE_TRUNC($3, recorded_at)
        ORDER BY timestamp DESC
      `;
      
      const result = await db.query(query, [start, end, interval]);
      
      return {
        metrics: result.rows,
        start,
        end,
        interval
      };
    } catch (error) {
      logger.error('Error fetching metrics range:', error);
      throw error;
    }
  }

  async recordMetric(data: MetricData) {
    try {
      const query = `
        INSERT INTO system_metrics (metric_name, metric_value, labels)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await db.query(query, [
        data.name,
        data.value,
        JSON.stringify({
          unit: data.unit,
          ...(data.tags || {})
        })
      ]);
      
      logger.info(`Recorded metric: ${data.name} = ${data.value} ${data.unit}`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording metric:', error);
      throw error;
    }
  }

  async getAggregatedMetrics(metricName: string, timeRange: string) {
    try {
      let interval: string;
      let duration: string;
      
      switch (timeRange) {
        case '1h':
          interval = '1 minute';
          duration = '1 hour';
          break;
        case '6h':
          interval = '5 minutes';
          duration = '6 hours';
          break;
        case '24h':
          interval = '15 minutes';
          duration = '24 hours';
          break;
        case '7d':
          interval = '1 hour';
          duration = '7 days';
          break;
        default:
          interval = '5 minutes';
          duration = '1 hour';
      }
      
      const query = `
        SELECT 
          DATE_TRUNC($2, recorded_at) as timestamp,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
          COUNT(*) as sample_count
        FROM system_metrics 
        WHERE name = $1 AND recorded_at >= NOW() - INTERVAL $3
        GROUP BY DATE_TRUNC($2, recorded_at)
        ORDER BY timestamp DESC
      `;
      
      const result = await db.query(query, [metricName, interval, duration]);
      
      return {
        metric_name: metricName,
        time_range: timeRange,
        aggregations: result.rows
      };
    } catch (error) {
      logger.error('Error fetching aggregated metrics:', error);
      throw error;
    }
  }

  async getMetricsByTags(tags: Record<string, string>) {
    try {
      const query = `
        SELECT *
        FROM system_metrics 
        WHERE tags @> $1
        AND recorded_at >= NOW() - INTERVAL '1 hour'
        ORDER BY recorded_at DESC
      `;
      
      const result = await db.query(query, [JSON.stringify(tags)]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error fetching metrics by tags:', error);
      throw error;
    }
  }

  async getLatestMetrics() {
    try {
      // Get the most recent metrics for alerting
      const query = `
        WITH latest_metrics AS (
          SELECT DISTINCT ON (metric_name) 
            metric_name,
            metric_value,
            recorded_at
          FROM system_metrics 
          WHERE recorded_at >= NOW() - INTERVAL '10 minutes'
          ORDER BY metric_name, recorded_at DESC
        )
        SELECT 
          metric_name,
          metric_value
        FROM latest_metrics
      `;
      
      const result = await db.query(query);
      
      // Convert to object format for easier access
      const metrics: any = {
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        response_time: 0,
        error_rate: 0
      };
      
      result.rows.forEach(row => {
        metrics[row.metric_name] = parseFloat(row.metric_value);
      });
      
      return metrics;
    } catch (error) {
      logger.error('Error fetching latest metrics:', error);
      // Return safe defaults if metrics are not available
      return {
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        response_time: 0,
        error_rate: 0
      };
    }
  }

  async recordSystemSnapshot() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculate CPU usage as a percentage (simplified)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      
      // Calculate memory usage as percentage of heap limit
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      const metrics = [
        {
          name: 'memory_usage',
          value: memPercent,
          unit: 'percent'
        },
        {
          name: 'cpu_usage', 
          value: cpuPercent * 100, // Convert to percentage
          unit: 'percent'
        },
        {
          name: 'uptime',
          value: process.uptime(),
          unit: 'seconds'
        },
        {
          name: 'heap_used',
          value: memUsage.heapUsed / 1024 / 1024, // MB
          unit: 'mb'
        },
        {
          name: 'heap_total',
          value: memUsage.heapTotal / 1024 / 1024, // MB  
          unit: 'mb'
        }
      ];

      for (const metric of metrics) {
        await this.recordMetric(metric);
      }

      logger.debug('System snapshot recorded', { 
        memoryPercent: memPercent.toFixed(1),
        cpuPercent: (cpuPercent * 100).toFixed(1),
        uptime: process.uptime()
      });
    } catch (error) {
      logger.error('Error recording system snapshot:', error);
      throw error;
    }
  }
}

export const metricsService = new MetricsService();