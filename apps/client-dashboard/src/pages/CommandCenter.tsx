import React, { useEffect } from "react";
import { TopBar } from "@/components/command-center/TopBar";
import { KpiStrip, type KpiCard } from "@/components/command-center/KpiStrip";
import { Filters } from "@/components/command-center/Filters";
import { MainSplit } from "@/components/command-center/MainSplit";
import { ReservationDrawer } from "@/components/command-center/ReservationDrawer";
import { AuthDebugger } from "@/components/command-center/AuthDebugger";
import { TenantTestComponent } from "@/components/TenantTestComponent";
import { DebugEdgeFunctions } from "@/components/debug/DebugEdgeFunctions";
import { useCommandCenterDataSimple } from "@/hooks/useCommandCenterDataSimple";
import { useRealtimeCommandCenter } from "@/hooks/useRealtimeCommandCenter";
import { useReservationActions } from "@/hooks/useReservationActions.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { FiltersState } from "@/components/command-center/Filters";
import { useTenant } from "@/hooks/useTenant";
import { createTestReservationNotification } from "@/utils/testNotification";
import { getTodayInTimezone } from "@/utils/dateUtils";
import { 
  Filters as FiltersType, 
  shouldUseMocks,
  Reservation as ContractReservation,
  TableRow as ContractTableRow
} from "@/lib/contracts.ts";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import type { TableRow as LegacyTableRow, Reservation as LegacyReservation } from "@/hooks/useCommandCenterData";
import SmartBookingWizard from "@/components/booking/SmartBookingWizard";

// Type transformation utilities for converting contract types to legacy component types
      const transformTableToLegacy = (table: ContractTableRow): LegacyTableRow => ({
  id: table.id,
  name: table.name,
  capacity: table.seats, // Map seats to capacity for backward compatibility
  section: table.section,
  status: table.status.toLowerCase() as 'available' | 'occupied' | 'reserved' | 'maintenance'
});

const transformReservationToLegacy = (reservation: ContractReservation): LegacyReservation => ({
  id: reservation.id,
  tableId: reservation.tableId,
  guestName: reservation.guestName,
  partySize: reservation.partySize,
  start: reservation.start,
  end: reservation.end,
  status: reservation.status.toLowerCase() as 'pending' | 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled',
  channel: reservation.channel === 'WEB' ? 'online' : 
           reservation.channel === 'PHONE' ? 'phone' : 'walkin',
  deposit: reservation.depositAmount,
  isVip: reservation.vip,
  guestPhone: reservation.guestPhone,
  specialRequests: reservation.specialRequests
});

export default function CommandCenter() {
  const { tenantId, tenant } = useTenant();
  const tenantTimezone = (tenant as any)?.timezone || 'UTC';
  
  // Add loading timeout to prevent infinite loading state
      const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    // Set timeout for 3 seconds -
      if (still loading, show error
      const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Initialize with today in tenant's timezone
    try {
      return getTodayInTimezone(tenantTimezone);
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [filters, setFilters] = useState<FiltersState>({});
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [focusTableId, setFocusTableId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Convert FiltersState to contracts.Filters
      const contractFilters = useMemo<FiltersType>(() => ({
    section: 'all', // Current FiltersState doesn't have section, defaulting to 'all'
    status: filters.status?.length === 1 ? filters.status[0] as any : 'all',
    channel: filters.channel?.length === 1 ? filters.channel[0] as any : 'all',
    partySize: filters.party ? {
      min: Math.min(...filters.party),
      max: Math.max(...filters.party)
    } : undefined
  }), [filters]);

  // Get reservation actions
      const {
    createReservationAction,
    moveReservationAction,
    cancelReservationAction,
    isAnyLoading: isActionLoading
  } = useReservationActions();

  const [newOpen, setNewOpen] = useState(false);
  const [formTableId, setFormTableId] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(() => {
    try {
      return getTodayInTimezone(tenantTimezone);
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [formTime, setFormTime] = useState<string>("18:00");
  const [formDuration, setFormDuration] = useState<number>(120);
  const [formParty, setFormParty] = useState<number>(2);
  const [formName, setFormName] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");

  const handleNewReservation = () => { setNewOpen(true); };

  const handleQuickCreateAt = (tableId: string, time: Date) => {
    try {
      setFormTableId(tableId);
      const yyyy = new Intl.DateTimeFormat('en-CA', { year: 'numeric' }).format(time);
      const mm = new Intl.DateTimeFormat('en-CA', { month: '2-digit' }).format(time);
      const dd = new Intl.DateTimeFormat('en-CA', { day: '2-digit' }).format(time);
      setFormDate(`${yyyy}-${mm}-${dd}`);
      setFormTime(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(time));
      setNewOpen(true);
    } catch (e) {
      console.error('Quick create failed', e);
    }
  };

  // Handle keyboard shortcuts with enhanced error handling
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      try {
        // Only handle shortcuts when not in an input field
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
        
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            handleNewReservation();
            break;
          case 'f':
            event.preventDefault();
            // Focus filters - could implement this
            break;
          case 'escape':
            // Clear filters
      if (Object.values(filters).some(v => v && (Array.isArray(v) ? v.length : true))) {
              setFilters({});
            }
            break;
          case '?':
            event.preventDefault();
            // Show shortcuts modal - could implement this
            break;
        }
      } catch (error) {
        console.error('Keyboard shortcut error:', error);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filters, handleNewReservation]);

  // Use real-time hook for live data updates
      const {
    bookings: realtimeBookings = [],
    tables: realtimeTables = [],
    metrics,
    isLoading: realtimeLoading,
    error: realtimeError,
    connectionStatus,
    isConnected,
    refreshData
  } = useRealtimeCommandCenter({ selectedDate });

  // Fallback to simple hook
      if (real-time fails
      const { 
    kpis = [], 
    tables: simpleTables = [], 
    reservations: simpleReservations = [], 
    policies, 
    loading: simpleLoading, 
    error: simpleError, 
    refetch: simpleRefetch 
  } = useCommandCenterDataSimple();

  // Determine which data source to use
      const tables = realtimeTables.length > 0 ? realtimeTables.map(t => ({
    id: t.id,
    name: t.name,
    seats: t.capacity,
    section: 'Main Dining',
    status: t.status || 'AVAILABLE'
  })) : simpleTables;

  const reservations = realtimeBookings.length > 0 ? (() => {
    // Helper: deterministically assign a table
      if (none was set so reservation becomes visible
      const autoAssign = (booking: typeof realtimeBookings[number]) => {
      if (!booking || booking.table_id) return booking.table_id;
      if (!tables.length) return undefined;
      // Capacity fit first
      const fit = [...tables]
        .filter(t => t.seats >= (booking.party_size || 1))
        .sort((a, b) => a.seats - b.seats)[0];
      if (fit) return fit.id;
      // Stable hash fallback
      const hash = (booking.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      return tables[hash % tables.length].id;
    };

    const mapped = realtimeBookings.map(b => ({
      id: b.id,
      guestName: b.guest_name,
      guestEmail: b.guest_email,
      guestPhone: b.guest_phone,
      partySize: b.party_size,
      start: b.booking_time,
      end: new Date(new Date(b.booking_time).getTime() + (b.duration_minutes * 60000)).toISOString(),
      status: (b.status || 'pending').toLowerCase(),
      tableId: autoAssign(b),
      channel: 'WEB', // TODO: derive real channel when available
      specialRequests: b.special_requests,
      depositAmount: 0,
      vip: false
    }));

    if (mapped.length) {
      const unassigned = mapped.filter(r => !r.tableId).length;
      if (unassigned > 0) {
        console.warn('[CommandCenter] Some realtime bookings remain unassigned after auto-assignment', { unassigned, total: mapped.length });
      }
    }
    return mapped;
  })() : simpleReservations;

  const loading = realtimeLoading || simpleLoading;
  const error = realtimeError?.message || simpleError;
  const refetch = isConnected ? refreshData : simpleRefetch;

  // Debug logging for reservation IDs
  useEffect(() => {
    if (reservations && reservations.length > 0) {    }
  }, [reservations]);

  // Command Center state ready

  // Apply filters to reservations before transformation
      const filteredReservations = useMemo(() => {
    try {
      if (!reservations || reservations.length === 0) return [];

      // Log filter application for debugging
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        // Applying filters to reservations
      }

      const filtered = reservations.filter(reservation => {
        // Party size filter
      if (filters.party && filters.party.length > 0) {
          if (!filters.party.includes(reservation.partySize)) {
            return false;
          }
        }

        // Channel filter
      if (filters.channel && filters.channel.length > 0) {
          const reservationChannel = reservation.channel === 'WEB' ? 'WEB' : 
                                   reservation.channel === 'PHONE' ? 'PHONE' : 'WALKIN';
          if (!filters.channel.includes(reservationChannel)) {
            return false;
          }
        }

        // Status filter
      if (filters.status && filters.status.length > 0) {
          const lowerStatus = reservation.status.toLowerCase();
          if (!filters.status.includes(lowerStatus)) {
            return false;
          }
        }

        // Deposits filter
      if (filters.deposits !== null) {
          const hasDeposit = reservation.depositAmount > 0;
          if (filters.deposits === 'ON' && !hasDeposit) return false;
          if (filters.deposits === 'OFF' && hasDeposit) return false;
        }

        // VIP filter
      if (filters.vip !== null) {
          if (filters.vip && !reservation.vip) return false;
          if (!filters.vip && reservation.vip) return false;
        }

        // Search filter
      if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesName = reservation.guestName?.toLowerCase().includes(query);
          const matchesPhone = reservation.guestPhone?.toLowerCase().includes(query);
          const matchesEmail = reservation.guestEmail?.toLowerCase().includes(query);
          const matchesRequests = reservation.specialRequests?.toLowerCase().includes(query);
          const matchesId = reservation.id.toLowerCase().includes(query);
          
          if (!matchesName && !matchesPhone && !matchesEmail && !matchesRequests && !matchesId) {
            return false;
          }
        }

        return true;
      });

      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        // Filter applied successfully
      }

      return filtered;
    } catch (error) {
      console.error('Error filtering reservations:', error);
      return reservations;
    }
  }, [reservations, filters, isConnected, searchQuery]);

  // Transform data for legacy components with error handling
      const legacyTables = useMemo<LegacyTableRow[]>(() => {
    try {
      return tables.map(transformTableToLegacy);
    } catch (error) {
      console.error('Error transforming tables:', error);
      return [];
    }
  }, [tables]);
  
  const legacyReservations = useMemo<LegacyReservation[]>(() => {
    try {
      return filteredReservations.map(transformReservationToLegacy);
    } catch (error) {
      console.error('Error transforming reservations:', error);
      return [];
    }
  }, [filteredReservations]);

  // Calculate filter counts based on actual data
      const filterCounts = useMemo(() => {
    const counts = {
      channels: { WEB: 0, PHONE: 0, WALKIN: 0 },
      statuses: { pending: 0, confirmed: 0, seated: 0, completed: 0, cancelled: 0, no_show: 0 },
      partySizes: {} as Record<number, number>
    };

    reservations.forEach(reservation => {
      // Channel counts
      const channel = reservation.channel === 'WEB' ? 'WEB' : 
                     reservation.channel === 'PHONE' ? 'PHONE' : 'WALKIN';
      counts.channels[channel]++;

      // Status counts  
      const status = reservation.status.toLowerCase() as keyof typeof counts.statuses;
      if (counts.statuses[status] !== undefined) {
        counts.statuses[status]++;
      }

      // Party size counts
      const partySize = reservation.partySize;
      counts.partySizes[partySize] = (counts.partySizes[partySize] || 0) + 1;
    });

    return counts;
  }, [reservations]);

  // Convert KPI data to KpiCard format with enhanced data based on filtered results
      const kpiCards = useMemo<KpiCard[]>(() => {
    if (!reservations || reservations.length === 0) {
      return kpis.map((item) => ({
        id: item.id,
        label: item.label,
        value: item.value,
        spark: item.spark,
        tone: item.tone,
        hint: item.hint,
        trendDirection: 'up' as const,
        sublabel: undefined,
      }));
    }

    // Helper: scope reservations to the currently selected calendar date
      const dateFilteredReservations = filteredReservations.filter(r => {
      try {
        return new Date(r.start).toISOString().slice(0,10) === selectedDate;
      } catch { return false; }
    });

    // Calculate KPIs from date-scoped data to avoid contradictory counts
      const totalBookingsForSelectedDate = dateFilteredReservations.length;
    const confirmedCount = dateFilteredReservations.filter(r => r.status.toLowerCase() === 'confirmed').length;
    const seatedCount = dateFilteredReservations.filter(r => r.status.toLowerCase() === 'seated').length;
    const completedCount = dateFilteredReservations.filter(r => r.status.toLowerCase() === 'completed').length;

    // Guests (scoped vs overall for context tooltip)
      const totalGuestsForSelectedDate = dateFilteredReservations.reduce((sum, r) => sum + r.partySize, 0);
    const totalGuestsAll = filteredReservations.reduce((sum, r) => sum + r.partySize, 0); // used in hint only
      return [
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: totalBookingsForSelectedDate.toString(),
        spark: [],
  tone: 'success' as const,
        hint: `Bookings for ${selectedDate} (${filteredReservations.length} in current view)` ,
        trendDirection: 'up' as const,
        // sublabel removed (date) to avoid UI overflow
      },
      {
        id: 'confirmed-bookings',
        label: 'Confirmed',
        value: confirmedCount.toString(),
        spark: [],
  tone: 'success' as const,
        hint: `Confirmed for ${selectedDate}`,
        trendDirection: 'up' as const,
        // sublabel removed
      },
      {
        id: 'seated-guests',
        label: 'Currently Seated',
        value: seatedCount.toString(),
        spark: [],
  tone: 'default' as const,
        hint: `Seated for ${selectedDate}`,
        trendDirection: 'up' as const,
        // sublabel removed
      },
      {
        id: 'total-guests',
        label: 'Total Guests',
        value: totalGuestsForSelectedDate.toString(),
        spark: [],
  tone: 'success' as const,
        hint: `Guests for ${selectedDate} (${totalGuestsAll} across all loaded)`,
        trendDirection: 'up' as const,
        // sublabel removed
      }
    ];
  }, [kpis, filteredReservations, reservations, filters, selectedDate]);

  const handleExport = () => {
    try {
      // Export current reservations as CSV using original contract data for more complete information
      const csvHeader = 'Date,Time,Guest Name,Party Size,Table,Status,Channel,Phone,Email\n';
      const csvData = reservations.map(r => {
        const date = new Date(r.start).toLocaleDateString();
        const time = new Date(r.start).toLocaleTimeString();
        return [
          date,
          time,
          r.guestName,
          r.partySize,
          r.tableId,
          r.status,
          r.channel,
          r.guestPhone || '',
          r.guestEmail || ''
        ].join(',');
      }).join('\n');
      
      const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reservations-${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${reservations.length} reservations`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export reservations. Please try again.');
    }
  };

  // Notification trigger: send reminders for today's pending reservations
      const handleNotify = async () => {
    try {
      const todayPending = reservations
        .filter(r => r.status === 'PENDING')
        .map(r => r.id);

      if (todayPending.length === 0) {
        toast.info('No pending reservations to notify');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-bulk-notifications', {
        body: {
          bookingIds: todayPending,
          type: 'reminder',
          template: 'booking_reminder'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;
      if (data?.success) {
        toast.success(`Notifications queued for ${todayPending.length} reservation(s)`);
      } else {
        toast.error('Failed to send notifications');
      }
    } catch (err: any) {
      console.error('Notify error:', err);
      toast.error('Failed to send notifications');
    }
  };

  // Convert error string to ErrorState format
      const errorState = useMemo(() => {
    if (!error) return null;
    return {
      message: error,
      requestId: undefined
    };
  }, [error]);

  const selectedReservation = selectedReservationId 
    ? reservations.find(r => r.id === selectedReservationId)
    : null;

  // Helper function to format KPI values
  function formatKpiValue(value: number, format?: 'number' | 'percentage' | 'currency'): string {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percentage':
        return `${value}%`;
      default:
        return value.toString();
    }
  }

  return (
    <main 
      aria-label="Bookings Command Center" 
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6"
    >
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-to-main focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Skip to main content
      </a>

      <div id="main-content" className="max-w-full space-y-4 lg:space-y-6">
        {/* Enhanced Error Panel */}
        {error && (
          <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <div className="text-red-400 font-bold text-sm">Command Center Error</div>
                <div className="text-red-300/80 text-xs">Please refresh or contact support if this persists</div>
              </div>
            </div>
            <div className="text-red-300 text-sm bg-red-900/20 p-3 rounded-lg font-mono">{error}</div>
          </div>
        )}
        
        {/* Loading Timeout Warning */}
        {loading && loadingTimeout && !error && (
          <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-500/30 rounded-xl p-4 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <div className="text-yellow-400 font-bold text-sm">Still Loading...</div>
                <div className="text-yellow-300/80 text-xs">This is taking longer than expected. Try refreshing the page.</div>
              </div>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Refresh Page
            </Button>
          </div>
        )}

        {/* Tenant Test Component - Development Only */}
        {import.meta.env.MODE === 'development' && (
          <div className="max-w-lg">
            <TenantTestComponent />
          </div>
        )}



        {/* Top Bar */}
        <TopBar 
          onDateChange={setSelectedDate}
          selectedDate={selectedDate}
          onNewReservation={handleNewReservation}
          onExport={handleExport}
          onNotify={handleNotify}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />

        {/* Debug Component - Remove in production */}
        {import.meta.env.MODE === 'development' && error && (
          <div className="mb-4">
            <DebugEdgeFunctions />
          </div>
        )}
        
        {/* Test Notification Button - Development Only */}
        {import.meta.env.MODE === 'development' && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={async () => {
                try {
                  if (!tenantId) {
                    console.error('No tenant ID available for test notification');
                    return;
                  }
                  await createTestReservationNotification(tenantId);
                } catch (error) {
                  console.error('Test notification failed:', error);
                }
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              🔔 Test New Reservation Notification
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <KpiStrip 
          items={kpiCards}
          loading={loading}
        />

        {/* Enhanced Filters Section */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-white/10 p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Filters 
              value={filters}
              onChange={setFilters}
              disabled={loading}
              filterCounts={filterCounts}
            />
            
            {/* Enhanced filter result summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-600/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="text-white/90 font-medium">
                    Showing {legacyReservations.length} of {reservations.length} reservations
                  </span>
                  {Object.keys(filters).some(key => {
                    const value = filters[key as keyof FiltersState];
                    return value && (Array.isArray(value) ? value.length > 0 : true);
                  }) && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
                      Filtered
                    </span>
                  )}
                </div>
              </div>
              
              {/* Enhanced filter reset button */}
              {Object.keys(filters).some(key => {
                const value = filters[key as keyof FiltersState];
                return value && (Array.isArray(value) ? value.length > 0 : true);
              }) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="h-8 text-xs bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50 text-white/80 hover:text-white"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Split Layout */}
        <MainSplit
          tables={legacyTables}
          reservations={legacyReservations}
          onSelectReservation={setSelectedReservationId}
          onCreateReservationAt={handleQuickCreateAt}
          onFocusTable={setFocusTableId}
          focusTableId={focusTableId}
          loading={loading}
          error={errorState}
        />
      </div>

      {/* Reservation Details Drawer */}
      <ReservationDrawer
        open={!!selectedReservationId}
        reservation={selectedReservation}
        policy={policies}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReservationId(null);
          }
        }}
        onEdit={() => {
          // Edit reservation functionality
        }}
        onMove={() => {
          // Move reservation functionality
        }}
        onMessage={() => {
          // Message guest functionality
        }}
        onCancel={async () => {
          if (!selectedReservationId) return;
          const res = await cancelReservationAction({ reservationId: selectedReservationId, reason: 'Cancelled by owner' });
          if ((res as any)?.ok === false) {
            toast.error(`Cancel failed: ${(res as any).error}`);
          } else {
            toast.success('Reservation cancelled');
            setSelectedReservationId(null);
            await refetch();
          }
        }}
        onDelete={async () => {
          if (!selectedReservationId) return;
          try {
            const { error } = await supabase.from('bookings').delete().eq('id', selectedReservationId);
            if (error) throw error;
            toast.success('Reservation deleted');
            setSelectedReservationId(null);
            await refetch();
          } catch (e: any) {
            toast.error(`Delete failed: ${e?.message || e}`);
          }
        }}
        onApprove={async () => {
          if (!selectedReservationId || !tenantId) return;
          try {
            const response = await supabase.functions.invoke('reservation-status', {
              body: {
                reservation_id: selectedReservationId,
                action: 'approve',
                tenant_id: tenantId
              }
            });
            
            if (response.error) {
              toast.error(`Approval failed: ${response.error.message}`);
            } else {
              toast.success('Reservation approved! Customer has been notified.');
              await refetch();
              setSelectedReservationId(null);
            }
          } catch (error) {
            toast.error(`Approval failed: ${(error as any)?.message || 'Unknown error'}`);
          }
        }}
        onDecline={async () => {
          if (!selectedReservationId || !tenantId) return;
          try {
            const response = await supabase.functions.invoke('reservation-status', {
              body: {
                reservation_id: selectedReservationId,
                action: 'decline',
                tenant_id: tenantId
              }
            });
            
            if (response.error) {
              toast.error(`Decline failed: ${response.error.message}`);
            } else {
              toast.success('Reservation declined. Customer has been notified.');
              await refetch();
              setSelectedReservationId(null);
            }
          } catch (error) {
            toast.error(`Decline failed: ${(error as any)?.message || 'Unknown error'}`);
          }
        }}
      />

      {/* New Reservation uses SmartBookingWizard */}
      <SmartBookingWizard open={newOpen} onOpenChange={setNewOpen} />
    </main>
  );
}




