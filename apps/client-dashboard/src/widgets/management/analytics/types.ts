/**
 * Analytics Types
 */
import type { WidgetAnalytics } from '../types';

export type AnalyticsTimeRange = '1d' | '7d' | '30d';

export interface AnalyticsMeta {
  estimation?: boolean;
  version?: string;
  time_range?: string;
  authMethod?: string;
}

export interface AnalyticsResponse {
  data: WidgetAnalytics;
  meta?: AnalyticsMeta;
  success?: boolean;
}

// Stronger typed alias for external consumption (future extension point)
export type WidgetAnalyticsData = WidgetAnalytics;

// Normalized analytics error payload (used by reporter & tests)
export interface NormalizedAnalyticsError {
  code: string;
  message: string;
  correlationId?: string;
  context?: Record<string, unknown>;
  original?: { name?: string; message?: string };
}