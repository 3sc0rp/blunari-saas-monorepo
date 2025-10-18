import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RevenueData {
  name: string;
  value: number;
  bookings: number;
  tenants: number;
}

interface BookingTrendData {
  name: string;
  bookings: number;
  completed: number;
  cancelled: number;
}

interface RestaurantStatusData {
  name: string;
  value: number;
  color: string;
  trend: string;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "error";
  metadata?: Record<string, any>;
}

interface DashboardChartsData {
  revenueData: RevenueData[];
  bookingTrendData: BookingTrendData[];
  restaurantStatusData: RestaurantStatusData[];
  recentActivityData: RecentActivity[];
}

export const useDashboardCharts = (dateRange?: { from: Date; to: Date }) => {
  const [data, setData] = useState<DashboardChartsData>({
    revenueData: [],
    bookingTrendData: [],
    restaurantStatusData: [],
    recentActivityData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRevenueData = useCallback(async () => {
    try {
      // Get revenue data by month for the past 6 months
      const endDate = dateRange?.to || new Date();
      const startDate =
        dateRange?.from ||
        new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        // Get bookings for this month
        const { data: bookings } = await supabase
          .from("bookings")
          .select("*")
          .gte("created_at", date.toISOString())
          .lte("created_at", monthEnd.toISOString());

        // Get tenants count for this month
        const { count: tenantCount } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true })
          .lte("created_at", monthEnd.toISOString());

        // Calculate revenue (estimated from active tenants)
        const { count: activeTenants } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .lte("created_at", monthEnd.toISOString());

        const estimatedRevenue = (activeTenants || 0) * 49.99; // Monthly subscription

        months.push({
          name: date.toLocaleString("default", { month: "short" }),
          value: Math.round(estimatedRevenue),
          bookings: bookings?.length || 0,
          tenants: tenantCount || 0,
        });
      }

      return months;
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      return [];
    }
  }, [dateRange]);

  const fetchBookingTrendData = useCallback(async () => {
    try {
      // Get booking data for the past 7 days
      const endDate = new Date();
      const days = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(endDate.getDate() - i);
        const dayStart = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        );
        const dayEnd = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() + 1,
        );

        const { data: dayBookings } = await supabase
          .from("bookings")
          .select("status")
          .gte("created_at", dayStart.toISOString())
          .lt("created_at", dayEnd.toISOString());

        const totalBookings = dayBookings?.length || 0;
        const completed =
          dayBookings?.filter((b) => b.status === "completed").length || 0;
        const cancelled =
          dayBookings?.filter((b) => b.status === "cancelled").length || 0;

        days.push({
          name: date.toLocaleDateString("en-US", { weekday: "short" }),
          bookings: totalBookings,
          completed,
          cancelled,
        });
      }

      return days;
    } catch (error) {
      console.error("Error fetching booking trend data:", error);
      return [];
    }
  }, []);

  const fetchRestaurantStatusData = useCallback(async () => {
    try {
      // Get current tenant status distribution
      const { data: tenants } = await supabase
        .from("tenants")
        .select("status, created_at");

      if (!tenants) return [];

      // Count by status
      const statusCounts = tenants.reduce(
        (acc, tenant) => {
          acc[tenant.status] = (acc[tenant.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Get previous month data for trend calculation
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { data: lastMonthTenants } = await supabase
        .from("tenants")
        .select("status")
        .lte("created_at", lastMonth.toISOString());

      const lastMonthCounts =
        lastMonthTenants?.reduce(
          (acc, tenant) => {
            acc[tenant.status] = (acc[tenant.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const statusConfig = {
        active: { color: "#10b981", name: "Active" },
        trial: { color: "#f59e0b", name: "Trial" },
        suspended: { color: "#ef4444", name: "Suspended" },
        inactive: { color: "#6b7280", name: "Inactive" },
      };

      return Object.entries(statusCounts).map(([status, count]) => {
        const lastMonthCount = lastMonthCounts[status] || 0;
        const trend =
          lastMonthCount > 0
            ? Math.round(((count - lastMonthCount) / lastMonthCount) * 100)
            : count > 0
              ? 100
              : 0;

        const config = statusConfig[status as keyof typeof statusConfig] || {
          color: "#6b7280",
          name: status,
        };

        return {
          name: config.name,
          value: count,
          color: config.color,
          trend: `${trend >= 0 ? "+" : ""}${trend}%`,
        };
      });
    } catch (error) {
      console.error("Error fetching restaurant status data:", error);
      return [];
    }
  }, []);

  const fetchRecentActivityData = useCallback(async () => {
    try {
      const activities: RecentActivity[] = [];

      // Get recent tenant creations
      const { data: recentTenants } = await supabase
        .from("tenants")
        .select("name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      recentTenants?.forEach((tenant) => {
        const timeDiff =
          new Date().getTime() - new Date(tenant.created_at).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));

        if (hoursAgo < 48) {
          // Only show activities from last 48 hours
          activities.push({
            id: `tenant-${tenant.name}`,
            type: "new_restaurant",
            title: tenant.name,
            description: "New restaurant onboarded",
            timestamp: `${hoursAgo} hours ago`,
            status: "success",
          });
        }
      });

      // Get recent error logs
      const { data: recentErrors } = await supabase
        .from("error_logs")
        .select("tenant_id, error_type, message, occurred_at")
        .eq("resolved", false)
        .order("occurred_at", { ascending: false })
        .limit(3);

      recentErrors?.forEach((error) => {
        const timeDiff =
          new Date().getTime() - new Date(error.occurred_at).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));

        if (hoursAgo < 24) {
          // Only show errors from last 24 hours
          activities.push({
            id: `error-${error.tenant_id}`,
            type: "error",
            title: "System Error",
            description: error.message || "An error occurred",
            timestamp: `${hoursAgo} hours ago`,
            status: "error",
            metadata: { error_type: error.error_type },
          });
        }
      });

      // Get recent booking spikes (high volume)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: yesterdayBookings } = await supabase
        .from("bookings")
        .select("tenant_id")
        .gte("created_at", yesterday.toISOString());

      if (yesterdayBookings) {
        const tenantBookingCounts = yesterdayBookings.reduce(
          (acc, booking) => {
            acc[booking.tenant_id] = (acc[booking.tenant_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        // Find tenants with more than 50 bookings in a day
        const highVolumeTenantsIds = Object.entries(tenantBookingCounts)
          .filter(([_, count]) => count > 50)
          .map(([tenantId]) => tenantId);

        if (highVolumeTenantsIds.length > 0) {
          const { data: highVolumeTenants } = await supabase
            .from("tenants")
            .select("name")
            .in("id", highVolumeTenantsIds)
            .limit(2);

          highVolumeTenants?.forEach((tenant) => {
            const bookingCount = tenantBookingCounts[tenant.name];
            activities.push({
              id: `spike-${tenant.name}`,
              type: "high_booking_volume",
              title: tenant.name,
              description: "High booking volume detected",
              timestamp: "1 day ago",
              status: "warning",
              metadata: { bookings: bookingCount },
            });
          });
        }
      }

      // Sort by timestamp and return only latest 10
      return activities
        .sort((a, b) => {
          const aHours = parseInt(a.timestamp.split(" ")[0]);
          const bHours = parseInt(b.timestamp.split(" ")[0]);
          return aHours - bHours;
        })
        .slice(0, 10);
    } catch (error) {
      console.error("Error fetching recent activity data:", error);
      return [];
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [revenue, bookingTrend, restaurantStatus, recentActivity] =
        await Promise.all([
          fetchRevenueData(),
          fetchBookingTrendData(),
          fetchRestaurantStatusData(),
          fetchRecentActivityData(),
        ]);

      setData({
        revenueData: revenue,
        bookingTrendData: bookingTrend,
        restaurantStatusData: restaurantStatus,
        recentActivityData: recentActivity,
      });
    } catch (err: any) {
      const errorMessage =
        err.message || "Failed to fetch dashboard chart data";
      setError(errorMessage);

      toast({
        title: "Chart Data Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    fetchRevenueData,
    fetchBookingTrendData,
    fetchRestaurantStatusData,
    fetchRecentActivityData,
    toast,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchAllData,
  };
};
