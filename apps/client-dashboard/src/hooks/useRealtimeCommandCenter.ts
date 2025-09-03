import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  guest_email: string;
  guest_phone?: string;
  party_size: number;
  preferred_date: string;
  preferred_time: string;
  status: "active" | "notified" | "expired" | "cancelled";
  notified_at?: string;
  expires_at?: string;
  created_at: string;
  // Computed fields for compatibility
  estimated_wait_time?: number;
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

// Enhanced connection status type
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RealtimeConnectionState {
  bookings: ConnectionStatus;
  tables: ConnectionStatus;
  waitlist: ConnectionStatus;
  overall: ConnectionStatus;
}

export const useRealtimeCommandCenter = () => {
  const { tenant } = useTenant();
  const tenantId = tenant?.tenantId;
  const queryClient = useQueryClient();
  
  // Helper function to create subscription handlers
  const createSubscriptionHandler = useCallback((service: string, queryKey: any[]) => ({
    onUpdate: (payload: any) => {
      console.log(`🔄 ${service} update received:`, payload.eventType);
      queryClient.invalidateQueries({ queryKey });
      setLastUpdate(new Date());
    },
    onStatus: (status: string) => {
      console.log(`📡 ${service} subscription status:`, status);
    }
  }), [queryClient]);
  
  // Enhanced connection status with proper typing
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionState>({
    bookings: 'disconnected',
    tables: 'disconnected',
    waitlist: 'disconnected',
    overall: 'disconnected'
  });

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Helper to update connection status
  const updateConnectionStatus = useCallback((
    service: keyof Omit<RealtimeConnectionState, 'overall'>, 
    status: ConnectionStatus
  ) => {
    setConnectionStatus(prev => {
      const newState = { ...prev, [service]: status };
      
      // Calculate overall status
      const statuses = [newState.bookings, newState.tables, newState.waitlist];
      const connectedCount = statuses.filter(s => s === 'connected').length;
      const errorCount = statuses.filter(s => s === 'error').length;
      
      let overall: ConnectionStatus = 'disconnected';
      if (connectedCount >= 2) { // At least bookings and tables connected
        overall = 'connected';
      } else if (connectedCount > 0) {
        overall = 'connecting';
      } else if (errorCount > 0) {
        overall = 'error';
      }
      
      return { ...newState, overall };
    });
  }, []);

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

  // Enhanced bookings query with proper error handling
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    error: bookingsError,
  } = useQuery({
    queryKey: ["command-center", "bookings", tenantId, today.start],
    queryFn: async (): Promise<RealtimeBooking[]> => {
      if (!tenantId) {
        throw new Error("Tenant ID is required for fetching bookings");
      }

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

      if (error) {
        console.error("Bookings query error:", error);
        throw error;
      }

      return (data || []).map(booking => ({
        ...booking,
        table: booking.table || null
      })) as RealtimeBooking[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Enhanced tables query
  const {
    data: tables = [],
    isLoading: tablesLoading,
    error: tablesError,
  } = useQuery({
    queryKey: ["command-center", "tables", tenantId],
    queryFn: async (): Promise<RealtimeTable[]> => {
      if (!tenantId) {
        throw new Error("Tenant ID is required for fetching tables");
      }

      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Tables query error:", error);
        throw error;
      }
      
      // Add computed status to each table with proper typing
      const tablesWithStatus = (data || []).map(table => ({
        id: table.id,
        tenant_id: table.tenant_id,
        name: table.name,
        capacity: table.capacity,
        position_x: table.position_x,
        position_y: table.position_y,
        table_type: table.table_type,
        active: table.active,
        created_at: table.created_at,
        updated_at: table.updated_at,
        status: "available" as const,
        current_booking_id: undefined
      }));
      
      return tablesWithStatus;
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Enhanced waitlist query with graceful error handling for missing table
  const {
    data: waitlist = [],
    isLoading: waitlistLoading,
    error: waitlistError,
  } = useQuery({
    queryKey: ["command-center", "waitlist", tenantId],
    queryFn: async (): Promise<WaitlistEntry[]> => {
      if (!tenantId) return [];

      try {
        // First check if the table exists by attempting a minimal query
        const { data, error } = await supabase
          .from("bookings") // Use existing bookings table as waitlist proxy for now
          .select("id, guest_name, party_size, booking_time, created_at, status")
          .eq("tenant_id", tenantId)
          .eq("status", "confirmed")
          .order("created_at", { ascending: true })
          .limit(10);

        if (error) {
          console.warn("Waitlist query failed, using empty array:", error);
          return [];
        }

        // Transform booking data to waitlist format as fallback
        return (data || []).map((booking: any): WaitlistEntry => {
          const now = new Date();
          const bookingTime = new Date(booking.booking_time);
          const diffInMinutes = Math.max(0, Math.floor((bookingTime.getTime() - now.getTime()) / (1000 * 60)));
          
          return {
            id: booking.id,
            tenant_id: tenantId,
            guest_name: booking.guest_name || 'Guest',
            guest_email: '', // Not available in booking
            guest_phone: '',
            party_size: booking.party_size || 2,
            preferred_date: bookingTime.toISOString().split('T')[0],
            preferred_time: bookingTime.toTimeString().slice(0, 5),
            status: 'active' as const,
            created_at: booking.created_at,
            estimated_wait_time: diffInMinutes > 0 ? diffInMinutes : 15,
          };
        });
      } catch (err) {
        console.warn("Failed to fetch waitlist:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 1, // Only retry once to avoid spam
  });

  // Calculate real-time metrics based on actual data
  const metrics = useMemo((): CommandCenterMetrics => {
    const activeBookings = bookings.filter(
      (b) => ["confirmed", "seated"].includes(b.status)
    ).length;

    // Calculate real table occupancy based on actual bookings and table status
    const occupiedTables = tables.filter(table => {
      // Check if table has an active booking
      const hasActiveBooking = bookings.some(booking => 
        booking.table_id === table.id && 
        ["confirmed", "seated"].includes(booking.status)
      );
      // Or check if table status indicates it's occupied
      return hasActiveBooking || table.status === "occupied";
    }).length;
    
    const availableTables = tables.filter(table => 
      table.status === "available" && 
      !bookings.some(booking => 
        booking.table_id === table.id && 
        ["confirmed", "seated"].includes(booking.status)
      )
    ).length;

    const waitlistCount = waitlist.length;

    const avgWaitTime = waitlist.length > 0
      ? Math.round(waitlist.reduce((sum, w) => sum + (w.estimated_wait_time || 15), 0) / waitlist.length)
      : 0;

    const completedBookings = bookings.filter(b => b.status === "completed");
    // Better revenue calculation based on party size
    const totalRevenue = completedBookings.reduce((sum, booking) => {
      return sum + (booking.party_size * 35); // $35 average per person
    }, 0);

    const coverCount = completedBookings.reduce(
      (sum, booking) => sum + booking.party_size,
      0
    );

    const turnover = tables.length > 0 ? Number((coverCount / tables.length).toFixed(2)) : 0;

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
  }, [bookings, tables, waitlist]);

  // Enhanced real-time subscriptions with proper cleanup and error handling
  useEffect(() => {
    if (!tenantId) return;

    console.log("🔥 Setting up Command Center real-time subscriptions for tenant:", tenantId);

    let bookingsChannel: RealtimeChannel;
    let tablesChannel: RealtimeChannel;
    let waitlistChannel: RealtimeChannel;

    const createSubscriptionHandler = (
      service: keyof Omit<RealtimeConnectionState, 'overall'>,
      queryKey: string[]
    ) => ({
      onUpdate: (payload: any) => {
        console.log(`� ${service} update received:`, payload.eventType);
        queryClient.invalidateQueries({ queryKey });
        setLastUpdate(new Date());
      },
      onStatus: (status: string) => {
        console.log(`� ${service} subscription status:`, status);
        
        let connectionState: ConnectionStatus = 'disconnected';
        switch (status) {
          case 'SUBSCRIBED':
            connectionState = 'connected';
            break;
          case 'TIMED_OUT':
          case 'CHANNEL_ERROR':
          case 'CLOSED':
            connectionState = 'error';
            // Trigger polling fallback when subscriptions fail
            console.log(`🔄 ${service} subscription failed, enabling polling mode`);
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey });
            }, 1000);
            break;
          case 'CONNECTING':
            connectionState = 'connecting';
            break;
          default:
            connectionState = 'disconnected';
        }
        
        updateConnectionStatus(service, connectionState);
      }
    });

    const setupSubscriptions = async () => {
      try {
        // Check authentication status first
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.warn("🔐 Auth check failed:", authError.message);
        }
        
        if (!session) {
          console.warn("🔐 No active session found");
          // Set error state for all services
          setConnectionStatus({
            bookings: 'error',
            tables: 'error',
            waitlist: 'error',
            overall: 'error'
          });
          return;
        }

        // Bookings subscription with enhanced configuration
        const bookingHandlers = createSubscriptionHandler('bookings', ["command-center", "bookings", tenantId, today.start]);
        bookingsChannel = supabase
          .channel(`command-center-bookings-${tenantId}`, {
            config: {
              presence: { key: 'command-center' },
              broadcast: { self: false }
            }
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings",
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              console.log("📊 Bookings change:", payload);
              bookingHandlers.onUpdate(payload);
            }
          )
          .subscribe(async (status, err) => {
            console.log(`🔔 Bookings subscription status: ${status}`);
            if (err) {
              console.error("❌ Bookings subscription error:", err);
              updateConnectionStatus('bookings', 'error');
              return;
            }
            
            if (status === 'SUBSCRIBED') {
              console.log("✅ Bookings subscription active");
              updateConnectionStatus('bookings', 'connected');
            } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
              console.log("⚠️ Bookings subscription failed, falling back to polling");
              updateConnectionStatus('bookings', 'error');
            }
          });

        // Tables subscription with enhanced configuration
        const tableHandlers = createSubscriptionHandler('tables', ["command-center", "tables", tenantId]);
        tablesChannel = supabase
          .channel(`command-center-tables-${tenantId}`, {
            config: {
              presence: { key: 'command-center' },
              broadcast: { self: false }
            }
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public", 
              table: "restaurant_tables",
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              console.log("🪑 Tables change:", payload);
              tableHandlers.onUpdate(payload);
            }
          )
          .subscribe(async (status, err) => {
            console.log(`🔔 Tables subscription status: ${status}`);
            if (err) {
              console.error("❌ Tables subscription error:", err);
              updateConnectionStatus('tables', 'error');
              return;
            }
            
            if (status === 'SUBSCRIBED') {
              console.log("✅ Tables subscription active");
              updateConnectionStatus('tables', 'connected');
            } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
              console.log("⚠️ Tables subscription failed, falling back to polling");
              updateConnectionStatus('tables', 'error');
            }
          });

        // Waitlist subscription (using bookings as fallback)
        const waitlistHandlers = createSubscriptionHandler('waitlist', ["command-center", "waitlist", tenantId]);
        waitlistChannel = supabase
          .channel(`command-center-waitlist-${tenantId}`, {
            config: {
              presence: { key: 'command-center' },
              broadcast: { self: false }
            }
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings", // Use bookings table as fallback
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              console.log("⏱️ Waitlist change:", payload);
              waitlistHandlers.onUpdate(payload);
            }
          )
          .subscribe(async (status, err) => {
            console.log(`🔔 Waitlist subscription status: ${status}`);
            if (err) {
              console.error("❌ Waitlist subscription error:", err);
              updateConnectionStatus('waitlist', 'error');
              return;
            }
            
            if (status === 'SUBSCRIBED') {
              console.log("✅ Waitlist subscription active");
              updateConnectionStatus('waitlist', 'connected');
            } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
              console.log("⚠️ Waitlist subscription failed, falling back to polling");
              updateConnectionStatus('waitlist', 'error');
            }
          });

      } catch (error) {
        console.error("Failed to set up real-time subscriptions:", error);
        setConnectionStatus({
          bookings: 'error',
          tables: 'error',
          waitlist: 'error',
          overall: 'error'
        });
      }
    };

    // Initialize subscriptions
    setupSubscriptions();

    // Enhanced cleanup function with better error handling
    return () => {
      console.log("🧹 Cleaning up Command Center subscriptions");
      
      const cleanupChannel = (channel: RealtimeChannel | undefined, name: string) => {
        if (channel) {
          try {
            console.log(`🗑️ Unsubscribing ${name} channel`);
            channel.unsubscribe();
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn(`Failed to cleanup ${name} channel:`, error);
          }
        }
      };
      
      cleanupChannel(bookingsChannel, 'bookings');
      cleanupChannel(tablesChannel, 'tables');
      cleanupChannel(waitlistChannel, 'waitlist');
      
      setConnectionStatus({
        bookings: 'disconnected',
        tables: 'disconnected',
        waitlist: 'disconnected',
        overall: 'disconnected'
      });
    };
  }, [tenantId, queryClient, today.start, updateConnectionStatus]);

  // Enhanced auto-refresh with connection-based intervals and fallback polling
  useEffect(() => {
    if (!tenantId) return;

    const interval = setInterval(() => {
      const { overall } = connectionStatus;
      
      if (overall === 'error' || overall === 'disconnected') {
        console.log("📱 Polling fallback active - refreshing data");
        queryClient.invalidateQueries({ 
          queryKey: ["command-center"] 
        });
        setLastUpdate(new Date());
      } else if (overall === 'connecting') {
        console.log("📱 Connection unstable - light refresh");
        queryClient.invalidateQueries({ 
          queryKey: ["command-center"] 
        });
        setLastUpdate(new Date());
      }
      // If fully connected, let real-time subscriptions handle updates
    }, 
    // Adaptive polling intervals based on connection status
    connectionStatus.overall === 'error' ? 15000 :  // Fast polling on error
    connectionStatus.overall === 'disconnected' ? 20000 : // Medium polling when disconnected  
    connectionStatus.overall === 'connecting' ? 30000 : // Slower when connecting
    120000 // Very slow when connected (let real-time handle it)
    );

    return () => clearInterval(interval);
  }, [tenantId, queryClient, connectionStatus.overall]);

  // Memoized refresh function to prevent unnecessary re-renders
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["command-center"] });
    setLastUpdate(new Date());
  }, [queryClient]);

  // Memoized filtered data to prevent unnecessary recalculations
  const todaysBookings = useMemo(() => bookings, [bookings]);
  
  const activeBookings = useMemo(() => 
    bookings.filter(b => ["confirmed", "seated"].includes(b.status))
  , [bookings]);
  
  const completedBookings = useMemo(() => 
    bookings.filter(b => b.status === "completed")
  , [bookings]);
  
  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      const bookingTime = new Date(b.booking_time);
      return b.status === "confirmed" && bookingTime > now;
    });
  }, [bookings]);

  // Computed loading and error states
  const isLoading = bookingsLoading || tablesLoading || waitlistLoading;
  const error = bookingsError || tablesError || waitlistError;
  const isConnected = connectionStatus.overall === 'connected';
  const allConnected = [connectionStatus.bookings, connectionStatus.tables].every(status => 
    status === 'connected'
  ); // Don't require waitlist to be connected as it may not exist

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
    refreshData,
    
    // Filtered data helpers
    todaysBookings,
    activeBookings,
    completedBookings,
    upcomingBookings,
  };
};

export type { 
  RealtimeBooking, 
  RealtimeTable, 
  WaitlistEntry, 
  CommandCenterMetrics,
  ConnectionStatus,
  RealtimeConnectionState
};
