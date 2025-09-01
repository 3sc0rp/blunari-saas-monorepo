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

      // Return mock data until database migration is applied
      const mockAnalytics: CateringAnalytics = {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        orders_by_status: {
          'inquiry': 0,
          'quoted': 0,
          'confirmed': 0,
          'in_progress': 0,
          'completed': 0,
          'cancelled': 0
        },
        orders_by_service_type: {
          'pickup': 0,
          'delivery': 0,
          'full_service': 0,
          'drop_off': 0
        },
        popular_packages: [
          { package_id: 'pkg-1', package_name: 'Corporate Lunch', order_count: 0 },
          { package_id: 'pkg-2', package_name: 'Wedding Package', order_count: 0 },
          { package_id: 'pkg-3', package_name: 'Party Catering', order_count: 0 }
        ],
        popular_items: [],
        monthly_revenue: [],
        customer_satisfaction: {
          average_rating: 0,
          total_reviews: 0,
          recommendation_rate: 0
        }
      };

      // Generate monthly revenue data (last 6 months) with mock data
      const now = new Date();
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyRevenue.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: 0,
          order_count: 0,
        });
      }
      mockAnalytics.monthly_revenue = monthlyRevenue;

      setAnalytics(mockAnalytics);

    } catch (err) {
      console.warn('Error in fetchAnalytics:', err);
      setError('Catering system not ready - apply database migration first');
      setAnalytics({
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        orders_by_status: {
          'inquiry': 0,
          'quoted': 0,
          'confirmed': 0,
          'in_progress': 0,
          'completed': 0,
          'cancelled': 0
        },
        orders_by_service_type: {
          'pickup': 0,
          'delivery': 0,
          'full_service': 0,
          'drop_off': 0
        },
        popular_packages: [],
        popular_items: [],
        monthly_revenue: [],
        customer_satisfaction: { average_rating: 0, total_reviews: 0, recommendation_rate: 0 }
      });
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
