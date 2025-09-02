import express from "express";
import { z } from "zod";
import { authenticateRequest, AuthenticatedRequest } from "../middleware/auth";
import { idempotencyMiddleware } from "../middleware/idempotency";
import { DomainEvent, EventType } from "../types/jobs";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// In-memory event store for demo - in production, use proper event store
const events: DomainEvent[] = [];

// Schema for event creation
const CreateEventSchema = z.object({
  type: z.nativeEnum(EventType),
  aggregateId: z.string(),
  payload: z.any(),
  metadata: z
    .object({
      userId: z.string().optional(),
      timestamp: z.string().datetime().optional(),
      version: z.number().default(1),
    })
    .optional(),
});

/**
 * POST /v1/events - Create a new domain event (immutable)
 */
router.post(
  "/",
  authenticateRequest,
  idempotencyMiddleware,
  async (req: AuthenticatedRequest, res) => {
    const requestLogger = logger.child({
      requestId: req.requestId,
      tenantId: req.tenantId,
    });

    try {
      const eventData = CreateEventSchema.parse(req.body);

      // Create immutable domain event
      const event: DomainEvent = {
        id: uuidv4(),
        type: eventData.type,
        tenantId: req.tenantId!,
        aggregateId: eventData.aggregateId,
        payload: eventData.payload,
        metadata: {
          requestId: req.requestId,
          userId: eventData.metadata?.userId,
          timestamp: eventData.metadata?.timestamp || new Date().toISOString(),
          version: eventData.metadata?.version || 1,
        },
      };

      // Store event (immutable - no updates allowed)
      events.push(event);

      requestLogger.info("Domain event created", {
        eventId: event.id,
        type: event.type,
        aggregateId: event.aggregateId,
        version: event.metadata.version,
      });

      res.status(201).json({
        success: true,
        data: {
          id: event.id,
          type: event.type,
          aggregateId: event.aggregateId,
          tenantId: event.tenantId,
          timestamp: event.metadata.timestamp,
          version: event.metadata.version,
        },
      });
    } catch (error) {
      requestLogger.error("Failed to create domain event", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid event data",
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Internal server error",
          message: "Failed to create domain event",
        });
      }
    }
  },
);

/**
 * GET /v1/events - Query domain events
 */
router.get("/", authenticateRequest, async (req: AuthenticatedRequest, res) => {
  const requestLogger = logger.child({
    requestId: req.requestId,
    tenantId: req.tenantId,
  });

  try {
    const {
      type,
      aggregateId,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
    } = req.query;

    // Filter events by tenant and optional filters
    let filteredEvents = events.filter(
      (event) => event.tenantId === req.tenantId,
    );

    if (type) {
      filteredEvents = filteredEvents.filter((event) => event.type === type);
    }

    if (aggregateId) {
      filteredEvents = filteredEvents.filter(
        (event) => event.aggregateId === aggregateId,
      );
    }

    if (fromDate) {
      const from = new Date(fromDate as string);
      filteredEvents = filteredEvents.filter(
        (event) => new Date(event.metadata.timestamp) >= from,
      );
    }

    if (toDate) {
      const to = new Date(toDate as string);
      filteredEvents = filteredEvents.filter(
        (event) => new Date(event.metadata.timestamp) <= to,
      );
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort(
      (a, b) =>
        new Date(b.metadata.timestamp).getTime() -
        new Date(a.metadata.timestamp).getTime(),
    );

    // Apply pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedEvents = filteredEvents.slice(
      offsetNum,
      offsetNum + limitNum,
    );

    res.json({
      success: true,
      data: {
        events: paginatedEvents.map((event) => ({
          id: event.id,
          type: event.type,
          aggregateId: event.aggregateId,
          payload: event.payload,
          metadata: event.metadata,
        })),
        total: filteredEvents.length,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
        },
      },
    });
  } catch (error) {
    requestLogger.error("Failed to query domain events", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to query domain events",
    });
  }
});

/**
 * GET /v1/events/:id - Get specific domain event
 */
router.get(
  "/:id",
  authenticateRequest,
  async (req: AuthenticatedRequest, res) => {
    const requestLogger = logger.child({
      requestId: req.requestId,
      tenantId: req.tenantId,
    });

    try {
      const eventId = req.params.id;
      const event = events.find(
        (e) => e.id === eventId && e.tenantId === req.tenantId,
      );

      if (!event) {
        return res.status(404).json({
          success: false,
          error: "Domain event not found",
        });
      }

      return res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      requestLogger.error("Failed to get domain event", {
        eventId: req.params.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get domain event",
      });
    }
  },
);

/**
 * GET /v1/events/stream/:aggregateId - Get event stream for an aggregate
 */
router.get(
  "/stream/:aggregateId",
  authenticateRequest,
  async (req: AuthenticatedRequest, res) => {
    const requestLogger = logger.child({
      requestId: req.requestId,
      tenantId: req.tenantId,
    });

    try {
      const aggregateId = req.params.aggregateId;
      const { fromVersion = 1 } = req.query;

      // Get events for specific aggregate, ordered by version
      const aggregateEvents = events
        .filter(
          (event) =>
            event.tenantId === req.tenantId &&
            event.aggregateId === aggregateId &&
            event.metadata.version >= parseInt(fromVersion as string),
        )
        .sort((a, b) => a.metadata.version - b.metadata.version);

      res.json({
        success: true,
        data: {
          aggregateId,
          events: aggregateEvents,
          currentVersion:
            aggregateEvents.length > 0
              ? Math.max(...aggregateEvents.map((e) => e.metadata.version))
              : 0,
        },
      });
    } catch (error) {
      requestLogger.error("Failed to get event stream", {
        aggregateId: req.params.aggregateId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get event stream",
      });
    }
  },
);

export { router as eventsRoutes };
