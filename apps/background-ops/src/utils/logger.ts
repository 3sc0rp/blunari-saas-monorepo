import winston from "winston";
import crypto from "crypto";
import { config } from "../config";
import { AsyncLocalStorage } from "async_hooks";

// Context storage for request-scoped logging
const asyncLocalStorage = new AsyncLocalStorage<{
  requestId?: string;
  tenantId?: string;
  jobId?: string;
}>();

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const context = asyncLocalStorage.getStore();
    const contextData: any = {};

    // Add context if available
    if (context?.requestId) {
      contextData.requestId = context.requestId;
    }
    if (context?.tenantId) {
      // Hash tenant ID for privacy
      contextData.tenantHash = `tenant_${crypto.createHash("sha256").update(context.tenantId).digest("hex").slice(0, 8)}`;
    }
    if (context?.jobId) {
      contextData.jobId = context.jobId;
    }

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...contextData,
      ...meta,
    });
  }),
);

const baseLogger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: "background-ops" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

// Add file logging in production
if (config.NODE_ENV === "production") {
  baseLogger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: logFormat,
    }),
  );

  baseLogger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      format: logFormat,
    }),
  );
}

// Enhanced logger interface with context management
export const logger = {
  info: (message: string, meta?: any) => baseLogger.info(message, meta),
  warn: (message: string, meta?: any) => baseLogger.warn(message, meta),
  error: (message: string, meta?: any) => baseLogger.error(message, meta),
  debug: (message: string, meta?: any) => baseLogger.debug(message, meta),

  // Context management
  withContext: <T>(
    context: { requestId?: string; tenantId?: string; jobId?: string },
    fn: () => T,
  ): T => {
    return asyncLocalStorage.run(context, fn);
  },

  // Create a child logger with specific context
  child: (context: {
    requestId?: string;
    tenantId?: string;
    jobId?: string;
  }) => ({
    info: (message: string, meta?: any) => {
      const mergedMeta = { ...context, ...meta };
      // Hash tenant ID if present
      if (mergedMeta.tenantId) {
        mergedMeta.tenantHash = `tenant_${crypto.createHash("sha256").update(mergedMeta.tenantId).digest("hex").slice(0, 8)}`;
        delete mergedMeta.tenantId;
      }
      baseLogger.info(message, mergedMeta);
    },
    warn: (message: string, meta?: any) => {
      const mergedMeta = { ...context, ...meta };
      if (mergedMeta.tenantId) {
        mergedMeta.tenantHash = `tenant_${crypto.createHash("sha256").update(mergedMeta.tenantId).digest("hex").slice(0, 8)}`;
        delete mergedMeta.tenantId;
      }
      baseLogger.warn(message, mergedMeta);
    },
    error: (message: string, meta?: any) => {
      const mergedMeta = { ...context, ...meta };
      if (mergedMeta.tenantId) {
        mergedMeta.tenantHash = `tenant_${crypto.createHash("sha256").update(mergedMeta.tenantId).digest("hex").slice(0, 8)}`;
        delete mergedMeta.tenantId;
      }
      baseLogger.error(message, mergedMeta);
    },
    debug: (message: string, meta?: any) => {
      const mergedMeta = { ...context, ...meta };
      if (mergedMeta.tenantId) {
        mergedMeta.tenantHash = `tenant_${crypto.createHash("sha256").update(mergedMeta.tenantId).digest("hex").slice(0, 8)}`;
        delete mergedMeta.tenantId;
      }
      baseLogger.debug(message, mergedMeta);
    },
  }),
};

// Middleware to set logging context from request
export function setLoggingContext(
  requestId?: string,
  tenantId?: string,
  jobId?: string,
) {
  return asyncLocalStorage.run({ requestId, tenantId, jobId }, () => {
    // Context is now available to all logger calls within this execution
  });
}
