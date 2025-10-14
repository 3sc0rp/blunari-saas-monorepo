import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CateringAnalytics,
  CateringOrderMetrics,
  CateringRevenueMetrics,
  CateringPerformanceMetrics,
} from "../types/catering";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export const useCateringAnalytics = (
  tenantId?: string,
  dateRange?: { start: Date; end: Date },
) => {
  // Default to current month if no date range provided
  const defaultStart = startOfMonth(new Date());
  const defaultEnd = endOfMonth(new Date());
  const start = dateRange?.start || defaultStart;
  const end = dateRange?.end || defaultEnd;

  // Fetch catering analytics data
  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "catering-analytics",
      tenantId,
      format(start, "yyyy-MM-dd"),
      format(end, "yyyy-MM-dd"),
    ],
    queryFn: async (): Promise<CateringAnalytics> => {
      if (!tenantId) {
        return {
          orders: {
            total: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            inquiry: 0,
            quoted: 0,
            conversion_rate: 0,
            average_lead_time: 0,
            guest_count_total: 0,
            average_guest_count: 0,
          },
          revenue: {
            total: 0,
            confirmed: 0,
            completed: 0,
            pending: 0,
            average_order_value: 0,
            deposits_collected: 0,
            deposits_pending: 0,
            revenue_by_service_type: {} as any,
          },
          performance: {
            popular_packages: [],
            busiest_days: [],
            service_type_distribution: {} as any,
            monthly_trend: [],
            customer_satisfaction: 0,
            repeat_customer_rate: 0,
          },
        };
      }

      try {
        // Fetch orders within date range
        const { data: ordersData, error: ordersError } = await supabase
          .from("catering_orders" as any)
          .select(
            `
            *,
            catering_packages (
              id,
              name,
              price_per_person
            ),
            catering_feedback (
              overall_rating,
              created_at
            )
          `,
          )
          .eq("tenant_id", tenantId)
          .gte("event_date", format(start, "yyyy-MM-dd"))
          .lte("event_date", format(end, "yyyy-MM-dd"))
          .order("created_at", { ascending: true });

        if (ordersError) {
          // If table doesn't exist yet, return empty analytics
          if (
            ordersError.code === "42P01" ||
            ordersError.message?.includes("relation") ||
            ordersError.message?.includes("does not exist")
          ) {            return {
              orders: {
                total: 0,
                confirmed: 0,
                completed: 0,
                cancelled: 0,
                inquiry: 0,
                quoted: 0,
                conversion_rate: 0,
                average_lead_time: 0,
                guest_count_total: 0,
                average_guest_count: 0,
              },
              revenue: {
                total: 0,
                confirmed: 0,
                completed: 0,
                pending: 0,
                average_order_value: 0,
                deposits_collected: 0,
                deposits_pending: 0,
                revenue_by_service_type: {} as any,
              },
              performance: {
                popular_packages: [],
                busiest_days: [],
                service_type_distribution: {} as any,
                monthly_trend: [],
                customer_satisfaction: 0,
                repeat_customer_rate: 0,
              },
            };
          }
          throw ordersError;
        }

        // Type assertion for the orders data
        const orders = (ordersData || []) as any[];

        // Calculate order metrics
        const orderMetrics: CateringOrderMetrics = {
          total: orders.length,
          confirmed: orders.filter((o) => o.status === "confirmed").length,
          completed: orders.filter((o) => o.status === "completed").length,
          cancelled: orders.filter((o) => o.status === "cancelled").length,
          inquiry: orders.filter((o) => o.status === "inquiry").length,
          quoted: orders.filter((o) => o.status === "quoted").length,
          conversion_rate: 0,
          average_lead_time: 0,
          guest_count_total: 0,
          average_guest_count: 0,
        };

        // Calculate conversion rate (confirmed + completed / total inquiries)
        const convertedOrders = orderMetrics.confirmed + orderMetrics.completed;
        const totalInquiries =
          orderMetrics.inquiry + orderMetrics.quoted + convertedOrders;
        orderMetrics.conversion_rate =
          totalInquiries > 0 ? (convertedOrders / totalInquiries) * 100 : 0;

        // Calculate average lead time (days between order creation and event date)
        const ordersWithDates = orders.filter(
          (o) => o.created_at && o.event_date,
        );
        if (ordersWithDates.length > 0) {
          const totalLeadTime = ordersWithDates.reduce((sum, order) => {
            const created = new Date(order.created_at);
            const event = new Date(order.event_date);
            const leadTime = Math.max(
              0,
              (event.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
            );
            return sum + leadTime;
          }, 0);
          orderMetrics.average_lead_time =
            totalLeadTime / ordersWithDates.length;
        }

        // Calculate guest counts
        orderMetrics.guest_count_total = orders.reduce(
          (sum, order) => sum + (order.guest_count || 0),
          0,
        );
        orderMetrics.average_guest_count =
          orders.length > 0
            ? orderMetrics.guest_count_total / orders.length
            : 0;

        // Calculate revenue metrics
        const revenueMetrics: CateringRevenueMetrics = {
          total: orders.reduce(
            (sum, order) => sum + (order.total_amount || 0),
            0,
          ),
          confirmed: orders
            .filter((o) => o.status === "confirmed")
            .reduce((sum, order) => sum + (order.total_amount || 0), 0),
          completed: orders
            .filter((o) => o.status === "completed")
            .reduce((sum, order) => sum + (order.total_amount || 0), 0),
          pending: orders
            .filter((o) => ["inquiry", "quoted"].includes(o.status))
            .reduce((sum, order) => sum + (order.total_amount || 0), 0),
          average_order_value: 0,
          deposits_collected: orders.reduce(
            (sum, order) =>
              sum + (order.deposit_paid ? order.deposit_amount || 0 : 0),
            0,
          ),
          deposits_pending: orders.reduce(
            (sum, order) =>
              sum + (!order.deposit_paid ? order.deposit_amount || 0 : 0),
            0,
          ),
          revenue_by_service_type: {} as any,
        };

        // Calculate average order value
        const revenueOrders = orders.filter((o) => (o.total_amount || 0) > 0);
        revenueMetrics.average_order_value =
          revenueOrders.length > 0
            ? revenueMetrics.total / revenueOrders.length
            : 0;

        // Calculate revenue by service type
        const serviceTypes = [
          "pickup",
          "delivery",
          "drop_off",
          "full_service",
        ] as const;
        serviceTypes.forEach((serviceType) => {
          const serviceOrders = orders.filter(
            (o) => o.service_type === serviceType,
          );
          (revenueMetrics.revenue_by_service_type as any)[serviceType] =
            serviceOrders.reduce(
              (sum, order) => sum + (order.total_amount || 0),
              0,
            );
        });

        // Calculate performance metrics
        const performanceMetrics: CateringPerformanceMetrics = {
          popular_packages: [],
          busiest_days: [],
          service_type_distribution: {} as any,
          monthly_trend: [],
          customer_satisfaction: 0,
          repeat_customer_rate: 0,
        };

        // Popular packages
        const packageCounts = new Map<
          string,
          { name: string; count: number; revenue: number }
        >();
        orders.forEach((order) => {
          if (order.catering_packages) {
            const pkg = order.catering_packages;
            const key = pkg.id;
            const existing = packageCounts.get(key) || {
              name: pkg.name,
              count: 0,
              revenue: 0,
            };
            existing.count += 1;
            existing.revenue += order.total_amount || 0;
            packageCounts.set(key, existing);
          }
        });

        performanceMetrics.popular_packages = Array.from(
          packageCounts.entries(),
        )
          .map(([id, data]) => ({ package_id: id, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Busiest days (day of week analysis)
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const dayCounts = new Array(7).fill(0);
        orders.forEach((order) => {
          if (order.event_date) {
            const dayOfWeek = new Date(order.event_date).getDay();
            dayCounts[dayOfWeek]++;
          }
        });

        performanceMetrics.busiest_days = dayNames
          .map((day, index) => ({ day, count: dayCounts[index] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        // Service type distribution
        serviceTypes.forEach((serviceType) => {
          const count = orders.filter(
            (o) => o.service_type === serviceType,
          ).length;
          (performanceMetrics.service_type_distribution as any)[serviceType] =
            orders.length > 0 ? (count / orders.length) * 100 : 0;
        });

        // Monthly trend (last 6 months including current period)
        const monthlyData = new Map<
          string,
          { orders: number; revenue: number }
        >();

        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(start, i));
          const monthEnd = endOfMonth(monthStart);
          const monthKey = format(monthStart, "yyyy-MM");

          const monthOrders = orders.filter((order) => {
            const orderDate = new Date(order.event_date);
            return orderDate >= monthStart && orderDate <= monthEnd;
          });

          monthlyData.set(monthKey, {
            orders: monthOrders.length,
            revenue: monthOrders.reduce(
              (sum, order) => sum + (order.total_amount || 0),
              0,
            ),
          });
        }

        performanceMetrics.monthly_trend = Array.from(
          monthlyData.entries(),
        ).map(([month, data]) => ({ month, ...data }));

        // Customer satisfaction from feedback
        const feedbackWithRatings = orders
          .flatMap((order) => order.catering_feedback || [])
          .filter((feedback) => (feedback as any).overall_rating > 0);

        if (feedbackWithRatings.length > 0) {
          const totalRating = feedbackWithRatings.reduce(
            (sum, feedback) => sum + (feedback as any).overall_rating,
            0,
          );
          performanceMetrics.customer_satisfaction =
            totalRating / feedbackWithRatings.length;
        }

        // Repeat customer rate
        const customerEmails = new Set(
          orders.map((order) => order.contact_email),
        );
        const emailCounts = new Map<string, number>();
        orders.forEach((order) => {
          const email = order.contact_email;
          emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
        });

        const repeatCustomers = Array.from(emailCounts.values()).filter(
          (count) => count > 1,
        ).length;
        performanceMetrics.repeat_customer_rate =
          customerEmails.size > 0
            ? (repeatCustomers / customerEmails.size) * 100
            : 0;

        return {
          orders: orderMetrics,
          revenue: revenueMetrics,
          performance: performanceMetrics,
        };
      } catch (err) {
        console.warn("Error fetching catering analytics:", err);
        return {
          orders: {
            total: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            inquiry: 0,
            quoted: 0,
            conversion_rate: 0,
            average_lead_time: 0,
            guest_count_total: 0,
            average_guest_count: 0,
          },
          revenue: {
            total: 0,
            confirmed: 0,
            completed: 0,
            pending: 0,
            average_order_value: 0,
            deposits_collected: 0,
            deposits_pending: 0,
            revenue_by_service_type: {} as any,
          },
          performance: {
            popular_packages: [],
            busiest_days: [],
            service_type_distribution: {} as any,
            monthly_trend: [],
            customer_satisfaction: 0,
            repeat_customer_rate: 0,
          },
        };
      }
    },
    enabled: !!tenantId,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Helper functions for common analytics queries
  const getMetricChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  return {
    analytics,
    isLoading,
    error,
    refetch,

    // Helper functions
    getMetricChange,
    formatCurrency,
    formatPercentage,
  };
};

