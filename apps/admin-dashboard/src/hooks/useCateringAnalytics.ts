import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CateringAnalytics } from '@/types/catering';

export interface UseCateringAnalyticsReturn {
  analytics: CateringAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCateringAnalytics(): UseCateringAnalyticsReturn {
  const [analytics, setAnalytics] = useState<CateringAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current date range (this month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Fetch basic order analytics
      const { data: orders, error: ordersError } = await supabase
        .from('catering_orders')
        .select('*')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (ordersError) {
        throw ordersError;
      }

      // Calculate basic metrics
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      // Calculate orders by status
      const ordersByStatus = orders?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Calculate orders by service type
      const ordersByServiceType = orders?.reduce((acc, order) => {
        acc[order.service_type] = (acc[order.service_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Fetch package data - simplified for basic schema  
      const { data: packageData, error: packageError } = await supabase
        .from('catering_orders')
        .select('package_id')
        .not('package_id', 'is', null)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (packageError) {
        console.warn('Error fetching package data:', packageError);
      }

      // Fetch popular packages - simplified for basic schema
      const popularPackages = packageData?.reduce((acc, order) => {
        if (order.package_id) {
          const packageName = `Package ${order.package_id.slice(0, 8)}`;
          const existing = acc.find(p => p.package_id === order.package_id);
          if (existing) {
            existing.order_count += 1;
          } else {
            acc.push({
              package_id: order.package_id,
              package_name: packageName,
              order_count: 1,
            });
          }
        }
        return acc;
      }, [] as { package_id: string; package_name: string; order_count: number; }[]) || [];

      // Skip complex menu item analysis for now - not needed for simplified schema
      const popularItems = [] as { item_id: string; item_name: string; order_count: number; }[];

      // Skip feedback data for simplified version - table may not exist
      const totalReviews = 0;
      const averageRating = 0;
      const recommendationRate = 0;

      // Generate monthly revenue data (last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const { data: monthOrders } = await supabase
          .from('catering_orders')
          .select('total_amount')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const monthRevenue = monthOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
        const monthOrderCount = monthOrders?.length || 0;

        monthlyRevenue.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          order_count: monthOrderCount,
        });
      }

      const analyticsData: CateringAnalytics = {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        average_order_value: averageOrderValue,
        orders_by_status: ordersByStatus,
        orders_by_service_type: ordersByServiceType,
        popular_packages: popularPackages.sort((a, b) => b.order_count - a.order_count).slice(0, 5),
        popular_items: popularItems.sort((a, b) => b.order_count - a.order_count).slice(0, 10),
        monthly_revenue: monthlyRevenue,
        customer_satisfaction: {
          average_rating: averageRating,
          total_reviews: totalReviews,
          recommendation_rate: recommendationRate,
        },
      };

      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error fetching catering analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refetch = fetchAnalytics;

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    loading,
    error,
    refetch,
  };
}
