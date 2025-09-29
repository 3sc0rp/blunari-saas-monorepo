import React from "react";
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
  status: reservation.status.toLowerCase() as 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled',
  channel: reservation.channel === 'WEB' ? 'online' : 
           reservation.channel === 'PHONE' ? 'phone' : 'walkin',
  deposit: reservation.depositAmount,
  isVip: reservation.vip,
  guestPhone: reservation.guestPhone,
  specialRequests: reservation.specialRequests
});

export default function CommandCenter() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filters, setFilters] = useState<FiltersState>({});
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [focusTableId, setFocusTableId] = useState<string | undefined>();
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
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
            // Clear filters if any are active
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
  } = useRealtimeCommandCenter();

  // Fallback to simple hook if real-time fails
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

  const reservations = realtimeBookings.length > 0 ? realtimeBookings.map(b => ({
    id: b.id,
    guestName: b.guest_name,
    guestEmail: b.guest_email,
    guestPhone: b.guest_phone,
    partySize: b.party_size,
    start: b.booking_time,
    end: new Date(new Date(b.booking_time).getTime() + (b.duration_minutes * 60000)).toISOString(),
    status: b.status.toUpperCase(),
    tableId: b.table_id,
    channel: 'WEB', // Default channel, could be enhanced
    specialRequests: b.special_requests,
    depositAmount: 0, // Default deposit
    vip: false // Default VIP status
  })) : simpleReservations;

  const loading = realtimeLoading || simpleLoading;
  const error = realtimeError?.message || simpleError;
  const refetch = isConnected ? refreshData : simpleRefetch;

  // Add debug logging in development mode
  if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
    console.log('🏢 Command Center State:', {
      loading,
      error,
      hasKpis: kpis?.length > 0,
      hasTables: tables?.length > 0,
      hasReservations: reservations?.length > 0,
      kpiCount: kpis?.length,
      tableCount: tables?.length,
      reservationCount: reservations?.length,
      connectionStatus: connectionStatus?.overall,
      isRealtime: isConnected,
      activeFilters: Object.keys(filters).filter(key => {
        const value = filters[key as keyof FiltersState];
        return value && (Array.isArray(value) ? value.length > 0 : true);
      })
    });
  }

  // Apply filters to reservations before transformation
  const filteredReservations = useMemo(() => {
    try {
      if (!reservations || reservations.length === 0) return [];

      // Log filter application for debugging
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.log('🔍 Applying filters to', reservations.length, 'reservations', { filters });
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

        return true;
      });

      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.log('🔍 Filtered result:', filtered.length, 'reservations');
      }

      return filtered;
    } catch (error) {
      console.error('Error filtering reservations:', error);
      return reservations;
    }
  }, [reservations, filters, isConnected]);

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
      statuses: { confirmed: 0, seated: 0, completed: 0, cancelled: 0, no_show: 0 },
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

  // Convert KPI data to KpiCard format with enhanced data
  const kpiCards = useMemo<KpiCard[]>(() => {
    return kpis.map((item) => {
      return {
        id: item.id,
        label: item.label,
        value: item.value,
        spark: item.spark,
        tone: item.tone,
        hint: item.hint,
        trendDirection: 'up', // Could be enhanced based on sparkline data
        sublabel: undefined,
      };
    });
  }, [kpis]);

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
      className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6"
    >
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-to-main focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Skip to main content
      </a>

      <div id="main-content" className="max-w-full space-y-6">
        {/* Debug Panel - Remove in production */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
            <div className="text-red-400 font-semibold mb-2">❌ Command Center Error</div>
            <div className="text-red-300 text-sm mb-3">{error}</div>
          </div>
        )}

        {/* Tenant Test Component - Development Only */}
        {import.meta.env.MODE === 'development' && (
          <div className="max-w-lg">
            <TenantTestComponent />
          </div>
        )}

        {/* Connection Status Indicator */}
        {connectionStatus && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
              connectionStatus.overall === 'connected' 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : connectionStatus.overall === 'connecting'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                : connectionStatus.overall === 'error'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus.overall === 'connected' ? 'bg-green-400' :
                connectionStatus.overall === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                connectionStatus.overall === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="font-medium">
                {connectionStatus.overall === 'connected' ? 'Live' :
                 connectionStatus.overall === 'connecting' ? 'Connecting' :
                 connectionStatus.overall === 'error' ? 'Offline' : 'Disconnected'}
              </span>
            </div>
            {connectionStatus.overall !== 'connected' && (
              <span className="text-white/50">Using polling mode</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-6 w-6 p-0 text-white/70 hover:text-white"
              title="Refresh data"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        )}

        {/* Top Bar */}
        <TopBar 
          onDateChange={setSelectedDate}
          selectedDate={selectedDate}
          onNewReservation={handleNewReservation}
          onExport={handleExport}
          onNotify={handleNotify}
        />

        {/* Debug Component - Remove in production */}
        {import.meta.env.MODE === 'development' && error && (
          <div className="mb-4">
            <DebugEdgeFunctions />
          </div>
        )}

        {/* KPI Strip */}
        <KpiStrip 
          items={kpiCards}
          loading={loading}
        />

        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <Filters 
            value={filters}
            onChange={setFilters}
            disabled={loading}
            filterCounts={filterCounts}
          />
          {/* Filter result summary */}
          <div className="text-sm text-white/60">
            Showing {legacyReservations.length} of {reservations.length} reservations
            {Object.keys(filters).some(key => {
              const value = filters[key as keyof FiltersState];
              return value && (Array.isArray(value) ? value.length > 0 : true);
            }) && (
              <span className="ml-2 text-blue-300">
                (filtered)
              </span>
            )}
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
          console.log('Edit reservation:', selectedReservationId);
        }}
        onMove={() => {
          console.log('Move reservation:', selectedReservationId);
        }}
        onMessage={() => {
          console.log('Message guest:', selectedReservationId);
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
          if (!selectedReservationId) return;
          const res = await moveReservationAction({ reservationId: selectedReservationId, status: 'CONFIRMED' as any });
          if ((res as any)?.ok === false) {
            toast.error(`Approve failed: ${(res as any).error}`);
          } else {
            toast.success('Reservation confirmed');
            await refetch();
          }
        }}
      />

      {/* New Reservation uses SmartBookingWizard */}
      <SmartBookingWizard open={newOpen} onOpenChange={setNewOpen} />
    </main>
  );
}
