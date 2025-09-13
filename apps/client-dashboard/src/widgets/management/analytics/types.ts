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