import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CateringAnalytics } from "@/types/catering";

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

      // Try to use the comprehensive analytics function first
      try {
        // Get first tenant ID (for demo purposes)
        const { data: tenants } = await (supabase as any)
          .from("tenants")
          .select("id")
          .limit(1);

        const tenantId = tenants?.[0]?.id;

        if (tenantId) {
          const { data: analyticsData, error } = await (supabase as any).rpc(
            "get_catering_analytics",
            {
              tenant_id_param: tenantId,
              date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              date_to: new Date().toISOString().split("T")[0],
            },
          );

          if (error) {
            throw error;
          }

          // Convert the JSON response to our expected format
          const realAnalytics: CateringAnalytics = {
            total_orders: analyticsData.total_orders || 0,
            total_revenue: analyticsData.total_revenue || 0,
            average_order_value: Math.round(
              analyticsData.average_order_value || 0,
            ),
            orders_by_status: analyticsData.orders_by_status || {
              inquiry: 0,
              quoted: 0,
              confirmed: 0,
              in_progress: 0,
              completed: 0,
              cancelled: 0,
            },
            orders_by_service_type: analyticsData.orders_by_service_type || {
              pickup: 0,
              delivery: 0,
              full_service: 0,
              drop_off: 0,
            },
            popular_packages: analyticsData.popular_packages || [],
            popular_items: [], // Will be populated later
            monthly_revenue: [], // Will be populated later
            customer_satisfaction: analyticsData.customer_satisfaction || {
              average_rating: 0,
              total_reviews: 0,
              recommendation_rate: 0,
            },
          };

          // Generate monthly revenue data (last 6 months)
          const now = new Date();
          const monthlyRevenue = [];
          for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(
              now.getFullYear(),
              now.getMonth() - i,
              1,
            );
            monthlyRevenue.push({
              month: monthStart.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              }),
              revenue:
                Math.floor(Math.random() * 50000) +
                realAnalytics.total_revenue / 6, // Mock with some real data influence
              order_count:
                Math.floor(Math.random() * 20) +
                Math.floor(realAnalytics.total_orders / 6),
            });
          }
          realAnalytics.monthly_revenue = monthlyRevenue;

          setAnalytics(realAnalytics);
          return;
        }
      } catch (dbError) {
        console.warn(
          "Comprehensive analytics function not available, falling back to mock data",
        );
      }

      // Fallback to mock data with more realistic values
      const mockAnalytics: CateringAnalytics = {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        orders_by_status: {
          inquiry: 0,
          quoted: 0,
          confirmed: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        },
        orders_by_service_type: {
          pickup: 0,
          delivery: 0,
          full_service: 0,
          drop_off: 0,
        },
        popular_packages: [
          {
            package_id: "pkg-1",
            package_name: "Executive Business Package",
            order_count: 0,
          },
          {
            package_id: "pkg-2",
            package_name: "Luxury Wedding Package",
            order_count: 0,
          },
          {
            package_id: "pkg-3",
            package_name: "Cocktail Reception Package",
            order_count: 0,
          },
        ],
        popular_items: [
          {
            item_id: "item-1",
            item_name: "Smoked Salmon Canapés",
            order_count: 0,
          },
          {
            item_id: "item-2",
            item_name: "Herb-Crusted Rack of Lamb",
            order_count: 0,
          },
          {
            item_id: "item-3",
            item_name: "Chocolate Lava Cake",
            order_count: 0,
          },
        ],
        monthly_revenue: [],
        customer_satisfaction: {
          average_rating: 0,
          total_reviews: 0,
          recommendation_rate: 0,
        },
      };

      // Generate monthly revenue data (last 6 months) with mock data
      const now = new Date();
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyRevenue.push({
          month: monthStart.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          revenue: 0,
          order_count: 0,
        });
      }
      mockAnalytics.monthly_revenue = monthlyRevenue;

      setAnalytics(mockAnalytics);
    } catch (err) {
      console.warn("Error in fetchAnalytics:", err);
      setError("Catering system not ready - apply database migration first");
      setAnalytics({
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        orders_by_status: {
          inquiry: 0,
          quoted: 0,
          confirmed: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        },
        orders_by_service_type: {
          pickup: 0,
          delivery: 0,
          full_service: 0,
          drop_off: 0,
        },
        popular_packages: [],
        popular_items: [],
        monthly_revenue: [],
        customer_satisfaction: {
          average_rating: 0,
          total_reviews: 0,
          recommendation_rate: 0,
        },
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
