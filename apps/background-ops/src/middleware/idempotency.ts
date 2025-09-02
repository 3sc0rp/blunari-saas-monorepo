import { Request, Response, NextFunction } from "express";
import { createClient, RedisClientType } from "redis";
import { config } from "../config";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "./auth";

let redis: RedisClientType;

// Initialize Redis client for idempotency
export async function initializeIdempotencyRedis() {
  // Skip Redis entirely for now - will be re-enabled for production
  logger.warn(
    "🔄 Redis disabled for development - running without idempotency protection",
  );
  return;

  // Skip Redis entirely if URL is not provided or empty
  if (!config.REDIS_URL || config.REDIS_URL.trim() === "") {
    logger.warn(
      "🔄 No REDIS_URL provided - running without idempotency protection",
    );
    return;
  }

  try {
    redis = createClient({
      url: config.REDIS_URL,
    });

    // Don't log connection errors in development
    redis.on("error", (err) => {
      // Only log in production
      if (config.NODE_ENV === "production") {
        logger.error("Redis idempotency client error:", err);
      }
    });

    await redis.connect();
    logger.info("Idempotency Redis client connected");
  } catch (error) {
    // Only log error in production
    if (config.NODE_ENV === "production") {
      logger.error("Failed to initialize idempotency Redis client:", error);
    } else {
      logger.warn(
        "🔄 Redis not available - running without idempotency protection",
      );
    }
    // Don't throw error, allow app to continue without Redis
    redis = null as any; // Clear the redis instance
  }
}

// Generate idempotency key from tenant + idempotency key
function getIdempotencyKey(tenantId: string, idempotencyKey: string): string {
  return `idem:${tenantId}:${idempotencyKey}`;
}

/**
 * Idempotency middleware - stores first response for 48h and returns same on repeat
 * Only applies to mutating operations (POST, PUT, PATCH, DELETE)
 */
export function idempotencyMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  // Only apply to mutating operations
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  // Skip if no idempotency key (should be caught by auth middleware)
  if (!req.idempotencyKey || !req.tenantId) {
    return next();
  }

  const key = getIdempotencyKey(req.tenantId, req.idempotencyKey);
  const requestId = req.requestId;

  logger.info("Checking idempotency", {
    requestId,
    tenantId: req.tenantId,
    idempotencyKey: req.idempotencyKey,
    method: req.method,
    path: req.path,
  });

  // Check if we've seen this idempotency key before
  if (!redis) {
    // If Redis is not available, skip idempotency check
    logger.warn("Idempotency check skipped - Redis not available", {
      requestId,
    });
    return next();
  }

  redis
    .get(key)
    .then((existingResponse) => {
      if (existingResponse) {
        // Return cached response
        const cached = JSON.parse(existingResponse);
        logger.info("Returning cached idempotent response", {
          requestId,
          statusCode: cached.statusCode,
          originalRequestId: cached.requestId,
        });

        res.status(cached.statusCode).json(cached.body);
        return;
      }

      // First time seeing this key - proceed with request
      // Override res.json to cache the response
      const originalJson = res.json;
      let responseCached = false;

      res.json = function (body: any) {
        if (!responseCached) {
          responseCached = true;

          const responseToCache = {
            statusCode: res.statusCode,
            body,
            requestId,
            timestamp: new Date().toISOString(),
          };

          // Cache the response with TTL
          if (redis) {
            redis
              .setEx(
                key,
                Math.floor(config.IDEMPOTENCY_TTL / 1000),
                JSON.stringify(responseToCache),
              )
              .then(() => {
                logger.info("Cached idempotent response", {
                  requestId,
                  statusCode: res.statusCode,
                  ttlSeconds: Math.floor(config.IDEMPOTENCY_TTL / 1000),
                });
              })
              .catch((error) => {
                logger.error("Failed to cache idempotent response", {
                  requestId,
                  error: error.message,
                });
              });
          }
        }

        return originalJson.call(this, body);
      };

      next();
    })
    .catch((error) => {
      logger.error("Failed to check idempotency", {
        requestId,
        error: error.message,
      });

      // Continue with request if Redis fails
      next();
    });
}

/**
 * Clean up expired idempotency records
 */
export async function cleanupExpiredIdempotencyRecords(): Promise<number> {
  try {
    const pattern = "idem:*";
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    // Get TTL for all keys and delete expired ones
    const pipeline = redis.multi();
    const expiredKeys: string[] = [];

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1 || ttl <= 0) {
        expiredKeys.push(key);
        pipeline.del(key);
      }
    }

    if (expiredKeys.length > 0) {
      await pipeline.exec();
      logger.info("Cleaned up expired idempotency records", {
        deletedCount: expiredKeys.length,
      });
    }

    return expiredKeys.length;
  } catch (error) {
    logger.error("Failed to cleanup expired idempotency records", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Get idempotency statistics
 */
export async function getIdempotencyStats(): Promise<{
  totalRecords: number;
  recordsByTenant: Record<string, number>;
}> {
  try {
    const pattern = "idem:*";
    const keys = await redis.keys(pattern);

    const recordsByTenant: Record<string, number> = {};

    for (const key of keys) {
      const parts = key.split(":");
      if (parts.length >= 2) {
        const tenantId = parts[1];
        recordsByTenant[tenantId] = (recordsByTenant[tenantId] || 0) + 1;
      }
    }

    return {
      totalRecords: keys.length,
      recordsByTenant,
    };
  } catch (error) {
    logger.error("Failed to get idempotency stats", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
