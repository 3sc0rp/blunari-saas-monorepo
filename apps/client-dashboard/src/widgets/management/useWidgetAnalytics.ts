/**
 * Widget Analytics Hook
 * Provides real analytics data instead of mock/randomized values
 */

import { useState, useEffect, useCallback } from 'react';
import type { WidgetAnalytics, WidgetType } from './types';

export interface UseWidgetAnalyticsOptions {
  tenantId?: string | null;
  tenantSlug?: string | null;
  widgetType: WidgetType;
  refreshInterval?: number; // in milliseconds
}

export interface AnalyticsState {
  data: WidgetAnalytics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Hook for fetching real widget analytics data
 */
export function useWidgetAnalytics({
  tenantId,
  tenantSlug,
  widgetType,
  refreshInterval = 300000, // 5 minutes default
}: UseWidgetAnalyticsOptions): AnalyticsState & {
  refresh: () => Promise<void>;
  isAvailable: boolean;
} {
  const [state, setState] = useState<AnalyticsState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const isAvailable = Boolean(tenantId && tenantSlug);

  const fetchAnalytics = useCallback(async (): Promise<void> => {
    if (!tenantId || !tenantSlug) {
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: 'Tenant information not available',
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // In a real implementation, this would call your analytics API
      const response = await fetchWidgetAnalytics(tenantId, tenantSlug, widgetType);
      
      setState({
        data: response,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      }));
    }
  }, [tenantId, tenantSlug, widgetType]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAvailable) return;

    // Initial fetch
    fetchAnalytics();

    // Set up refresh interval
    const interval = setInterval(fetchAnalytics, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAnalytics, refreshInterval, isAvailable]);

  return {
    ...state,
    refresh: fetchAnalytics,
    isAvailable,
  };
}

/**
 * Fetch analytics from the backend API
 * This is where you'd integrate with your actual analytics service
 */
async function fetchWidgetAnalytics(
  tenantId: string,
  tenantSlug: string,
  widgetType: WidgetType
): Promise<WidgetAnalytics> {
  // In development/demo mode, return mock data
  if (import.meta.env.MODE === 'development' || tenantSlug === 'demo') {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return generateMockAnalytics(widgetType);
  }

  // In production, make actual API call
  const response = await fetch(`/api/analytics/widget/${tenantId}/${widgetType}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': tenantSlug,
    },
  });

  if (!response.ok) {
    throw new Error(`Analytics fetch failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Generate mock analytics for development/demo
 */
function generateMockAnalytics(widgetType: WidgetType): WidgetAnalytics {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    totalViews: Math.floor(Math.random() * 10000) + 1000,
    totalClicks: Math.floor(Math.random() * 1000) + 100,
    conversionRate: Math.round((Math.random() * 15 + 5) * 100) / 100,
    avgSessionDuration: Math.round((Math.random() * 180 + 60) * 100) / 100,
    totalBookings: Math.floor(Math.random() * 500) + 50,
    completionRate: Math.round((Math.random() * 30 + 70) * 100) / 100,
    avgPartySize: widgetType === 'booking' ? Math.round((Math.random() * 2 + 2) * 100) / 100 : undefined,
    peakHours: widgetType === 'booking' ? ['6:00 PM', '7:00 PM', '8:00 PM'] : undefined,
    topSources: [
      { source: 'Direct', count: Math.floor(Math.random() * 500) + 200 },
      { source: 'Google', count: Math.floor(Math.random() * 400) + 150 },
      { source: 'Social Media', count: Math.floor(Math.random() * 300) + 100 },
      { source: 'Email', count: Math.floor(Math.random() * 200) + 50 },
    ],
    dailyStats: Array.from({ length: 7 }, (_, i) => ({
      date: daysAgo(6 - i).toISOString().split('T')[0],
      views: Math.floor(Math.random() * 200) + 50,
      clicks: Math.floor(Math.random() * 50) + 10,
      bookings: Math.floor(Math.random() * 20) + 5,
      revenue: Math.floor(Math.random() * 1000) + 200,
    })),
  };
}

/**
 * Format analytics value with fallback for unavailable data
 */
export function formatAnalyticsValue(
  value: number | string | undefined,
  formatter?: (val: number | string) => string
): string {
  if (value === undefined || value === null) {
    return '—'; // Em dash for unavailable data
  }
  
  if (formatter && typeof value === 'number') {
    return formatter(value);
  }
  
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  
  return String(value);
}

/**
 * Default formatters for common analytics values
 */
export const analyticsFormatters = {
  currency: (value: number) => `$${value.toFixed(2)}`,
  percentage: (value: number) => `${value.toFixed(1)}%`,
  duration: (value: number) => `${value.toFixed(1)}s`,
  count: (value: number) => value.toLocaleString(),
  decimal: (value: number) => value.toFixed(1),
} as const;