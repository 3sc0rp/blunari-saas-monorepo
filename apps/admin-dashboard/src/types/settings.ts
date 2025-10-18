export interface GlobalSettings {
  id: string;
  platformName: string;
  platformDescription: string;
  supportEmail: string;
  supportPhone?: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maxTenantsPerPlan: Record<string, number>;
  defaultBookingDuration: number;
  maxAdvanceBookingDays: number;
  updatedAt: string;
  updatedBy: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetTenants?: string[];
  environments: ("development" | "staging" | "production")[];
  category: "booking" | "analytics" | "integrations" | "ui" | "experimental";
  dependsOn?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfiguration {
  id: string;
  provider: "smtp" | "resend" | "sendgrid" | "ses";
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpEncryption: "none" | "tls" | "ssl";
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  apiKey?: string;
  webhookSecret?: string;
  dailyLimit: number;
  monthlyLimit: number;
  rateLimitPerHour: number;
  enableDeliveryTracking: boolean;
  enableClickTracking: boolean;
  enableOpenTracking: boolean;
  bounceHandling: boolean;
  enabled: boolean;
  testMode: boolean;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Array<{
    key: string;
    name: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }>;
  category: "booking" | "authentication" | "notifications" | "marketing";
  enabled: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface SMSConfiguration {
  id: string;
  provider: "twilio" | "aws_sns" | "nexmo";
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  apiKey?: string;
  apiSecret?: string;
  dailyLimit: number;
  monthlyLimit: number;
  rateLimitPerHour: number;
  enableDeliveryReceipts: boolean;
  webhookUrl?: string;
  countryCodeWhitelist: string[];
  messageTemplates: Record<string, string>;
  complianceSettings: {
    enableOptOut: boolean;
    optOutKeywords: string[];
    enableDoubleOptIn: boolean;
    retentionDays: number;
  };
  enabled: boolean;
  testMode: boolean;
  updatedAt: string;
}

export interface SecuritySettings {
  id: string;
  authenticationPolicy: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
    passwordExpirationDays: number;
    preventPasswordReuse: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    enableTwoFactor: boolean;
    requireTwoFactorForAdmins: boolean;
  };
  sessionManagement: {
    sessionTimeoutMinutes: number;
    maxConcurrentSessions: number;
    enableSessionTracking: boolean;
    invalidateOnPasswordChange: boolean;
    enableRememberMe: boolean;
    rememberMeDurationDays: number;
  };
  rateLimiting: {
    apiRequestsPerMinute: number;
    loginAttemptsPerMinute: number;
    passwordResetAttemptsPerHour: number;
    enableGlobalRateLimit: boolean;
    ipWhitelist: string[];
    ipBlacklist: string[];
  };
  dataProtection: {
    enableEncryptionAtRest: boolean;
    enableEncryptionInTransit: boolean;
    dataRetentionDays: number;
    enableActivityLogging: boolean;
    logRetentionDays: number;
    enableGDPRCompliance: boolean;
  };
  updatedAt: string;
}

export interface BackupConfiguration {
  id: string;
  automated: {
    enabled: boolean;
    frequency: "hourly" | "daily" | "weekly" | "monthly";
    time: string; // HH:MM format
    daysOfWeek?: number[]; // For weekly backups
    dayOfMonth?: number; // For monthly backups
  };
  retention: {
    keepDaily: number;
    keepWeekly: number;
    keepMonthly: number;
    keepYearly: number;
  };
  storage: {
    provider: "s3" | "gcs" | "azure" | "local";
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
  };
  encryption: {
    enabled: boolean;
    algorithm: "AES-256" | "AES-128";
    keyRotationDays: number;
  };
  verification: {
    enableIntegrityCheck: boolean;
    enableTestRestore: boolean;
    testRestoreFrequency: "weekly" | "monthly";
  };
  notifications: {
    enableSuccessNotifications: boolean;
    enableFailureNotifications: boolean;
    notificationEmails: string[];
    webhookUrl?: string;
  };
  updatedAt: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  impact: "none" | "minimal" | "partial" | "full";
  affectedServices: string[];
  notifications: {
    enableAdvanceNotification: boolean;
    advanceNoticeDays: number;
    notificationChannels: ("email" | "sms" | "dashboard" | "webhook")[];
  };
  rollbackPlan?: string;
  contactPerson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "critical";
  components: Array<{
    name: string;
    status: "operational" | "degraded" | "outage";
    responseTime?: number;
    uptime: number;
    lastCheck: string;
  }>;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    databaseConnections: number;
    activeUsers: number;
  };
  alerts: Array<{
    id: string;
    severity: "info" | "warning" | "error" | "critical";
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}
