import { logger } from "../utils/logger";
import { db } from "../database";
import { activityService } from "./activity";
import { servicesService } from "./services";
import { jobsService } from "./jobs";

export interface WebhookData {
  source: string;
  event_type: string;
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
}

export interface HealthWebhookData {
  status: string;
  response_time: number;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface PaymentWebhookData {
  event_type: string;
  customer_id: string;
  amount: number;
  status: string;
  timestamp: Date;
}

export interface DeploymentWebhookData {
  service: string;
  version: string;
  status: string;
  environment: string;
  timestamp: Date;
}

class WebhookService {
  async processWebhook(webhookData: WebhookData) {
    try {
      // Log the webhook
      await this.logWebhook(webhookData);

      // Process based on source and event type
      switch (webhookData.source) {
        case "github":
          await this.processGitHubWebhook(webhookData);
          break;
        case "stripe":
          await this.processStripeWebhook(webhookData);
          break;
        case "slack":
          await this.processSlackWebhook(webhookData);
          break;
        case "monitoring":
          await this.processMonitoringWebhook(webhookData);
          break;
        default:
          await this.processGenericWebhook(webhookData);
      }

      logger.info(
        `Processed webhook from ${webhookData.source}: ${webhookData.event_type}`,
      );
    } catch (error) {
      logger.error("Error processing webhook:", error);
      throw error;
    }
  }

  async processHealthWebhook(serviceId: string, healthData: HealthWebhookData) {
    try {
      // Update service health status
      await servicesService.updateServiceStatus(serviceId, {
        status:
          healthData.status === "healthy"
            ? "online"
            : healthData.status === "degraded"
              ? "warning"
              : "error",
      });

      // Log activity
      await activityService.logActivity({
        type: "health_check",
        service: serviceId,
        message: `Health check result: ${healthData.status} (${healthData.response_time}ms)`,
        status:
          healthData.status === "healthy"
            ? "success"
            : healthData.status === "degraded"
              ? "warning"
              : "error",
        details: {
          response_time: healthData.response_time,
          ...healthData.details,
        },
      });

      logger.info(
        `Processed health webhook for service ${serviceId}: ${healthData.status}`,
      );
    } catch (error) {
      logger.error("Error processing health webhook:", error);
      throw error;
    }
  }

  async processPaymentWebhook(paymentData: PaymentWebhookData) {
    try {
      // Create background job for payment processing
      await jobsService.createJob({
        type: "process_payment",
        data: paymentData,
        priority: 8, // High priority for payments
      });

      // Log activity
      await activityService.logActivity({
        type: "payment_event",
        service: "payments",
        message: `Payment ${paymentData.event_type}: $${paymentData.amount} - ${paymentData.status}`,
        status:
          paymentData.status === "succeeded"
            ? "success"
            : paymentData.status === "failed"
              ? "error"
              : "info",
        details: {
          customer_id: paymentData.customer_id,
          amount: paymentData.amount,
          event_type: paymentData.event_type,
        },
      });

      logger.info(`Processed payment webhook: ${paymentData.event_type}`);
    } catch (error) {
      logger.error("Error processing payment webhook:", error);
      throw error;
    }
  }

  async processDeploymentWebhook(deploymentData: DeploymentWebhookData) {
    try {
      // Log deployment activity
      await activityService.logActivity({
        type: "deployment",
        service: deploymentData.service,
        message: `Deployment ${deploymentData.status}: ${deploymentData.version} to ${deploymentData.environment}`,
        status:
          deploymentData.status === "success"
            ? "success"
            : deploymentData.status === "failed"
              ? "error"
              : "info",
        details: {
          version: deploymentData.version,
          environment: deploymentData.environment,
          status: deploymentData.status,
        },
      });

      // If deployment is successful, trigger health checks
      if (deploymentData.status === "success") {
        await jobsService.createJob({
          type: "health_check_after_deployment",
          data: {
            service: deploymentData.service,
            version: deploymentData.version,
            environment: deploymentData.environment,
          },
          delay: 60, // Wait 60 seconds after deployment
        });
      }

      logger.info(
        `Processed deployment webhook for ${deploymentData.service}: ${deploymentData.status}`,
      );
    } catch (error) {
      logger.error("Error processing deployment webhook:", error);
      throw error;
    }
  }

  private async processGitHubWebhook(webhookData: WebhookData) {
    const { event_type, data } = webhookData;

    switch (event_type) {
      case "push":
        await activityService.logActivity({
          type: "code_push",
          service: "github",
          message: `Code pushed to ${data.repository?.name}: ${data.head_commit?.message}`,
          status: "info",
          details: {
            repository: data.repository?.name,
            branch: data.ref?.replace("refs/heads/", ""),
            commits: data.commits?.length || 0,
            author: data.head_commit?.author?.name,
          },
        });
        break;

      case "pull_request":
        await activityService.logActivity({
          type: "pull_request",
          service: "github",
          message: `Pull request ${data.action}: ${data.pull_request?.title}`,
          status: "info",
          details: {
            action: data.action,
            repository: data.repository?.name,
            number: data.pull_request?.number,
            author: data.pull_request?.user?.login,
          },
        });
        break;
    }
  }

  private async processStripeWebhook(webhookData: WebhookData) {
    const { event_type, data } = webhookData;

    await activityService.logActivity({
      type: "stripe_event",
      service: "payments",
      message: `Stripe event: ${event_type}`,
      status: event_type.includes("failed") ? "error" : "info",
      details: {
        event_type,
        object_id: data.object?.id,
        amount: data.object?.amount,
        currency: data.object?.currency,
      },
    });
  }

  private async processSlackWebhook(webhookData: WebhookData) {
    const { data } = webhookData;

    await activityService.logActivity({
      type: "slack_message",
      service: "communications",
      message: `Slack message received: ${data.text?.substring(0, 100)}...`,
      status: "info",
      details: {
        channel: data.channel,
        user: data.user_name,
        timestamp: data.timestamp,
      },
    });
  }

  private async processMonitoringWebhook(webhookData: WebhookData) {
    const { event_type, data } = webhookData;

    let status: "success" | "warning" | "error" | "info" = "info";

    if (event_type.includes("alert") || event_type.includes("error")) {
      status = "error";
    } else if (event_type.includes("warning")) {
      status = "warning";
    } else if (event_type.includes("resolved") || event_type.includes("ok")) {
      status = "success";
    }

    await activityService.logActivity({
      type: "monitoring_alert",
      service: data.service || "monitoring",
      message: `Monitoring event: ${event_type} - ${data.message || "No message"}`,
      status,
      details: {
        alert_id: data.alert_id,
        severity: data.severity,
        metric: data.metric,
        value: data.value,
        threshold: data.threshold,
      },
    });
  }

  private async processGenericWebhook(webhookData: WebhookData) {
    await activityService.logActivity({
      type: "webhook_received",
      service: webhookData.source,
      message: `Webhook received: ${webhookData.event_type}`,
      status: "info",
      details: {
        source: webhookData.source,
        event_type: webhookData.event_type,
        data_keys: Object.keys(webhookData.data),
      },
    });
  }

  private async logWebhook(webhookData: WebhookData) {
    try {
      const query = `
        INSERT INTO webhook_logs (
          source, event_type, data, signature, timestamp
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await db.query(query, [
        webhookData.source,
        webhookData.event_type,
        JSON.stringify(webhookData.data),
        webhookData.signature,
        webhookData.timestamp,
      ]);
    } catch (error) {
      logger.error("Error logging webhook:", error);
    }
  }
}

export const webhookService = new WebhookService();
