// Shared API Types
export interface JobData {
  type: string;
  data?: Record<string, any>;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface Job {
  id: string;
  job_name: string;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'scheduled';
  priority: number;
  data: Record<string, any>;
  attempts: number;
  max_attempts: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error_message?: string;
}

export interface JobFilter {
  status?: string;
  type?: string;
  search?: string;
  priority?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JobStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  scheduled: number;
}

// System Metrics Types
export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  response_time: number;
  error_rate: number;
  uptime: number;
  timestamp: string;
}

export interface Alert {
  type: 'info' | 'warning' | 'critical';
  metric: string;
  current: number;
  threshold: number;
  message: string;
  timestamp?: string;
}

export interface AlertStatus {
  status: 'healthy' | 'warning' | 'critical';
  alerts: Alert[];
  alertCount: number;
  metrics: SystemMetrics;
}

// Schedule Types
export interface Schedule {
  id: string;
  name: string;
  job_type: string;
  schedule_expression: string;
  payload?: Record<string, any>;
  timezone: string;
  enabled: boolean;
  max_runs?: number;
  current_runs: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  next_run_at?: string;
}

// Activity Types
export interface Activity {
  id: string;
  type: string;
  service: string;
  message: string;
  status: 'success' | 'warning' | 'error' | 'info';
  details?: Record<string, any>;
  user_id?: string;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client' | 'viewer';
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Dashboard Types
export interface DashboardStats {
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: string;
  lastUpdated: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketSubscription {
  channels: string[];
  filters?: Record<string, any>;
}
