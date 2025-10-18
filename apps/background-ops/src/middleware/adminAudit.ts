import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { activityService } from "../services/activity";

interface AdminAction {
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  userInfo?: {
    ip: string;
    userAgent: string;
    apiKey?: string;
  };
}

// List of admin actions that should be logged
const ADMIN_ACTIONS = new Set([
  "POST", // Creating resources
  "PUT", // Updating resources
  "PATCH", // Partial updates
  "DELETE", // Deleting resources
]);

// Sensitive paths that should be logged regardless of method
const SENSITIVE_PATHS = new Set([
  "/api/v1/jobs",
  "/api/v1/schedules",
  "/api/v1/services",
  "/api/v1/webhooks",
]);

export function adminAuditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const shouldLog =
    ADMIN_ACTIONS.has(req.method) ||
    SENSITIVE_PATHS.has(req.path) ||
    req.path.includes("/bulk/");

  if (!shouldLog) {
    return next();
  }

  const originalSend = res.json.bind(res);
  const startTime = Date.now();

  res.json = function (data: any) {
    const duration = Date.now() - startTime;

    // Log the admin action asynchronously
    setImmediate(() => {
      logAdminAction(req, res, data, duration);
    });

    return originalSend(data);
  };

  next();
}

async function logAdminAction(
  req: Request,
  res: Response,
  responseData: any,
  duration: number,
) {
  try {
    const action = mapHttpMethodToAction(req.method, req.path);
    const resource = extractResourceFromPath(req.path);
    const resourceId = extractResourceId(req.path, req.params);

    const adminAction: AdminAction = {
      action,
      resource,
      resourceId,
      details: {
        method: req.method,
        path: req.path,
        query: req.query,
        body: sanitizeRequestBody(req.body),
        statusCode: res.statusCode,
        duration,
        success: res.statusCode < 400,
        responseSize: JSON.stringify(responseData).length,
      },
      userInfo: {
        ip: req.ip || req.connection.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        apiKey: extractApiKeyHash(req),
      },
    };

    // Log to activity service
    await activityService.logActivity({
      type: "admin_action",
      service: "background-ops",
      message: `${adminAction.action} ${adminAction.resource}${adminAction.resourceId ? ` (${adminAction.resourceId})` : ""}`,
      status:
        res.statusCode < 400
          ? "success"
          : res.statusCode < 500
            ? "warning"
            : "error",
      details: {
        action: adminAction.action,
        resource: adminAction.resource,
        resource_id: adminAction.resourceId,
        ...adminAction.details,
        user_info: adminAction.userInfo,
      },
      user_id: adminAction.userInfo?.ip, // Use IP as user identifier for now
    });

    // Log critical actions to main logger as well
    if (isCriticalAction(req.method, req.path)) {
      logger.warn("Critical admin action performed", {
        action: adminAction.action,
        resource: adminAction.resource,
        resourceId: adminAction.resourceId,
        ip: adminAction.userInfo?.ip,
        statusCode: res.statusCode,
        duration,
      });
    }
  } catch (error) {
    logger.error("Error logging admin action:", error);
  }
}

function mapHttpMethodToAction(method: string, path: string): string {
  if (path.includes("/bulk/")) {
    if (path.includes("/retry")) return "bulk_retry";
    if (path.includes("/cancel")) return "bulk_cancel";
    return `bulk_${method.toLowerCase()}`;
  }

  switch (method) {
    case "POST":
      return "create";
    case "PUT":
      return "update";
    case "PATCH":
      return "modify";
    case "DELETE":
      return "delete";
    case "GET":
      return "read";
    default:
      return method.toLowerCase();
  }
}

function extractResourceFromPath(path: string): string {
  const pathParts = path.split("/").filter(Boolean);

  if (
    pathParts.length >= 3 &&
    pathParts[0] === "api" &&
    pathParts[1] === "v1"
  ) {
    return pathParts[2]; // e.g., 'jobs', 'schedules', 'services'
  }

  return "unknown";
}

function extractResourceId(path: string, params: any): string | undefined {
  // Try to extract ID from path parameters
  if (params && params.id) return params.id;
  if (params && params.jobId) return params.jobId;
  if (params && params.scheduleId) return params.scheduleId;
  if (params && params.serviceId) return params.serviceId;

  // Try to extract UUID from path
  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);
  return match ? match[0] : undefined;
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") return body;

  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = ["password", "secret", "token", "apiKey", "api_key"];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  // Truncate large payloads
  if (JSON.stringify(sanitized).length > 10000) {
    return {
      ...sanitized,
      _truncated: true,
      _originalSize: JSON.stringify(body).length,
    };
  }

  return sanitized;
}

function extractApiKeyHash(req: Request): string | undefined {
  const apiKey =
    req.get("X-API-Key") || req.get("Authorization")?.replace("Bearer ", "");

  if (!apiKey) return undefined;

  // Return a hash of the API key for audit purposes (first 8 and last 4 characters)
  if (apiKey.length > 12) {
    return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
  }

  return "short_key";
}

function getSeverityLevel(
  method: string,
  statusCode: number,
): "low" | "medium" | "high" {
  if (statusCode >= 500) return "high";
  if (statusCode >= 400) return "medium";
  if (method === "DELETE") return "high";
  if (method === "POST" || method === "PUT") return "medium";
  return "low";
}

function isCriticalAction(method: string, path: string): boolean {
  return (
    method === "DELETE" ||
    path.includes("/bulk/") ||
    (method === "POST" && path.includes("/schedules")) ||
    path.includes("/trigger")
  );
}

// Enhanced admin action logging route
export async function getAdminAuditLog(req: Request, res: Response) {
  try {
    const {
      action,
      resource,
      userId,
      startDate,
      endDate,
      limit = "100",
      offset = "0",
    } = req.query;

    const filters: any = {
      type: "admin_action",
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    };

    if (action) filters.service = action; // Map to service field temporarily
    if (resource) filters.status = resource; // This is a workaround for demo
    // Note: The activity service interface needs to be enhanced to support more filters

    const auditLog = await activityService.getActivityFeed(filters);

    res.json({
      auditLog: auditLog.activities,
      total: auditLog.total,
      filters,
      summary: {
        totalActions: auditLog.total,
        criticalActions: auditLog.activities.filter(
          (a) => a.severity === "high",
        ).length,
        recentActions: auditLog.activities.slice(0, 10),
      },
    });
  } catch (error) {
    logger.error("Error fetching admin audit log:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
}

// Real-time admin action notification (can be enhanced with WebSocket)
export function notifyAdminAction(action: AdminAction) {
  if (isCriticalAction(action.details?.method, action.details?.path)) {
    logger.info("🚨 Critical admin action notification", {
      action: action.action,
      resource: action.resource,
      ip: action.userInfo?.ip,
      timestamp: new Date().toISOString(),
    });
  }
}
