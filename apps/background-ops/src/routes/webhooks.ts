import { Router } from "express";
import { z } from "zod";
import { logger } from "../utils/logger";
import { webhookService } from "../services/webhooks";
import { validateWebhookSignature } from "../middleware/webhooks";

const router = Router();

// Generic webhook endpoint
router.post("/generic", validateWebhookSignature, async (req, res) => {
  try {
    const { source, event_type, data } = req.body;

    await webhookService.processWebhook({
      source,
      event_type,
      data,
      timestamp: new Date(),
      signature: req.headers["x-webhook-signature"] as string,
    });

    res.json({ message: "Webhook processed successfully" });
  } catch (error) {
    logger.error("Error processing webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Service health webhook
router.post(
  "/health/:serviceId",
  validateWebhookSignature,
  async (req, res) => {
    try {
      const { serviceId } = req.params;
      const { status, response_time, details } = req.body;

      await webhookService.processHealthWebhook(serviceId, {
        status,
        response_time,
        details,
        timestamp: new Date(),
      });

      res.json({ message: "Health webhook processed successfully" });
    } catch (error) {
      logger.error("Error processing health webhook:", error);
      res.status(500).json({ error: "Failed to process health webhook" });
    }
  },
);

// Payment webhook (example external integration)
router.post("/payment", validateWebhookSignature, async (req, res) => {
  try {
    const { event_type, customer_id, amount, status } = req.body;

    await webhookService.processPaymentWebhook({
      event_type,
      customer_id,
      amount,
      status,
      timestamp: new Date(),
    });

    res.json({ message: "Payment webhook processed successfully" });
  } catch (error) {
    logger.error("Error processing payment webhook:", error);
    res.status(500).json({ error: "Failed to process payment webhook" });
  }
});

// Deployment webhook
router.post("/deployment", validateWebhookSignature, async (req, res) => {
  try {
    const { service, version, status, environment } = req.body;

    await webhookService.processDeploymentWebhook({
      service,
      version,
      status,
      environment,
      timestamp: new Date(),
    });

    res.json({ message: "Deployment webhook processed successfully" });
  } catch (error) {
    logger.error("Error processing deployment webhook:", error);
    res.status(500).json({ error: "Failed to process deployment webhook" });
  }
});

export { router as webhooksRoutes };
