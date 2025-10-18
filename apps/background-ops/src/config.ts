import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000"),

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://localhost:5432/background_ops",

  // Redis
  REDIS_URL: process.env.REDIS_URL || "",

  // Security - ENHANCED VALIDATION
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (() => {
      if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be set in production");
      }
      console.warn("⚠️  WARNING: Using weak default JWT_SECRET in development");
      return "your-secret-key";
    })(),

  X_API_KEY:
    process.env.X_API_KEY ||
    (() => {
      if (process.env.NODE_ENV === "production") {
        throw new Error("X_API_KEY must be set in production");
      }
      console.warn("⚠️  WARNING: Using default X_API_KEY in development");
      return "your-api-key";
    })(),

  SIGNING_SECRET:
    process.env.SIGNING_SECRET ||
    (() => {
      if (process.env.NODE_ENV === "production") {
        throw new Error("SIGNING_SECRET must be set in production");
      }
      console.warn("⚠️  WARNING: Using weak SIGNING_SECRET in development");
      return "signing-secret";
    })(),

  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:8080",
    "https://blunari.com",
  ],

  // External APIs
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "webhook-secret",
  API_BASE_URL: process.env.API_BASE_URL || "https://booking-api.blunari.ai",
  CLIENT_BASE_URL: process.env.CLIENT_BASE_URL || "https://blunari.ai",

  // Email Configuration
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "resend",
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@blunari.ai",
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  // SMTP Configuration
  SMTP_HOST: process.env.SMTP_HOST || "smtp.fastmail.com",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "465"),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  // SMS Configuration (optional)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // Payments Configuration (optional)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  PAYMENTS_WEBHOOK_SECRET: process.env.PAYMENTS_WEBHOOK_SECRET,

  // Monitoring
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  METRICS_ENABLED: process.env.METRICS_ENABLED === "true",
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,

  // Workers
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || "5"),
  JOB_RETRY_ATTEMPTS: parseInt(process.env.JOB_RETRY_ATTEMPTS || "3"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "1000",
  ),

  // Timing
  MAX_TIMESTAMP_SKEW: 5 * 60 * 1000, // 5 minutes in milliseconds
  IDEMPOTENCY_TTL: 48 * 60 * 60 * 1000, // 48 hours in milliseconds
} as const;

/**
 * Validate critical security configurations
 * Call this during server startup to ensure production security
 */
export function validateSecurityConfig() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical validations for production
  if (config.NODE_ENV === "production") {
    // Database URL
    if (
      !process.env.DATABASE_URL ||
      process.env.DATABASE_URL.includes("localhost")
    ) {
      errors.push(
        "DATABASE_URL must be set to a production database in production",
      );
    }

    // API Key strength
    if (!process.env.X_API_KEY || process.env.X_API_KEY.length < 32) {
      errors.push(
        "X_API_KEY must be at least 32 characters long in production",
      );
    }

    // JWT Secret strength
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push(
        "JWT_SECRET must be at least 32 characters long in production",
      );
    }

    // Signing secret strength
    if (!process.env.SIGNING_SECRET || process.env.SIGNING_SECRET.length < 32) {
      errors.push(
        "SIGNING_SECRET must be at least 32 characters long in production",
      );
    }

    // CORS origins
    if (!config.ALLOWED_ORIGINS.length) {
      errors.push("ALLOWED_ORIGINS must be set in production");
    }

    // Check for default/weak secrets
    const defaultSecrets = [
      "your-secret-key",
      "your-api-key",
      "signing-secret",
    ];
    if (
      defaultSecrets.some(
        (secret) =>
          config.JWT_SECRET.includes(secret) ||
          config.X_API_KEY.includes(secret) ||
          config.SIGNING_SECRET.includes(secret),
      )
    ) {
      errors.push(
        "Default secrets detected in production! Generate secure secrets immediately.",
      );
    }
  }

  // General validations
  if (config.ALLOWED_ORIGINS.some((origin) => origin.includes("localhost"))) {
    warnings.push(
      "localhost origins detected - ensure this is intentional for your environment",
    );
  }

  if (config.RATE_LIMIT_MAX_REQUESTS > 10000) {
    warnings.push(
      "Very high rate limit detected - consider reducing for better security",
    );
  }

  // Report results
  if (errors.length > 0) {
    console.error("🚨 CRITICAL SECURITY CONFIGURATION ERRORS:");
    errors.forEach((error) => console.error(`  ❌ ${error}`));
    throw new Error(
      `Security validation failed: ${errors.length} critical error(s) found`,
    );
  }

  if (warnings.length > 0) {
    console.warn("⚠️  SECURITY CONFIGURATION WARNINGS:");
    warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ Security configuration validation passed");
  }
}
