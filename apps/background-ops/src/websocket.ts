import { WebSocketServer } from "ws";
import { logger } from "./utils/logger";
import { metricsService } from "./services/metrics";
import { servicesService } from "./services/services";
import { activityService } from "./services/activity";
import { jobsService } from "./services/jobs";

interface WebSocketClient {
  id: string;
  ws: any;
  subscriptions: Set<string>;
  filters?: {
    jobStatus?: string;
    jobType?: string;
  };
}

const clients = new Map<string, WebSocketClient>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    const clientId = generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
    };

    clients.set(clientId, client);
    logger.info(`WebSocket client connected: ${clientId}`);

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connection",
        data: { clientId, timestamp: new Date().toISOString() },
      }),
    );

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        await handleWebSocketMessage(client, data);
      } catch (error) {
        logger.error("WebSocket message error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Invalid message format" },
          }),
        );
      }
    });

    ws.on("close", () => {
      clients.delete(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on("error", (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  // Start broadcasting updates
  startBroadcastInterval();

  logger.info("✅ WebSocket server setup complete");
}

async function handleWebSocketMessage(client: WebSocketClient, data: any) {
  const { type, payload } = data;

  switch (type) {
    case "subscribe":
      handleSubscription(client, payload);
      break;

    case "unsubscribe":
      handleUnsubscription(client, payload);
      break;

    case "ping":
      client.ws.send(
        JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }),
      );
      break;

    case "get_metrics":
      await sendMetrics(client);
      break;

    case "get_services":
      await sendServices(client);
      break;

    case "get_activity":
      await sendActivity(client);
      break;

    case "get_jobs":
      await sendJobs(client, payload);
      break;

    case "set_filters":
      handleFilters(client, payload);
      break;

    default:
      client.ws.send(
        JSON.stringify({
          type: "error",
          data: { message: `Unknown message type: ${type}` },
        }),
      );
  }
}

function handleSubscription(client: WebSocketClient, payload: any) {
  const { channels } = payload;

  if (Array.isArray(channels)) {
    channels.forEach((channel) => {
      client.subscriptions.add(channel);
      logger.debug(`Client ${client.id} subscribed to ${channel}`);
    });
  }

  client.ws.send(
    JSON.stringify({
      type: "subscription_confirmed",
      data: { subscriptions: Array.from(client.subscriptions) },
    }),
  );
}

function handleUnsubscription(client: WebSocketClient, payload: any) {
  const { channels } = payload;

  if (Array.isArray(channels)) {
    channels.forEach((channel) => {
      client.subscriptions.delete(channel);
      logger.debug(`Client ${client.id} unsubscribed from ${channel}`);
    });
  }

  client.ws.send(
    JSON.stringify({
      type: "unsubscription_confirmed",
      data: { subscriptions: Array.from(client.subscriptions) },
    }),
  );
}

async function sendMetrics(client: WebSocketClient) {
  try {
    const metrics = await metricsService.getSystemMetrics();
    client.ws.send(
      JSON.stringify({
        type: "metrics_data",
        data: metrics,
      }),
    );
  } catch (error) {
    logger.error("Error sending metrics:", error);
  }
}

async function sendServices(client: WebSocketClient) {
  try {
    const services = await servicesService.getAllServices();
    client.ws.send(
      JSON.stringify({
        type: "services_data",
        data: services,
      }),
    );
  } catch (error) {
    logger.error("Error sending services:", error);
  }
}

async function sendJobs(client: WebSocketClient, payload?: any) {
  try {
    const filters = payload || client.filters || {};
    const jobs = await jobsService.getJobs({
      status: filters.jobStatus,
      type: filters.jobType,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    client.ws.send(
      JSON.stringify({
        type: "jobs_data",
        data: jobs,
      }),
    );
  } catch (error) {
    logger.error("Error sending jobs:", error);
  }
}

function handleFilters(client: WebSocketClient, payload: any) {
  client.filters = {
    jobStatus: payload.jobStatus,
    jobType: payload.jobType,
    ...payload,
  };

  client.ws.send(
    JSON.stringify({
      type: "filters_updated",
      data: { filters: client.filters },
    }),
  );

  logger.debug(`Client ${client.id} updated filters:`, client.filters);
}

async function sendActivity(client: WebSocketClient) {
  try {
    const activity = await activityService.getActivityFeed({ limit: 50 });
    client.ws.send(
      JSON.stringify({
        type: "activity_data",
        data: activity,
      }),
    );
  } catch (error) {
    logger.error("Error sending activity:", error);
  }
}

function startBroadcastInterval() {
  // Broadcast updates every 30 seconds
  setInterval(async () => {
    await broadcastToSubscribers("metrics", async () => {
      return await metricsService.getSystemMetrics();
    });

    await broadcastToSubscribers("services", async () => {
      return await servicesService.getAllServices();
    });

    await broadcastToSubscribers("activity", async () => {
      return await activityService.getActivityFeed({ limit: 10 });
    });

    await broadcastToSubscribers("jobs", async () => {
      return await jobsService.getJobs({ limit: 50 });
    });

    await broadcastToSubscribers("alerts", async () => {
      // Import alerts service dynamically to avoid circular deps
      const { metricsService } = await import("./services/metrics");
      const { jobsService } = await import("./services/jobs");

      const [metrics, jobStats] = await Promise.all([
        metricsService.getLatestMetrics(),
        jobsService.getJobStats(),
      ]);

      const alerts = [];
      const DEFAULT_THRESHOLDS = {
        cpuUsage: 90,
        memoryUsage: 85,
        diskUsage: 85,
        responseTime: 500,
        errorRate: 5,
        failedJobsCount: 10,
      };

      // CPU Usage Alert
      if (metrics.cpu_usage > DEFAULT_THRESHOLDS.cpuUsage) {
        alerts.push({
          type: "critical",
          metric: "cpu_usage",
          current: metrics.cpu_usage,
          threshold: DEFAULT_THRESHOLDS.cpuUsage,
          message: `CPU usage is ${metrics.cpu_usage.toFixed(1)}% (threshold: ${DEFAULT_THRESHOLDS.cpuUsage}%)`,
        });
      }

      // Memory Usage Alert
      if (metrics.memory_usage > DEFAULT_THRESHOLDS.memoryUsage) {
        alerts.push({
          type: "critical",
          metric: "memory_usage",
          current: metrics.memory_usage,
          threshold: DEFAULT_THRESHOLDS.memoryUsage,
          message: `Memory usage is ${metrics.memory_usage.toFixed(1)}% (threshold: ${DEFAULT_THRESHOLDS.memoryUsage}%)`,
        });
      }

      // Failed Jobs Alert
      if (jobStats.failed > DEFAULT_THRESHOLDS.failedJobsCount) {
        alerts.push({
          type: "warning",
          metric: "failed_jobs",
          current: jobStats.failed,
          threshold: DEFAULT_THRESHOLDS.failedJobsCount,
          message: `${jobStats.failed} failed jobs in the last 24 hours (threshold: ${DEFAULT_THRESHOLDS.failedJobsCount})`,
        });
      }

      const status =
        alerts.length === 0
          ? "healthy"
          : alerts.some((alert) => alert.type === "critical")
            ? "critical"
            : "warning";

      return {
        status,
        alerts,
        alertCount: alerts.length,
        metrics: {
          cpu_usage: metrics.cpu_usage,
          memory_usage: metrics.memory_usage,
          disk_usage: metrics.disk_usage,
          response_time: metrics.response_time,
          error_rate: metrics.error_rate,
          failed_jobs: jobStats.failed,
        },
      };
    });
  }, 30000);
}

async function broadcastToSubscribers(
  channel: string,
  dataProvider: () => Promise<any>,
) {
  try {
    const subscribedClients = Array.from(clients.values()).filter((client) =>
      client.subscriptions.has(channel),
    );

    if (subscribedClients.length === 0) return;

    const data = await dataProvider();
    const message = JSON.stringify({
      type: `${channel}_update`,
      data,
      timestamp: new Date().toISOString(),
    });

    subscribedClients.forEach((client) => {
      if (client.ws.readyState === 1) {
        // WebSocket.OPEN
        client.ws.send(message);
      }
    });

    logger.debug(
      `Broadcasted ${channel} update to ${subscribedClients.length} clients`,
    );
  } catch (error) {
    logger.error(`Error broadcasting ${channel} updates:`, error);
  }
}

export function broadcastToAll(type: string, data: any) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.ws.readyState === 1) {
      // WebSocket.OPEN
      client.ws.send(message);
    }
  });
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
