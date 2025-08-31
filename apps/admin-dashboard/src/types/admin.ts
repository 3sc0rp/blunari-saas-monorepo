import { z } from 'zod';

// Enhanced Tenant Types with strict validation
export const TenantStatus = z.enum(['active', 'inactive', 'suspended']);
export const DomainStatus = z.enum(['ACTIVE', 'PENDING', 'ERROR']);
export const SSLStatus = z.enum(['OK', 'PENDING', 'FAILED']);

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: z.infer<typeof TenantStatus>;
  timezone: string;
  currency: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: any;
  created_at: string;
  updated_at: string;
  domainsCount: number;
  analytics?: {
    total_bookings: number;
    revenue: number;
    active_tables: number;
  };
}

export interface TenantFeature {
  id: string;
  tenant_id: string;
  feature_key: string;
  enabled: boolean;
  source: 'PLAN' | 'OVERRIDE';
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Background Operations Types
export interface BackgroundJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  payload?: Record<string, any>;
  priority: number;
  attempts: number;
  max_retries: number;
  scheduled_for?: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error_message?: string;
  result?: Record<string, any>;
  created_at: string;
  updated_at: string;
  tenant_id?: string;
  idempotency_key?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  response_time_ms: number;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    last_check: string;
  }>;
}

export interface SystemMetrics {
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  timestamp: string;
  service_name?: string;
  endpoint?: string;
}

// Provisioning Types
export interface ProvisioningRequest {
  basics: {
    name: string;
    timezone: string;
    currency: string;
    slug: string;
  };
  owner: {
    email: string;
    sendInvite: boolean;
  };
  access: {
    mode: 'standard' | 'premium';
  };
  seed: {
    seatingPreset: string;
    enablePacing: boolean;
    enableDepositPolicy: boolean;
  };
  billing: {
    createSubscription: boolean;
    plan: string;
  };
  sms: {
    startRegistration: boolean;
  };
  idempotencyKey: string;
}

export interface ProvisioningResponse {
  success: boolean;
  runId?: string;
  tenantId?: string;
  slug?: string;
  primaryUrl?: string;
  message?: string;
  error?: string;
}

// Email Operations
export interface EmailResendRequest {
  tenantSlug: string;
  emailType: 'welcome' | 'credentials' | 'invitation';
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId: string;
  };
  requestId: string;
}

// Validation Schemas
export const ProvisioningRequestSchema = z.object({
  basics: z.object({
    name: z.string().min(1, 'Restaurant name is required').max(100),
    timezone: z.string().min(1, 'Timezone is required'),
    currency: z.string().length(3, 'Currency must be 3 characters'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9\-]+$/, 'Invalid slug format'),
    description: z.string().max(1000).optional(),
    email: z.string().email('Invalid business email').optional(),
    phone: z.string().max(50).optional(),
    website: z.string().url('Invalid website URL').optional(),
    cuisineTypeId: z.string().uuid().optional(),
  }),
  owner: z.object({
    email: z.string().email('Invalid email address'),
    sendInvite: z.boolean(),
  }),
  access: z.object({
    mode: z.enum(['standard', 'premium']),
  }),
  seed: z.object({
    seatingPreset: z.string(),
    enablePacing: z.boolean(),
    enableDepositPolicy: z.boolean().default(false),
  }),
  billing: z.object({
    createSubscription: z.boolean(),
    plan: z.string(),
  }),
  sms: z.object({
    startRegistration: z.boolean(),
  }),
  idempotencyKey: z.string().uuid(),
});

export const JobEnqueueSchema = z.object({
  type: z.enum(['WELCOME_EMAIL', 'RESERVATION_EMAIL', 'ANALYTICS_AGGREGATE']),
  payload: z.record(z.any()),
  schedule_at: z.string().optional(),
  priority: z.number().int().min(0).max(10).default(5),
  tenant_id: z.string().uuid().optional(),
  idempotency_key: z.string().uuid().optional(),
});

// Type guards
export const isValidTenantStatus = (status: string): status is z.infer<typeof TenantStatus> => {
  return TenantStatus.safeParse(status).success;
};

export const isValidDomainStatus = (status: string): status is z.infer<typeof DomainStatus> => {
  return DomainStatus.safeParse(status).success;
};

export const isValidSSLStatus = (status: string): status is z.infer<typeof SSLStatus> => {
  return SSLStatus.safeParse(status).success;
};

// Utility functions for safe enum parsing
export const safeParseEnum = <T extends z.ZodEnum<any>>(
  schema: T, 
  value: string, 
  fallback: z.infer<T>
): z.infer<T> => {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
};

export type ProvisioningRequestData = z.infer<typeof ProvisioningRequestSchema>;
export type JobEnqueueData = z.infer<typeof JobEnqueueSchema>;