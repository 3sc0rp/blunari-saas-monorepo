/**
 * Phase 5: Production-Ready Integration Types
 * 
 * Real integration contracts for API providers, automation workflows,
 * mobile app management, and multi-location operations.
 */

// ===== STANDARD ERROR ENVELOPE =====
export interface ApiError {
  code: string;
  message: string;
  requestId: string;
  issues?: Array<{
    field?: string;
    message: string;
    code: string;
  }>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

// ===== INTEGRATION PROVIDER TYPES =====
export type IntegrationProvider = 
  | 'clover'
  | 'square' 
  | 'toast'
  | 'resy'
  | 'opentable'
  | 'doordash'
  | 'ubereats'
  | 'grubhub'
  | 'mailchimp'
  | 'twilio'
  | 'stripe'
  | 'quickbooks';

export type IntegrationStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'syncing'
  | 'paused'
  | 'expired';

export type SyncStatus = 
  | 'idle'
  | 'running'
  | 'success'
  | 'error'
  | 'partial';

export interface IntegrationCapabilities {
  connect: boolean;
  oauth: boolean;
  webhook: boolean;
  backfill: boolean;
  incremental_sync: boolean;
  health_check: boolean;
  disconnect: boolean;
  pause_resume: boolean;
}

export interface ProviderTokenInfo {
  expires_at?: string;
  refresh_token_expires_at?: string;
  scopes: string[];
  merchant_id?: string;
  location_ids?: string[];
}

export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_check: string;
  response_time_ms?: number;
  error_rate_24h: number;
  last_error?: {
    code: string;
    message: string;
    timestamp: string;
    request_id: string;
  };
}

export interface SyncHistory {
  id: string;
  type: 'backfill' | 'incremental' | 'manual' | 'webhook';
  status: SyncStatus;
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_updated: number;
  records_failed: number;
  error_details?: string;
  request_id: string;
}

export interface Integration {
  id: string;
  tenant_id: string;
  location_id?: string;
  provider: IntegrationProvider;
  provider_account_id: string;
  provider_location_id?: string;
  status: IntegrationStatus;
  capabilities: IntegrationCapabilities;
  token_info?: ProviderTokenInfo;
  health: IntegrationHealth;
  sync_history: SyncHistory[];
  webhook_url?: string;
  webhook_secret?: string;
  config: Record<string, any>;
  last_sync_at?: string;
  next_sync_at?: string;
  created_at: string;
  updated_at: string;
}

// ===== CANONICAL DATA ENTITIES =====
export interface CanonicalMenuItem {
  external_id: string;
  provider: IntegrationProvider;
  name: string;
  description?: string;
  price_cents: number;
  category_external_id?: string;
  category_name?: string;
  available: boolean;
  modifiers?: CanonicalModifier[];
  tags: string[];
  image_url?: string;
  nutrition_info?: Record<string, any>;
  updated_at: string;
}

export interface CanonicalModifier {
  external_id: string;
  name: string;
  price_cents: number;
  required: boolean;
  options: Array<{
    external_id: string;
    name: string;
    price_cents: number;
  }>;
}

export interface CanonicalOrder {
  external_id: string;
  provider: IntegrationProvider;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  order_type: 'dine_in' | 'takeout' | 'delivery';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal_cents: number;
  tax_cents: number;
  tip_cents: number;
  total_cents: number;
  items: CanonicalOrderItem[];
  placed_at: string;
  updated_at: string;
}

export interface CanonicalOrderItem {
  external_id: string;
  menu_item_external_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  modifiers: Array<{
    name: string;
    options: string[];
    price_cents: number;
  }>;
}

// ===== AUTOMATION WORKFLOWS =====
export type AutomationTriggerType = 
  | 'schedule'
  | 'order_created'
  | 'order_completed'
  | 'customer_birthday'
  | 'inventory_low'
  | 'review_received'
  | 'staff_check_in'
  | 'reservation_confirmed';

export type AutomationActionType = 
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'update_inventory'
  | 'create_promotion'
  | 'send_webhook'
  | 'schedule_reminder';

export interface AutomationTrigger {
  type: AutomationTriggerType;
  config: Record<string, any>;
  filters?: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'contains' | 'in';
    value: any;
  }>;
}

export interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, any>;
  delay_minutes?: number;
}

export interface AutomationGuardrails {
  quiet_hours: {
    start: string; // HH:MM
    end: string;   // HH:MM
    timezone: string;
  };
  rate_limits: {
    per_hour: number;
    per_day: number;
  };
  opt_out_compliance: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_data: Record<string, any>;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  actions_completed: number;
  actions_failed: number;
  error_details?: string;
  request_id: string;
}

export interface AutomationWorkflow {
  id: string;
  tenant_id: string;
  location_id?: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  guardrails: AutomationGuardrails;
  executions: WorkflowExecution[];
  created_at: string;
  updated_at: string;
}

// ===== MOBILE APP MANAGEMENT =====
export type MobileAppType = 'customer' | 'staff' | 'manager' | 'delivery';
export type MobilePlatform = 'ios' | 'android' | 'pwa';
export type AppStatus = 'development' | 'testing' | 'review' | 'published' | 'deprecated';

export interface MobileAppBuild {
  id: string;
  version: string;
  build_number: number;
  platform: MobilePlatform;
  status: 'building' | 'success' | 'failed';
  download_url?: string;
  install_url?: string;
  qr_code_url?: string;
  build_logs?: string;
  created_at: string;
  completed_at?: string;
}

export interface MobileAppConfig {
  app_name: string;
  bundle_id: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  splash_screen_url?: string;
  deep_link_domain?: string;
  push_notifications_enabled: boolean;
  features_enabled: string[];
}

export interface MobileApp {
  id: string;
  tenant_id: string;
  type: MobileAppType;
  status: AppStatus;
  config: MobileAppConfig;
  latest_builds: MobileAppBuild[];
  analytics: {
    downloads: number;
    active_users: number;
    rating: number;
    review_count: number;
    crash_rate: number;
  };
  push_config?: {
    fcm_key?: string;
    apns_key_id?: string;
    apns_team_id?: string;
  };
  created_at: string;
  updated_at: string;
}

// ===== MULTI-LOCATION MANAGEMENT =====
export interface LocationRole {
  user_id: string;
  location_id: string;
  role: 'admin' | 'manager' | 'staff';
  permissions: string[];
  granted_at: string;
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  timezone: string;
  operating_hours: Record<string, { open: string; close: string; closed?: boolean }>;
  integrations: Integration[];
  roles: LocationRole[];
  settings: Record<string, any>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkOperation {
  id: string;
  tenant_id: string;
  operation_type: 'menu_sync' | 'hours_update' | 'promo_publish' | 'integration_sync';
  target_location_ids: string[];
  config: Record<string, any>;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: Array<{
    location_id: string;
    status: 'success' | 'failed';
    error?: string;
    request_id: string;
  }>;
  created_at: string;
  completed_at?: string;
}

// ===== WEBHOOK EVENTS =====
export interface WebhookEvent {
  id: string;
  provider: IntegrationProvider;
  event_type: string;
  signature: string;
  payload: Record<string, any>;
  processed: boolean;
  processed_at?: string;
  retry_count: number;
  last_error?: string;
  request_id: string;
  created_at: string;
}

// ===== JOB SYSTEM =====
export type JobType = 
  | 'integration_connect'
  | 'integration_backfill'
  | 'integration_sync'
  | 'automation_execution'
  | 'bulk_operation'
  | 'webhook_processing';

export interface Job {
  id: string;
  type: JobType;
  tenant_id: string;
  location_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  request_id: string;
  idempotency_key?: string;
}

// ===== FEATURE FLAGS =====
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rollout_percentage?: number;
  target_tenants?: string[];
  config?: Record<string, any>;
}
