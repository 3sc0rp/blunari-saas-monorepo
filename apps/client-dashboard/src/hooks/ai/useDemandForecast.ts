/**
 * useDemandForecast Hook
 * 
 * React hook for fetching and managing demand forecasts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DemandForecast {
  id: string;
  tenant_id: string;
  forecast_date: string;
  forecast_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  catering_package_id: string | null;
  predicted_orders: number;
  predicted_revenue: number;
  confidence_interval_lower: number | null;
  confidence_interval_upper: number | null;
  confidence_level: number;
  actual_orders: number | null;
  actual_revenue: number | null;
  forecast_error: number | null;
  model_version: string | null;
  contributing_factors: string[];
  created_at: string;
  updated_at: string;
}

export interface GenerateForecastParams {
  tenant_id: string;
  package_id?: string;
  days_ahead?: number;
  include_confidence_interval?: boolean;
}

export function useDemandForecast(tenantId: string, packageId?: string) {
  const queryClient = useQueryClient();

  // Fetch existing forecasts
  const {
    data: forecasts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['demand-forecasts', tenantId, packageId],
    queryFn: async () => {
      let query = supabase
        .from('demand_forecasts')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('forecast_date', new Date().toISOString().split('T')[0])
        .order('forecast_date', { ascending: true });

      if (packageId) {
        query = query.eq('catering_package_id', packageId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DemandForecast[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!tenantId,
  });

  // Generate new forecasts via Edge Function
  const generateForecastMutation = useMutation({
    mutationFn: async (params: GenerateForecastParams) => {
      const { data, error } = await supabase.functions.invoke('predict-demand', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['demand-forecasts', tenantId] });
      toast.success(`Generated ${data.forecasts?.length || 0} forecasts`);
    },
    onError: (error: any) => {
      console.error('Error generating forecasts:', error);
      toast.error(error.message || 'Failed to generate forecasts');
    },
  });

  // Calculate summary statistics
  const summary = forecasts
    ? {
        total_predicted_orders: forecasts.reduce((sum, f) => sum + f.predicted_orders, 0),
        total_predicted_revenue: forecasts.reduce((sum, f) => sum + f.predicted_revenue, 0),
        avg_daily_orders: forecasts.length > 0
          ? Math.round(forecasts.reduce((sum, f) => sum + f.predicted_orders, 0) / forecasts.length)
          : 0,
        next_7_days: forecasts.slice(0, 7),
        next_30_days: forecasts.slice(0, 30),
      }
    : null;

  return {
    forecasts,
    summary,
    isLoading,
    error,
    refetch,
    generateForecast: generateForecastMutation.mutate,
    isGenerating: generateForecastMutation.isPending,
  };
}

export function useForecastAccuracy(tenantId: string) {
  // Fetch forecasts with actual outcomes
  const { data: historicalForecasts, isLoading } = useQuery({
    queryKey: ['forecast-accuracy', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_forecasts')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('actual_orders', 'is', null)
        .order('forecast_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as DemandForecast[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!tenantId,
  });

  // Calculate accuracy metrics
  const metrics = historicalForecasts
    ? {
        count: historicalForecasts.length,
        mae: historicalForecasts.reduce((sum, f) => sum + Math.abs((f.actual_orders || 0) - f.predicted_orders), 0) / historicalForecasts.length,
        mape: historicalForecasts.reduce((sum, f) => {
          const actual = f.actual_orders || 0;
          if (actual === 0) return sum;
          return sum + Math.abs((actual - f.predicted_orders) / actual) * 100;
        }, 0) / historicalForecasts.length,
        accuracy: historicalForecasts.reduce((sum, f) => {
          const actual = f.actual_orders || 0;
          if (actual === 0) return sum + 1;
          const error = Math.abs((actual - f.predicted_orders) / actual);
          return sum + (1 - error);
        }, 0) / historicalForecasts.length,
      }
    : null;

  return {
    historicalForecasts,
    metrics,
    isLoading,
  };
}
