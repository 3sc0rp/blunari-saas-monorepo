import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PerformanceMetrics {
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  recorded_at: string;
}

export interface BusinessMetrics {
  total_bookings: number;
  revenue: number;
  customer_count: number;
  avg_party_size: number;
  occupancy_rate: number;
  period_start: string;
  period_end: string;
}

export interface UsageStats {
  api_calls: number;
  data_storage: number;
  bandwidth: number;
  period: string;
}

export const useAnalyticsAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callAnalyticsAPI = async (endpoint: string, options: RequestInit = {}) => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('analytics-api', {
        body: {
          endpoint,
          method: options.method || 'GET',
          body: options.body ? JSON.parse(options.body as string) : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    } catch (error) {
      console.error('Analytics API Error:', error);
      toast({
        title: "API Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceMetrics = async (filters?: {
    metric_name?: string;
    start_date?: string;
    end_date?: string;
    aggregation?: 'hour' | 'day' | 'week' | 'month';
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const endpoint = `/analytics/performance${params.toString() ? `?${params.toString()}` : ''}`;
    return callAnalyticsAPI(endpoint);
  };

  const getBusinessMetrics = async (tenantId: string, filters?: {
    start_date?: string;
    end_date?: string;
    granularity?: 'daily' | 'weekly' | 'monthly';
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const endpoint = `/analytics/business/${tenantId}${params.toString() ? `?${params.toString()}` : ''}`;
    return callAnalyticsAPI(endpoint);
  };

  const getUsageStatistics = async (filters?: {
    tenant_id?: string;
    start_date?: string;
    end_date?: string;
    breakdown?: 'tenant' | 'endpoint' | 'user';
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const endpoint = `/analytics/usage${params.toString() ? `?${params.toString()}` : ''}`;
    return callAnalyticsAPI(endpoint);
  };

  const exportAnalyticsData = async (type: 'performance' | 'business' | 'usage', format: 'csv' | 'json', filters?: any) => {
    const endpoint = `/analytics/export/${type}`;
    return callAnalyticsAPI(endpoint, {
      method: 'POST',
      body: JSON.stringify({ format, filters }),
    });
  };

  return {
    loading,
    getPerformanceMetrics,
    getBusinessMetrics,
    getUsageStatistics,
    exportAnalyticsData,
  };
};