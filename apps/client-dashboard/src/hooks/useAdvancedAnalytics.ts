/**
 * Advanced Analytics Hook
 * 
 * Provides comprehensive analytics data for the catering platform:
 * - Revenue forecasting with trend analysis
 * - Customer segmentation (RFM analysis)
 * - Package performance metrics
 * - Booking trends and patterns
 * - Conversion funnel analysis
 * 
 * @module useAdvancedAnalytics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface DailyRevenue {
  date: string;
  orders_count: number;
  total_revenue: number;
  avg_order_value: number;
  min_order_value: number;
  max_order_value: number;
  unique_customers: number;
}

export interface MonthlyRevenue {
  month: string;
  orders_count: number;
  total_revenue: number;
  avg_order_value: number;
  unique_customers: number;
}

export interface CustomerRFM {
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  recency_days: number;
  frequency: number;
  monetary_value: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_total_score: number;
  customer_segment: 'Champions' | 'Loyal Customers' | 'New Customers' | 'At Risk' | 'Cant Lose Them' | 'Lost Customers' | 'Potential Loyalists';
}

export interface PackagePerformance {
  package_id: string;
  package_name: string;
  package_category: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
  min_order_value: number;
  max_order_value: number;
  order_percentage: number;
  revenue_percentage: number;
}

export interface HourlyPattern {
  hour_of_day: number;
  booking_count: number;
  avg_order_value: number;
}

export interface DayOfWeekPattern {
  day_of_week: number;
  day_name: string;
  booking_count: number;
  total_revenue: number;
  avg_order_value: number;
}

export interface EventTypeAnalysis {
  event_type: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
  avg_guest_count: number;
  min_guest_count: number;
  max_guest_count: number;
}

export interface ConversionFunnel {
  status: string;
  order_count: number;
  percentage: number;
  conversion_rate: number | null;
}

export interface RevenueForecast {
  forecast_date: string;
  forecasted_revenue: number;
  confidence_lower: number;
  confidence_upper: number;
}

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

/**
 * Fetch daily revenue data
 */
export function useDailyRevenue(tenantId: string, days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'daily-revenue', tenantId, days],
    queryFn: async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await supabase
        .from('catering_daily_revenue')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', fromDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching daily revenue:', error);
        toast.error('Failed to load daily revenue data');
        throw error;
      }

      return data as DailyRevenue[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Fetch monthly revenue data
 */
export function useMonthlyRevenue(tenantId: string, months: number = 12) {
  return useQuery({
    queryKey: ['analytics', 'monthly-revenue', tenantId, months],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_monthly_revenue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('month', { ascending: true })
        .limit(months);

      if (error) {
        console.error('Error fetching monthly revenue:', error);
        toast.error('Failed to load monthly revenue data');
        throw error;
      }

      return data as MonthlyRevenue[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Fetch revenue forecast
 */
export function useRevenueForecast(tenantId: string, daysAhead: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'revenue-forecast', tenantId, daysAhead],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_revenue_forecast', {
        p_tenant_id: tenantId,
        p_days_ahead: daysAhead,
      });

      if (error) {
        console.error('Error fetching revenue forecast:', error);
        toast.error('Failed to load revenue forecast');
        throw error;
      }

      return data as RevenueForecast[];
    },
    enabled: !!tenantId,
  });
}

// ============================================================================
// CUSTOMER ANALYTICS
// ============================================================================

/**
 * Fetch customer RFM segmentation
 */
export function useCustomerRFM(tenantId: string) {
  return useQuery({
    queryKey: ['analytics', 'customer-rfm', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_customer_rfm')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('rfm_total_score', { ascending: false });

      if (error) {
        console.error('Error fetching customer RFM:', error);
        toast.error('Failed to load customer segmentation');
        throw error;
      }

      return data as CustomerRFM[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Calculate segment distribution
 */
export function useSegmentDistribution(tenantId: string) {
  const { data: rfmData } = useCustomerRFM(tenantId);

  return useQuery({
    queryKey: ['analytics', 'segment-distribution', tenantId],
    queryFn: () => {
      if (!rfmData) return [];

      const segmentCounts = rfmData.reduce((acc, customer) => {
        const segment = customer.customer_segment;
        if (!acc[segment]) {
          acc[segment] = { segment, count: 0, total_value: 0 };
        }
        acc[segment].count += 1;
        acc[segment].total_value += customer.monetary_value;
        return acc;
      }, {} as Record<string, { segment: string; count: number; total_value: number }>);

      return Object.values(segmentCounts).sort((a, b) => b.total_value - a.total_value);
    },
    enabled: !!rfmData,
  });
}

// ============================================================================
// PACKAGE ANALYTICS
// ============================================================================

/**
 * Fetch package performance metrics
 */
export function usePackagePerformance(tenantId: string) {
  return useQuery({
    queryKey: ['analytics', 'package-performance', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_package_performance')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_revenue', { ascending: false });

      if (error) {
        console.error('Error fetching package performance:', error);
        toast.error('Failed to load package performance');
        throw error;
      }

      return data as PackagePerformance[];
    },
    enabled: !!tenantId,
  });
}

// ============================================================================
// BOOKING TRENDS
// ============================================================================

/**
 * Fetch hourly booking patterns
 */
export function useHourlyPatterns(tenantId: string) {
  return useQuery({
    queryKey: ['analytics', 'hourly-patterns', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_hourly_patterns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('hour_of_day', { ascending: true });

      if (error) {
        console.error('Error fetching hourly patterns:', error);
        toast.error('Failed to load hourly booking patterns');
        throw error;
      }

      return data as HourlyPattern[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Fetch day of week patterns
 */
export function useDayOfWeekPatterns(tenantId: string) {
  return useQuery({
    queryKey: ['analytics', 'dow-patterns', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_dow_patterns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error fetching day of week patterns:', error);
        toast.error('Failed to load booking patterns');
        throw error;
      }

      return data as DayOfWeekPattern[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Fetch event type analysis
 */
export function useEventTypeAnalysis(tenantId: string) {
  return useQuery({
    queryKey: ['analytics', 'event-type', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_event_type_analysis')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_revenue', { ascending: false });

      if (error) {
        console.error('Error fetching event type analysis:', error);
        toast.error('Failed to load event type data');
        throw error;
      }

      return data as EventTypeAnalysis[];
    },
    enabled: !!tenantId,
  });
}

// ============================================================================
// CONVERSION ANALYTICS
// ============================================================================

/**
 * Fetch conversion funnel data
 */
export function useConversionFunnel(tenantId: string) {
  return useQuery({
    queryKey: ['analytics', 'conversion-funnel', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_conversion_funnel')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching conversion funnel:', error);
        toast.error('Failed to load conversion data');
        throw error;
      }

      return data as ConversionFunnel[];
    },
    enabled: !!tenantId,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get segment color
 */
export function getSegmentColor(segment: string): string {
  const colors: Record<string, string> = {
    'Champions': 'text-green-600 bg-green-50',
    'Loyal Customers': 'text-blue-600 bg-blue-50',
    'New Customers': 'text-purple-600 bg-purple-50',
    'At Risk': 'text-orange-600 bg-orange-50',
    'Cant Lose Them': 'text-red-600 bg-red-50',
    'Lost Customers': 'text-gray-600 bg-gray-50',
    'Potential Loyalists': 'text-indigo-600 bg-indigo-50',
  };
  return colors[segment] || 'text-gray-600 bg-gray-50';
}

/**
 * Get status color for conversion funnel
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'inquiry': 'bg-gray-500',
    'quote_sent': 'bg-blue-500',
    'confirmed': 'bg-green-500',
    'in_progress': 'bg-yellow-500',
    'completed': 'bg-purple-500',
    'cancelled': 'bg-red-500',
  };
  return colors[status] || 'bg-gray-500';
}
