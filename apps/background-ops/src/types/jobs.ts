import { z } from 'zod';

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

// Job priority enum
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20
}

// Base job interface
export interface BaseJob {
  id: string;
  type: string;
  tenantId: string;
  requestId: string;
  idempotencyKey?: string;
  status: JobStatus;
  priority: JobPriority;
  payload: any;
  attempts: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
}

// Specific job payload schemas

// Hold Expiration Job
export const HoldExpirationJobSchema = z.object({
  holdId: z.string(),
  expiresAt: z.string().datetime(),
  resourceId: z.string(),
  resourceType: z.enum(['table', 'room', 'service'])
});

// Notification Job  
export const NotificationJobSchema = z.object({
  userId: z.string(),
  type: z.enum(['email', 'sms', 'push']),
  template: z.string(),
  data: z.record(z.any()),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  language: z.string().default('en')
});

// Analytics Aggregation Job
export const AnalyticsAggregationJobSchema = z.object({
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }),
  metrics: z.array(z.enum(['conversion', 'booking_time', 'api_latency', 'revenue'])),
  granularity: z.enum(['hour', 'day', 'week', 'month'])
});

// Availability Cache Warming Job
export const AvailabilityCacheWarmingJobSchema = z.object({
  resourceId: z.string(),
  resourceType: z.enum(['table', 'room', 'service']),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  })
});

// Idempotency GC Job
export const IdempotencyGCJobSchema = z.object({
  olderThan: z.string().datetime()
});

// Payment Processing Job
export const PaymentJobSchema = z.object({
  paymentId: z.string(),
  action: z.enum(['authorize', 'capture', 'void', 'refund']),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  metadata: z.record(z.any()).optional()
});

// Job type registry with their schemas
export const JOB_SCHEMAS = {
  'hold.expiration': HoldExpirationJobSchema,
  'notification.send': NotificationJobSchema,
  'analytics.aggregate': AnalyticsAggregationJobSchema,
  'cache.warm_availability': AvailabilityCacheWarmingJobSchema,
  'maintenance.idempotency_gc': IdempotencyGCJobSchema,
  'payment.process': PaymentJobSchema
} as const;

export type JobType = keyof typeof JOB_SCHEMAS;

// Job-specific payload types
export type HoldExpirationPayload = z.infer<typeof HoldExpirationJobSchema>;
export type NotificationPayload = z.infer<typeof NotificationJobSchema>;
export type AnalyticsAggregationPayload = z.infer<typeof AnalyticsAggregationJobSchema>;
export type AvailabilityCacheWarmingPayload = z.infer<typeof AvailabilityCacheWarmingJobSchema>;
export type IdempotencyGCPayload = z.infer<typeof IdempotencyGCJobSchema>;
export type PaymentPayload = z.infer<typeof PaymentJobSchema>;

// Union type for all job payloads
export type JobPayload = 
  | HoldExpirationPayload
  | NotificationPayload 
  | AnalyticsAggregationPayload
  | AvailabilityCacheWarmingPayload
  | IdempotencyGCPayload
  | PaymentPayload;

// Job creation request
export interface CreateJobRequest {
  type: JobType;
  payload: JobPayload;
  priority?: JobPriority;
  scheduledFor?: string; // ISO datetime string
  maxRetries?: number;
}

// Job query filters
export interface JobFilters {
  status?: JobStatus[];
  type?: JobType[];
  tenantId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

// Idempotency record
export interface IdempotencyRecord {
  key: string;
  tenantId: string;
  requestId: string;
  response: any;
  createdAt: Date;
  expiresAt: Date;
}

// Event types for domain events
export enum EventType {
  JOB_CREATED = 'job.created',
  JOB_STARTED = 'job.started',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  JOB_RETRIED = 'job.retried',
  JOB_CANCELLED = 'job.cancelled',
  HOLD_EXPIRED = 'hold.expired',
  NOTIFICATION_SENT = 'notification.sent',
  PAYMENT_PROCESSED = 'payment.processed'
}

// Domain event interface
export interface DomainEvent {
  id: string;
  type: EventType;
  tenantId: string;
  aggregateId: string;
  payload: any;
  metadata: {
    requestId?: string;
    userId?: string;
    timestamp: string;
    version: number;
  };
}
