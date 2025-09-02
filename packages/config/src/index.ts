// Environment configurations
export const environments = {
  development: {
    API_BASE_URL: "http://localhost:3000",
    WS_URL: "ws://localhost:3000",
    LOG_LEVEL: "debug",
  },
  staging: {
    API_BASE_URL: "https://staging-api.blunari.ai",
    WS_URL: "wss://staging-api.blunari.ai",
    LOG_LEVEL: "info",
  },
  production: {
    API_BASE_URL: "https://services.blunari.ai",
    WS_URL: "wss://services.blunari.ai",
    LOG_LEVEL: "warn",
  },
};

export const getConfig = (env: string = "development") => {
  return (
    environments[env as keyof typeof environments] || environments.development
  );
};

// API endpoints
export const API_ENDPOINTS = {
  // Jobs
  JOBS: "/api/v1/jobs",
  JOB_STATS: "/api/v1/jobs/stats/overview",
  JOB_EXPORT: "/api/v1/jobs/export",
  JOB_BULK_RETRY: "/api/v1/jobs/bulk/retry",
  JOB_BULK_CANCEL: "/api/v1/jobs/bulk/cancel",

  // Schedules
  SCHEDULES: "/api/v1/schedules",
  SCHEDULE_TRIGGER: (id: string) => `/api/v1/schedules/${id}/trigger`,
  SCHEDULE_TOGGLE: (id: string) => `/api/v1/schedules/${id}/toggle`,
  SCHEDULE_HISTORY: (id: string) => `/api/v1/schedules/${id}/history`,
  VALIDATE_CRON: "/api/v1/schedules/validate-cron",

  // Alerts & Monitoring
  ALERTS: "/api/v1/alerts/status",
  ALERTS_HISTORY: "/api/v1/alerts/history",
  METRICS: "/api/v1/metrics",
  PERFORMANCE: "/api/v1/performance",

  // System
  HEALTH: "/health",
  ACTIVITY: "/api/v1/activity",
  AUDIT: "/api/v1/audit",
  SERVICES: "/api/v1/services",
  WEBHOOKS: "/api/v1/webhooks",
};

// WebSocket events
export const WS_EVENTS = {
  CONNECTION: "connection",
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
  PING: "ping",
  PONG: "pong",

  // Data events
  METRICS_UPDATE: "metrics_update",
  JOBS_UPDATE: "jobs_update",
  ALERTS_UPDATE: "alerts_update",
  ACTIVITY_UPDATE: "activity_update",
  SERVICES_UPDATE: "services_update",
};

// Default values
export const DEFAULTS = {
  // Pagination
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,

  // Polling intervals (milliseconds)
  METRICS_POLL_INTERVAL: 30000,
  JOBS_POLL_INTERVAL: 5000,
  ALERTS_POLL_INTERVAL: 15000,

  // Alert thresholds
  ALERT_THRESHOLDS: {
    CPU_USAGE: 90,
    MEMORY_USAGE: 85,
    DISK_USAGE: 85,
    RESPONSE_TIME: 500,
    ERROR_RATE: 5,
    FAILED_JOBS: 10,
  },

  // Job settings
  JOB_MAX_RETRIES: 3,
  JOB_TIMEOUT: 300000, // 5 minutes

  // UI settings
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
};

// Status configurations
export const STATUS_CONFIG = {
  JOB_STATUSES: [
    { value: "pending", label: "Pending", color: "#f59e0b" },
    { value: "running", label: "Running", color: "#3b82f6" },
    { value: "completed", label: "Completed", color: "#10b981" },
    { value: "failed", label: "Failed", color: "#ef4444" },
    { value: "cancelled", label: "Cancelled", color: "#6b7280" },
    { value: "scheduled", label: "Scheduled", color: "#8b5cf6" },
  ],

  ALERT_TYPES: [
    { value: "info", label: "Info", color: "#3b82f6" },
    { value: "warning", label: "Warning", color: "#f59e0b" },
    { value: "critical", label: "Critical", color: "#ef4444" },
  ],

  ACTIVITY_STATUSES: [
    { value: "success", label: "Success", color: "#10b981" },
    { value: "warning", label: "Warning", color: "#f59e0b" },
    { value: "error", label: "Error", color: "#ef4444" },
    { value: "info", label: "Info", color: "#3b82f6" },
  ],
};

// Feature flags
export const FEATURES = {
  WEBSOCKET_ENABLED: true,
  REAL_TIME_UPDATES: true,
  JOB_SCHEDULING: true,
  BULK_OPERATIONS: true,
  DATA_EXPORT: true,
  AUDIT_LOGGING: true,
  PERFORMANCE_MONITORING: true,
  CUSTOM_ALERTS: true,
};

// Navigation/Menu structure
export const NAVIGATION = {
  ADMIN: [
    { key: "dashboard", label: "Dashboard", path: "/", icon: "📊" },
    { key: "jobs", label: "Background Jobs", path: "/jobs", icon: "⚙️" },
    { key: "schedules", label: "Schedules", path: "/schedules", icon: "📅" },
    { key: "metrics", label: "System Metrics", path: "/metrics", icon: "📈" },
    { key: "alerts", label: "Alerts", path: "/alerts", icon: "🚨" },
    { key: "activity", label: "Activity Log", path: "/activity", icon: "📝" },
    { key: "services", label: "Services", path: "/services", icon: "🔧" },
    { key: "settings", label: "Settings", path: "/settings", icon: "⚙️" },
  ],

  CLIENT: [
    { key: "dashboard", label: "Dashboard", path: "/", icon: "📊" },
    { key: "services", label: "Services", path: "/services", icon: "🔧" },
    { key: "activity", label: "Activity", path: "/activity", icon: "📝" },
    { key: "settings", label: "Settings", path: "/settings", icon: "⚙️" },
  ],
};

// Common regular expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  URL: /^https?:\/\/.+/,
  CRON: /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
};
