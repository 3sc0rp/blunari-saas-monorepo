import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RealtimeData {
  totalTenants: number;
  activeTenants: number;
  totalBookings: number;
  totalRevenue: number;
  mrr: number;
  arpu: number;
  churnRate: number;
  smsDeliveryRate: number;
  migrationSuccessRate: number;
  etaAccuracy: number;
}

interface UseRealtimeDataOptions {
  refreshInterval?: number;
  enableCache?: boolean;
  cacheTTL?: number;
}

export const useRealtimeData = (options: UseRealtimeDataOptions = {}) => {
  const {
    refreshInterval = 30000, // 30 seconds
    enableCache = true,
    cacheTTL = 60000, // 1 minute
  } = options;

  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  // Cache management
  const getCacheKey = (dateRange?: { from: Date; to: Date }) => {
    if (!dateRange) return "dashboard_data_default";
    return `dashboard_data_${dateRange.from.getTime()}_${dateRange.to.getTime()}`;
  };

  const getCachedData = (key: string): RealtimeData | null => {
    if (!enableCache) return null;

    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      if (now - parsed.timestamp > cacheTTL) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  };

  const setCachedData = (key: string, data: RealtimeData) => {
    if (!enableCache) return;

    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch {
      // Cache storage failed, continue without caching
    }
  };

  const fetchDashboardData = useCallback(
    async (dateRange?: { from: Date; to: Date }) => {
      const cacheKey = getCacheKey(dateRange);

      // Try cache first
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      try {
        setError(null);

        // Fetch tenant metrics
        const { count: tenantCount } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true });

        const { count: activeCount } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        // Fetch booking metrics
        let bookingQuery = supabase
          .from("bookings")
          .select("*", { count: "exact", head: true });

        if (dateRange) {
          bookingQuery = bookingQuery
            .gte("created_at", dateRange.from.toISOString())
            .lte("created_at", dateRange.to.toISOString());
        }

        const { count: bookingCount } = await bookingQuery;

        // Calculate MRR (Monthly Recurring Revenue) - mock calculation
        const mrr = (activeCount || 0) * 49.99; // Assuming $49.99 per tenant

        // Calculate ARPU (Average Revenue Per User)
        const arpu = mrr / Math.max(activeCount || 1, 1);

        // Mock additional metrics for comprehensive dashboard
        const mockData: RealtimeData = {
          totalTenants: tenantCount || 0,
          activeTenants: activeCount || 0,
          totalBookings: bookingCount || 0,
          totalRevenue: mrr * 12, // Annual revenue estimate
          mrr,
          arpu,
          churnRate: 2.5, // 2.5% monthly churn
          smsDeliveryRate: 98.7,
          migrationSuccessRate: 99.2,
          etaAccuracy: 94.8,
        };

        setData(mockData);
        setCachedData(cacheKey, mockData);
        setLastUpdated(new Date());
      } catch (err: any) {
        const errorMessage = err.message || "Failed to fetch dashboard data";
        setError(errorMessage);

        toast({
          title: "Data Fetch Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [enableCache, cacheTTL, toast],
  );

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to tenant changes
    const tenantChannel = supabase
      .channel("tenant-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tenants",
        },
        () => {
          console.log("Tenant data changed, refreshing...");
          fetchDashboardData();
        },
      )
      .subscribe();

    // Subscribe to booking changes
    const bookingChannel = supabase
      .channel("booking-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          console.log("Booking data changed, refreshing...");
          fetchDashboardData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tenantChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [fetchDashboardData]);

  // Polling for updates
  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchDashboardData, refreshInterval]);

  const refreshData = useCallback(
    (dateRange?: { from: Date; to: Date }) => {
      // Clear cache for this range
      const cacheKey = getCacheKey(dateRange);
      localStorage.removeItem(cacheKey);

      setLoading(true);
      fetchDashboardData(dateRange);
    },
    [fetchDashboardData],
  );

  return {
    data,
    loading,
    error,
    lastUpdated,
    refreshData,
  };
};
