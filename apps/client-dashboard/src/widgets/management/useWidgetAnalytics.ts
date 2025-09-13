/**
 * Widget Analytics Hook
 * Provides ONLY real analytics data from backend APIs - NO mock/demo data
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
 * Hook for fetching REAL widget analytics data from database
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
        error: 'Tenant information required for real analytics',
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`Fetching REAL analytics for tenant ${tenantId}, widget ${widgetType}`);
      
      // Get current session for authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        throw new Error('Authentication required for analytics access');
      }

      // Call REAL analytics API endpoint - no mock fallbacks
      const response = await fetchRealWidgetAnalytics(tenantId, widgetType, session.access_token);
      
      setState({
        data: response,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
      
      console.log('Successfully loaded real analytics data');
    } catch (error) {
      console.error('Failed to fetch real analytics:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch real analytics data',
        data: null, // Don't fall back to mock data
      }));
    }
  }, [tenantId, tenantSlug, widgetType]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAvailable) {
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: 'Real tenant information required - no demo mode available',
      }));
      return;
    }

    // Initial fetch
    fetchAnalytics();

    // Set up refresh interval for real-time updates
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
 * Fetch REAL analytics from Supabase Edge Function
 * NO mock data - only actual database queries
 */
async function fetchRealWidgetAnalytics(
  tenantId: string,
  widgetType: WidgetType,
  accessToken: string,
  timeRange: string = '7d'
): Promise<WidgetAnalytics> {
  
  console.log('Calling real analytics Edge Function...');
  
  // Call the widget-analytics Edge Function with real data queries
  const { data, error } = await supabase.functions.invoke('widget-analytics', {
    body: {
      tenantId,
      widgetType,
      timeRange
    },
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (error) {
    console.error('Real analytics function error:', error);
    throw new Error(`Failed to fetch real analytics: ${error.message || 'API error'}`);
  }

  if (!data?.data) {
    throw new Error('No real analytics data received from server');
  }

  console.log('Real analytics data received:', data.data);
  return data.data;
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