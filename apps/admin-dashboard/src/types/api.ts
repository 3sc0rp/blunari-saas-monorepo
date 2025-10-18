/**
 * Type definitions for API responses and edge functions
 */

// Debug data types
export interface JobDebugInfo {
  id: string;
  name: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export interface DebugData {
  jobsInDatabase: number;
  queuedJobs: number;
  runningJobs: number;
  failedJobs: number;
  completedJobs?: number;
  timestamp: string;
  backgroundOpsUrl?: string;
  jobs?: JobDebugInfo[];
  details?: Record<string, unknown>;
}

// Session data types
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  timestamp: number;
}

// Security response types
export interface SecurityEvent {
  id: string;
  at: string;
  type: string;
  message: string;
  details: Record<string, unknown>;
}

export interface SecurityStaff {
  id: string;
  user_id: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export interface SecurityResponse {
  tenantId: string;
  staff: SecurityStaff[];
  recoveryEvents: SecurityEvent[];
  requestId: string;
  generatedAt: string;
}

// Employee types
export interface Employee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'OPS' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface EnrichedEmployee extends Employee {
  profile?: {
    avatar_url?: string;
  };
}

// Tenant types with auto_provisioning
export interface TenantWithProvisioning {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  auto_provisioning?: {
    user_id: string;
    provisioning_status: string;
  } | null;
}

// Support ticket types
export interface SupportTicket {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

// Catering order types
export interface CateringOrder {
  id: string;
  tenant_id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  items: CateringOrderItem[];
  total_amount: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  delivery_date?: string;
}

export interface CateringOrderItem {
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions?: string;
}

// Data export types
export interface ExportData {
  metrics?: ExportMetric[];
  tenants?: ExportTenant[];
  bookings?: ExportBooking[];
}

export interface ExportMetric {
  date: string;
  value: number;
  metric_type: string;
}

export interface ExportTenant {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface ExportBooking {
  id: string;
  tenant_id: string;
  customer_name: string;
  booking_date: string;
  status: string;
}

// Webhook types
export interface WebhookTestData {
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// Rate limit details
export interface RateLimitDetails {
  endpoint?: string;
  userId?: string;
  remainingRequests?: number;
  resetTime?: number;
  [key: string]: unknown;
}

// Edge function response types
export interface EdgeFunctionResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: string;
  };
}

// Billing types
export interface BillingInfo {
  stripe: {
    customerId: string | null;
    subscription: StripeSubscription | null;
  };
}

export interface StripeSubscription {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items?: StripeSubscriptionItem[];
}

export interface StripeSubscriptionItem {
  id: string;
  price: {
    id: string;
    unit_amount: number;
    currency: string;
  };
}

// Generic filter function type
export type FilterFunction<T> = (item: T) => boolean;

// API Error type
export interface APIError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}
