import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";
import { logger } from "@/utils/logger";
import { handleSubscriptionError, handleFallbackUsage } from "@/utils/productionErrorManager";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeCommandCenterOptions {
  selectedDate?: string;
}

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
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
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

// UUID validation helper
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useRealtimeCommandCenter = (options: UseRealtimeCommandCenterOptions = {}) => {
  const { selectedDate } = options;
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  
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

  // Get date range for selected date (timezone-aware)
  const dateRange = useMemo(() => {
    const targetDateString = selectedDate || new Date().toISOString().split('T')[0];
    
    // Use tenant timezone if available, fallback to UTC
    const timezone = (tenant as any)?.timezone || 'UTC';
    
    try {
      // Import dynamically to avoid circular deps
      const { getDateRangeInTimezone } = require('@/utils/dateUtils');
      const range = getDateRangeInTimezone(targetDateString, timezone);
      return {
        start: range.start,
        end: range.end,
        dateString: targetDateString
      };
    } catch (error) {
      console.warn('[useRealtimeCommandCenter] Error getting timezone-safe date range, falling back to UTC:', error);
      // Fallback to simple UTC date range
      const targetDate = new Date(targetDateString);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      return {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
        dateString: targetDateString
      };
    }
  }, [selectedDate, tenant]);

  // Enhanced bookings query with proper error handling
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    error: bookingsError,
  } = useQuery({
    queryKey: ["command-center", "bookings", tenantId, dateRange.start],
    queryFn: async (): Promise<RealtimeBooking[]> => {
      if (!tenantId) {
        throw new Error("Tenant ID is required for fetching bookings");
      }

      // Validate UUID format before making database call
      console.log('[useRealtimeCommandCenter] Bookings query - Tenant ID:', tenantId);
      if (!isValidUUID(tenantId)) {
        console.warn("Invalid tenant ID format, skipping bookings query:", tenantId);
        return [];
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          table:restaurant_tables(*)
        `)
        .eq("tenant_id", tenantId)
        .gte("booking_time", dateRange.start)
        .lte("booking_time", dateRange.end)
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
    enabled: !!tenantId && isValidUUID(tenantId),
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

      // Validate UUID format before making database call
      if (!isValidUUID(tenantId)) {
        console.warn("Invalid tenant ID format, skipping tables query:", tenantId);
        return [];
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
    enabled: !!tenantId && isValidUUID(tenantId),
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

      // Validate UUID format before making database call
      if (!isValidUUID(tenantId)) {
        console.warn("Invalid tenant ID format, skipping waitlist query:", tenantId);
        return [];
      }

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
    enabled: !!tenantId && isValidUUID(tenantId),
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

    // Skip real-time subscriptions for fallback tenant to prevent errors
    if (tenantId === '99e1607d-da99-4f72-9182-a417072eb629') {
      handleFallbackUsage('useRealtimeCommandCenter', 'polling mode', { tenantId });
      setConnectionStatus({
        bookings: 'disconnected',
        tables: 'disconnected', 
        waitlist: 'disconnected',
        overall: 'disconnected'
      });
      return;
    }

    // Skip subscriptions if tenant ID is not a valid UUID
    if (!isValidUUID(tenantId)) {
      handleFallbackUsage('useRealtimeCommandCenter', 'polling mode (invalid UUID)', { 
        tenantId: tenantId?.substring(0, 8) + '...' 
      });
      setConnectionStatus({
        bookings: 'disconnected',
        tables: 'disconnected',
        waitlist: 'disconnected', 
        overall: 'disconnected'
      });
      return;
    }

    // Skip real-time subscriptions in development mode if flag is set
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_DISABLE_REALTIME === 'true') {
      logger.info("Real-time subscriptions disabled in development mode", {
        component: 'useRealtimeCommandCenter'
      });
      setConnectionStatus({
        bookings: 'disconnected',
        tables: 'disconnected',
        waitlist: 'disconnected',
        overall: 'disconnected'
      });
      return;
    }

    logger.info("Setting up Command Center real-time subscriptions for tenant:", { tenantId: tenantId });

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
            logger.info(`${service} subscription active`);
            break;
          case 'TIMED_OUT':
          case 'CHANNEL_ERROR':
          case 'CLOSED':
            connectionState = 'error';
            handleSubscriptionError('useRealtimeCommandCenter', service, `Subscription ${status}`, { tenantId });
            // Trigger polling fallback when subscriptions fail
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
        const bookingHandlers = createSubscriptionHandler('bookings', ["command-center", "bookings", tenantId, dateRange.start]);
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
              logger.debug("Bookings change:", { payload: payload });
              bookingHandlers.onUpdate(payload);
            }
          )
          .subscribe(async (status, err) => {
            if (err) {
              handleSubscriptionError('useRealtimeCommandCenter', 'bookings', err.message, { tenantId });
              updateConnectionStatus('bookings', 'error');
              return;
            }
            
            bookingHandlers.onStatus(status);
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
              logger.debug("Tables change:", { payload: payload });
              tableHandlers.onUpdate(payload);
            }
          )
          .subscribe(async (status, err) => {
            if (err) {
              handleSubscriptionError('useRealtimeCommandCenter', 'tables', err.message, { tenantId });
              updateConnectionStatus('tables', 'error');
              return;
            }
            
            tableHandlers.onStatus(status);
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
              logger.debug("Waitlist change:", { payload: payload });
              waitlistHandlers.onUpdate(payload);
            }
          )
          .subscribe(async (status, err) => {
            if (err) {
              handleSubscriptionError('useRealtimeCommandCenter', 'waitlist', err.message, { tenantId });
              updateConnectionStatus('waitlist', 'error');
              return;
            }
            
            waitlistHandlers.onStatus(status);
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
      logger.info("Cleaning up Command Center subscriptions");
      
      const cleanupChannel = (channel: RealtimeChannel | undefined, name: string) => {
        if (channel) {
          try {
            logger.debug(`Unsubscribing ${name} channel`);
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
  }, [tenantId, queryClient, dateRange.start, updateConnectionStatus]);

  // CRITICAL FIX: Enhanced auto-refresh with connection-based intervals and proper cleanup
  useEffect(() => {
    if (!tenantId) return;

    let intervalId: NodeJS.Timeout;
    let isComponentMounted = true; // FIX: Track component mount state

    const setupPolling = () => {
      intervalId = setInterval(() => {
        // FIX: Check if component is still mounted before executing
        if (!isComponentMounted) return;
        
        const { overall } = connectionStatus;
        
        if (overall === 'error' || overall === 'disconnected') {
          logger.debug("Polling fallback active - refreshing data");
          queryClient.invalidateQueries({ 
            queryKey: ["command-center"] 
          });
          setLastUpdate(new Date());
        } else if (overall === 'connecting') {
          logger.debug("Connection unstable - light refresh");
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
    };

    setupPolling();

    return () => {
      isComponentMounted = false; // FIX: Mark component as unmounted
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
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
