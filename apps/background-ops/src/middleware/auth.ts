import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config";
import { logger } from "../utils/logger";

// Extended Request interface to include parsed auth data
export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  requestId?: string;
  idempotencyKey?: string;
  authenticated?: boolean;
}

/**
 * Verify HMAC signature for request integrity
 */
function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, "");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch (error) {
    logger.warn("HMAC signature verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Check if timestamp is within acceptable skew (≤ 5 minutes)
 */
function isTimestampValid(timestamp: string): boolean {
  try {
    const requestTime = parseInt(timestamp) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const skew = Math.abs(currentTime - requestTime);

    return skew <= config.MAX_TIMESTAMP_SKEW;
  } catch (error) {
    return false;
  }
}

/**
 * Full authentication middleware for mutating endpoints
 * Requires: x-api-key, x-signature, x-timestamp, x-tenant-id, x-request-id, x-idempotency-key
 */
export function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // Extract required headers
  const apiKey = req.headers["x-api-key"] as string;
  const signature = req.headers["x-signature"] as string;
  const timestamp = req.headers["x-timestamp"] as string;
  const tenantId = req.headers["x-tenant-id"] as string;
  const requestId = req.headers["x-request-id"] as string;
  const idempotencyKey = req.headers["x-idempotency-key"] as string;

  logger.info("Authentication started", {
    requestId,
    tenantId: tenantId
      ? `tenant_${crypto.createHash("sha256").update(tenantId).digest("hex").slice(0, 8)}`
      : undefined,
    path: req.path,
    method: req.method,
    hasApiKey: !!apiKey,
    hasSignature: !!signature,
    hasTimestamp: !!timestamp,
    hasIdempotencyKey: !!idempotencyKey,
  });

  // Validate required headers presence
  const missingHeaders = [];
  if (!apiKey) missingHeaders.push("x-api-key");
  if (!signature) missingHeaders.push("x-signature");
  if (!timestamp) missingHeaders.push("x-timestamp");
  if (!tenantId) missingHeaders.push("x-tenant-id");
  if (!requestId) missingHeaders.push("x-request-id");
  if (!idempotencyKey) missingHeaders.push("x-idempotency-key");

  if (missingHeaders.length > 0) {
    logger.warn("Missing required authentication headers", {
      requestId,
      path: req.path,
      method: req.method,
      missingHeaders,
    });
    res.status(400).json({
      error: "Bad Request",
      message: `Missing required headers: ${missingHeaders.join(", ")}`,
    });
    return;
  }

  // Validate API key
  if (apiKey !== config.X_API_KEY) {
    logger.warn("Invalid API key", {
      requestId,
      path: req.path,
      method: req.method,
      providedKeyPrefix: apiKey.substring(0, 8) + "...",
    });
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
    });
    return;
  }

  // Validate timestamp (≤ 5 minutes skew)
  if (!isTimestampValid(timestamp)) {
    logger.warn("Invalid timestamp - outside acceptable skew", {
      requestId,
      timestamp,
      currentTime: Math.floor(Date.now() / 1000),
      maxSkewMinutes: config.MAX_TIMESTAMP_SKEW / (60 * 1000),
    });
    res.status(401).json({
      error: "Unauthorized",
      message: "Request timestamp is outside acceptable range (≤ 5 minutes)",
    });
    return;
  }

  // Verify HMAC signature
  const payload = JSON.stringify(req.body) + timestamp + tenantId + requestId;
  if (!verifyHmacSignature(payload, signature, config.SIGNING_SECRET)) {
    logger.warn("Invalid HMAC signature", {
      requestId,
      path: req.path,
      method: req.method,
      payloadLength: payload.length,
    });
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid request signature",
    });
    return;
  }

  // Attach parsed data to request
  req.tenantId = tenantId;
  req.requestId = requestId;
  req.idempotencyKey = idempotencyKey;
  req.authenticated = true;

  const duration = Date.now() - startTime;
  logger.info("Authentication successful", {
    requestId,
    tenantId: `tenant_${crypto.createHash("sha256").update(tenantId).digest("hex").slice(0, 8)}`,
    path: req.path,
    method: req.method,
    authDurationMs: duration,
  });

  next();
}

/**
 * Basic API key validation for read-only endpoints
 */
export function validateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = req.headers["x-api-key"] as string;
  const authHeader = req.headers.authorization;

  let providedKey: string | null = null;

  // Check for Bearer token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedKey = authHeader.substring(7);
  }
  // Check for X-API-Key header
  else if (apiKey) {
    providedKey = apiKey;
  }

  if (!providedKey) {
    logger.warn("API request without authentication", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(401).json({
      error: "Unauthorized",
      message:
        "API key required. Provide via Authorization: Bearer <key> or X-API-Key header",
    });
    return;
  }

  if (providedKey !== config.X_API_KEY) {
    logger.warn("Invalid API key provided", {
      path: req.path,
      method: req.method,
      ip: req.ip,
      providedKey: providedKey.substring(0, 8) + "...",
    });
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
    });
    return;
  }

  req.authenticated = true;
  next();
}

/**
 * Optional API key validation - doesn't fail if no key provided
 */
export function optionalApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers["x-api-key"] as string;

  let providedKey: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedKey = authHeader.substring(7);
  } else if (apiKey) {
    providedKey = apiKey;
  }

  if (providedKey && providedKey !== config.X_API_KEY) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
    });
    return;
  }

  // Mark request as authenticated if valid key provided
  if (providedKey === config.X_API_KEY) {
    req.authenticated = true;
  }

  next();
}
