import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

interface RealtimeTable {
  id: string;
  tenant_id: string;
  name: string;
  capacity: number;
  position_x: number;
  position_y: number;
  table_type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Computed/derived fields
  status?: "available" | "occupied" | "reserved" | "maintenance";
  current_booking_id?: string;
}

interface RealtimeBooking {
  id: string;
  tenant_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  party_size: number;
  booking_time: string;
  duration_minutes: number;
  status: "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  table_id?: string;
  special_requests?: string;
  created_at: string;
  updated_at: string;
  table?: RealtimeTable;
}

interface WaitlistEntry {
  id: string;
  tenant_id: string;
  guest_name: string;
  party_size: number;
  estimated_wait_time: number;
  status: "waiting" | "seated" | "cancelled";
  created_at: string;
  updated_at: string;
}

interface CommandCenterMetrics {
  activeBookings: number;
  occupiedTables: number;
  availableTables: number;
  waitlistCount: number;
  avgWaitTime: number;
  totalRevenue: number;
  coverCount: number;
  turnover: number;
}

export const useRealtimeCommandCenter = () => {
  const { tenant } = useTenant(); // Fixed: removed 'data' property
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  
  const [connectionStatus, setConnectionStatus] = useState<{
    bookings: boolean;
    tables: boolean;
    waitlist: boolean;
  }>({
    bookings: false,
    tables: false,
    waitlist: false,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Get today's date range
  const today = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
    };
  }, []);

  // Fetch real-time bookings
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    error: bookingsError,
  } = useQuery({
    queryKey: ["command-center", "bookings", tenantId, today.start],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            table:restaurant_tables(*)
          `)
          .eq("tenant_id", tenantId)
          .gte("booking_time", today.start)
          .lte("booking_time", today.end)
          .order("booking_time", { ascending: true });

        if (error) throw error;
        return (data || []) as unknown as RealtimeBooking[];
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Fallback polling every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch real-time tables
  const {
    data: tables = [],
    isLoading: tablesLoading,
    error: tablesError,
  } = useQuery({
    queryKey: ["command-center", "tables", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        const { data, error } = await supabase
          .from("restaurant_tables")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        
        // Add computed status to each table
        const tablesWithStatus = (data || []).map(table => ({
          ...table,
          status: "available" as const, // Default status, can be computed based on bookings
        }));
        
        return tablesWithStatus as RealtimeTable[];
      } catch (err) {
        console.error("Failed to fetch tables:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // For now, create mock waitlist data since the table might not exist yet
  const waitlist: WaitlistEntry[] = [];
  const waitlistLoading = false;
  const waitlistError = null;

  // Calculate real-time metrics
  const metrics = useMemo((): CommandCenterMetrics => {
    const activeBookings = bookings.filter(
      (b) => ["confirmed", "seated"].includes(b.status)
    ).length;

    // For now, simulate table occupancy based on bookings
    const tablesWithBookings = bookings.filter(b => 
      b.table_id && ["confirmed", "seated"].includes(b.status)
    ).length;
    
    const occupiedTables = Math.min(tablesWithBookings, tables.length);
    const availableTables = Math.max(0, tables.length - occupiedTables);

    const waitlistCount = waitlist.length;

    const avgWaitTime = waitlist.length > 0
      ? waitlist.reduce((sum, w) => sum + w.estimated_wait_time, 0) / waitlist.length
      : 0;

    const completedBookings = bookings.filter(b => b.status === "completed");
    const totalRevenue = completedBookings.length * 45; // Estimated revenue per booking

    const coverCount = completedBookings.reduce(
      (sum, booking) => sum + booking.party_size,
      0
    );

    const turnover = occupiedTables > 0 ? coverCount / occupiedTables : 0;

    return {
      activeBookings,
      occupiedTables,
      availableTables,
      waitlistCount,
      avgWaitTime,
      totalRevenue,
      coverCount,
      turnover,
    };
  }, [bookings, tables.length, waitlist]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!tenantId) return;

    console.log("🔥 Setting up real-time Command Center subscriptions");

    const handleBookingUpdate = (payload: any) => {
      console.log("📅 Booking update:", payload);
      queryClient.invalidateQueries({ 
        queryKey: ["command-center", "bookings", tenantId] 
      });
      setLastUpdate(new Date());
    };

    const handleBookingSubscription = (status: string) => {
      console.log("📅 Bookings subscription status:", status);
      setConnectionStatus(prevStatus => ({ 
        ...prevStatus, 
        bookings: status === "SUBSCRIBED" 
      }));
    };

    const handleTableUpdate = (payload: any) => {
      console.log("🪑 Table update:", payload);
      queryClient.invalidateQueries({ 
        queryKey: ["command-center", "tables", tenantId] 
      });
      setLastUpdate(new Date());
    };

    const handleTableSubscription = (status: string) => {
      console.log("🪑 Tables subscription status:", status);
      setConnectionStatus(prevStatus => ({ 
        ...prevStatus, 
        tables: status === "SUBSCRIBED" 
      }));
    };

    // Bookings subscription
    const bookingsChannel = supabase
      .channel(`command-center-bookings-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `tenant_id=eq.${tenantId}`,
        },
        handleBookingUpdate
      )
      .subscribe(handleBookingSubscription);

    // Tables subscription
    const tablesChannel = supabase
      .channel(`command-center-tables-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `tenant_id=eq.${tenantId}`,
        },
        handleTableUpdate
      )
      .subscribe(handleTableSubscription);

    // Cleanup subscriptions
    return () => {
      console.log("🧹 Cleaning up Command Center subscriptions");
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(tablesChannel);
      setConnectionStatus({
        bookings: false,
        tables: false,
        waitlist: false,
      });
    };
  }, [tenantId, queryClient, setLastUpdate, setConnectionStatus]);

  // Auto-refresh data every minute as a fallback
  useEffect(() => {
    if (!tenantId) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: ["command-center"] 
      });
      setLastUpdate(new Date());
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [tenantId, queryClient]);

  const isLoading = bookingsLoading || tablesLoading || waitlistLoading;
  const error = bookingsError || tablesError || waitlistError;
  const isConnected = Object.values(connectionStatus).some(status => status);
  const allConnected = Object.values(connectionStatus).every(status => status);

  return {
    // Data
    bookings,
    tables,
    waitlist,
    metrics,
    
    // Status
    isLoading,
    error,
    connectionStatus,
    isConnected,
    allConnected,
    lastUpdate,
    
    // Actions
    refreshData: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
      setLastUpdate(new Date());
    }, [queryClient, setLastUpdate]),
    
    // Filtered data helpers
    todaysBookings: bookings,
    activeBookings: bookings.filter(b => ["confirmed", "seated"].includes(b.status)),
    completedBookings: bookings.filter(b => b.status === "completed"),
    upcomingBookings: bookings.filter(b => {
      const bookingTime = new Date(b.booking_time);
      const now = new Date();
      return b.status === "confirmed" && bookingTime > now;
    }),
  };
};

export type { RealtimeBooking, RealtimeTable, WaitlistEntry, CommandCenterMetrics };
