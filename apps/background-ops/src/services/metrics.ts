import client from "prom-client";
import { logger } from "../utils/logger";

// Create a Registry to hold all metrics
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics for background-ops service

// Job-related metrics
const jobEnqueueLatency = new client.Histogram({
  name: "bg_ops_job_enqueue_duration_ms",
  help: "Duration of job enqueue operations in milliseconds",
  labelNames: ["job_type", "tenant_id"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

const jobRunLatency = new client.Histogram({
  name: "bg_ops_job_run_duration_ms",
  help: "Duration of job execution in milliseconds",
  labelNames: ["job_type", "status"],
  buckets: [100, 500, 1000, 5000, 10000, 30000, 60000, 300000],
});

const jobsTotal = new client.Counter({
  name: "bg_ops_jobs_total",
  help: "Total number of jobs processed",
  labelNames: ["job_type", "status", "tenant_id"],
});

const jobsActive = new client.Gauge({
  name: "bg_ops_jobs_active",
  help: "Number of currently active jobs",
  labelNames: ["job_type"],
});

const jobQueueSize = new client.Gauge({
  name: "bg_ops_job_queue_size",
  help: "Number of jobs waiting in queue",
  labelNames: ["status"],
});

// Hold expiration sweeper metrics
const holdSweeperLag = new client.Histogram({
  name: "bg_ops_hold_sweeper_lag_ms",
  help: "Lag time for hold expiration sweeper in milliseconds",
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
});

const holdsExpired = new client.Counter({
  name: "bg_ops_holds_expired_total",
  help: "Total number of holds expired",
});

// Email provider metrics
const emailSendLatency = new client.Histogram({
  name: "bg_ops_email_send_duration_ms",
  help: "Duration of email send operations in milliseconds",
  labelNames: ["provider", "template"],
  buckets: [100, 250, 500, 1000, 2000, 5000, 10000],
});

const emailsTotal = new client.Counter({
  name: "bg_ops_emails_total",
  help: "Total number of emails sent",
  labelNames: ["provider", "template", "status"],
});

// SMS metrics (optional)
const smsSendLatency = new client.Histogram({
  name: "bg_ops_sms_send_duration_ms",
  help: "Duration of SMS send operations in milliseconds",
  buckets: [100, 250, 500, 1000, 2000, 5000],
});

const smsTotal = new client.Counter({
  name: "bg_ops_sms_total",
  help: "Total number of SMS messages sent",
  labelNames: ["status"],
});

// DLQ metrics
const dlqSize = new client.Gauge({
  name: "bg_ops_dlq_size",
  help: "Number of messages in dead letter queue",
  labelNames: ["job_type"],
});

// API metrics
const httpRequestsTotal = new client.Counter({
  name: "bg_ops_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code", "tenant_id"],
});

const httpRequestDuration = new client.Histogram({
  name: "bg_ops_http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

// Authentication metrics
const authenticationAttempts = new client.Counter({
  name: "bg_ops_auth_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["result", "reason"],
});

const idempotencyHits = new client.Counter({
  name: "bg_ops_idempotency_hits_total",
  help: "Total number of idempotency cache hits",
  labelNames: ["tenant_id"],
});

// Register all custom metrics
register.registerMetric(jobEnqueueLatency);
register.registerMetric(jobRunLatency);
register.registerMetric(jobsTotal);
register.registerMetric(jobsActive);
register.registerMetric(jobQueueSize);
register.registerMetric(holdSweeperLag);
register.registerMetric(holdsExpired);
register.registerMetric(emailSendLatency);
register.registerMetric(emailsTotal);
register.registerMetric(smsSendLatency);
register.registerMetric(smsTotal);
register.registerMetric(dlqSize);
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(authenticationAttempts);
register.registerMetric(idempotencyHits);

class MetricsService {
  // Job metrics
  recordJobEnqueue(
    jobType: string,
    tenantId: string,
    durationMs: number,
  ): void {
    jobEnqueueLatency.observe(
      { job_type: jobType, tenant_id: tenantId },
      durationMs,
    );
  }

  recordJobRun(jobType: string, status: string, durationMs: number): void {
    jobRunLatency.observe({ job_type: jobType, status }, durationMs);
  }

  incrementJobCounter(jobType: string, status: string, tenantId: string): void {
    jobsTotal.inc({ job_type: jobType, status, tenant_id: tenantId });
  }

  setActiveJobs(jobType: string, count: number): void {
    jobsActive.set({ job_type: jobType }, count);
  }

  setQueueSize(status: string, size: number): void {
    jobQueueSize.set({ status }, size);
  }

  // Hold expiration metrics
  recordHoldSweeperLag(lagMs: number): void {
    holdSweeperLag.observe(lagMs);
  }

  incrementHoldsExpired(count: number = 1): void {
    holdsExpired.inc(count);
  }

  // Email metrics
  recordEmailSend(
    provider: string,
    template: string,
    durationMs: number,
    status: string,
  ): void {
    emailSendLatency.observe({ provider, template }, durationMs);
    emailsTotal.inc({ provider, template, status });
  }

  // SMS metrics
  recordSmsSend(durationMs: number, status: string): void {
    smsSendLatency.observe(durationMs);
    smsTotal.inc({ status });
  }

  // DLQ metrics
  setDlqSize(jobType: string, size: number): void {
    dlqSize.set({ job_type: jobType }, size);
  }

  // HTTP metrics
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    tenantId: string,
    durationMs: number,
  ): void {
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      tenant_id: tenantId,
    });
    httpRequestDuration.observe({ method, route }, durationMs);
  }

  // Authentication metrics
  recordAuthAttempt(result: "success" | "failure", reason?: string): void {
    authenticationAttempts.inc({ result, reason: reason || "none" });
  }

  recordIdempotencyHit(tenantId: string): void {
    idempotencyHits.inc({ tenant_id: tenantId });
  }

  // Get metrics for Prometheus
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Get metrics as JSON for internal use
  async getMetricsJson(): Promise<any> {
    const metrics = await register.getMetricsAsJSON();
    return metrics;
  }

  // Update queue metrics periodically
  async updateQueueMetrics(queueStats: any): Promise<void> {
    try {
      this.setQueueSize("waiting", queueStats.waiting || 0);
      this.setQueueSize("active", queueStats.active || 0);
      this.setQueueSize("completed", queueStats.completed || 0);
      this.setQueueSize("failed", queueStats.failed || 0);
      this.setQueueSize("delayed", queueStats.delayed || 0);
    } catch (error) {
      logger.error("Failed to update queue metrics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Health check metrics
  getHealthMetrics(): { healthy: boolean; checks: any } {
    try {
      return {
        healthy: true,
        checks: {
          prometheus_registry: register ? "ok" : "error",
          metrics_count: "available",
        },
      };
    } catch (error) {
      return {
        healthy: false,
        checks: {
          prometheus_registry: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  // Legacy support for existing interface
  async getSystemMetrics() {
    const metrics = await this.getMetricsJson();
    return {
      metrics: metrics.map((m: any) => ({
        name: m.name,
        value: m.values?.[0]?.value || 0,
        labels: m.values?.[0]?.labels || {},
        recorded_at: new Date(),
      })),
      timestamp: new Date().toISOString(),
    };
  }

  async recordMetric(data: {
    name: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  }) {
    // For legacy compatibility - records as a generic counter
    const counter = new client.Counter({
      name: `bg_ops_legacy_${data.name}`,
      help: `Legacy metric: ${data.name}`,
      labelNames: ["unit", ...(data.tags ? Object.keys(data.tags) : [])],
    });

    register.registerMetric(counter);
    counter.inc({ unit: data.unit, ...(data.tags || {}) }, data.value);

    logger.info(
      `Recorded legacy metric: ${data.name} = ${data.value} ${data.unit}`,
    );
  }

  async recordSystemSnapshot() {
    try {
      const memUsage = process.memoryUsage();

      // These will be captured by default metrics, but we can add custom ones too
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      await this.recordMetric({
        name: "memory_usage_percent",
        value: memPercent,
        unit: "percent",
      });

      logger.debug("System snapshot recorded", {
        memoryPercent: memPercent.toFixed(1),
        uptime: process.uptime(),
      });
    } catch (error) {
      logger.error("Error recording system snapshot:", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Methods required by existing code
  async getLatestMetrics(): Promise<any> {
    const metrics = await this.getMetricsJson();
    return {
      data: metrics.map((m: any) => ({
        name: m.name,
        value: m.values?.[0]?.value || 0,
        labels: m.values?.[0]?.labels || {},
        timestamp: new Date().toISOString(),
      })),
      timestamp: new Date().toISOString(),
    };
  }

  async getAggregatedMetrics(
    metricName: string,
    timeRange: string,
  ): Promise<any> {
    // For Prometheus, we return the current metric values
    // In a real implementation, you'd query your TSDB
    const metrics = await this.getMetricsJson();
    const metric = metrics.find((m: any) => m.name === metricName);

    if (!metric) {
      return { aggregations: [] };
    }

    return {
      aggregations:
        metric.values?.map((v: any) => ({
          sample_count: 1,
          avg_value: v.value || 0,
          sum_value: v.value || 0,
          labels: v.labels || {},
        })) || [],
    };
  }

  async getMetricsByTags(tags: Record<string, string>): Promise<any> {
    const metrics = await this.getMetricsJson();
    return {
      aggregations: metrics
        .filter((m: any) => {
          return m.values?.some((v: any) => {
            const labels = v.labels || {};
            return Object.entries(tags).every(
              ([key, value]) => labels[key] === value,
            );
          });
        })
        .map((m: any) => ({
          name: m.name,
          sample_count: m.values?.length || 0,
          avg_value: m.values?.[0]?.value || 0,
        })),
    };
  }

  // Reset metrics (for testing)
  reset(): void {
    register.clear();
  }
}

export const metricsService = new MetricsService();
export { register };

// Legacy exports for compatibility
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
