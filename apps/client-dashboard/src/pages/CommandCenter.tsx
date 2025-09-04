import React from "react";
import { TopBar } from "@/components/command-center/TopBar.tsx";
import { KpiStrip, type KpiCard } from "@/components/command-center/KpiStrip.tsx";
import { Filters } from "@/components/command-center/Filters.tsx";
import { MainSplit } from "@/components/command-center/MainSplit.tsx";
import { ReservationDrawer } from "@/components/command-center/ReservationDrawer.tsx";
import { AuthDebugger } from "@/components/command-center/AuthDebugger.tsx";
import { TenantTestComponent } from "@/components/TenantTestComponent.tsx";
import { DebugEdgeFunctions } from "@/components/debug/DebugEdgeFunctions.tsx";
import { useCommandCenterData } from "@/hooks/useCommandCenterDataNew.ts";
import { useReservationActions } from "@/hooks/useReservationActions.ts";
import { useState, useMemo } from "react";
import { FiltersState } from "@/components/command-center/Filters.tsx";
import { 
  Filters as FiltersType, 
  shouldUseMocks,
  Reservation as ContractReservation,
  TableRow as ContractTableRow
} from "@/lib/contracts.ts";
import { toast } from "sonner";
import type { TableRow as LegacyTableRow, Reservation as LegacyReservation } from "@/hooks/useCommandCenterData";

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
  const [advancedMode, setAdvancedMode] = useState<boolean>(
    localStorage.getItem('commandCenter.advancedMode') === 'true'
  );

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

  // Persist advanced mode preference
  const handleAdvancedModeChange = (mode: boolean) => {
    setAdvancedMode(mode);
    localStorage.setItem('commandCenter.advancedMode', mode.toString());
  };

  const handleNewReservation = async () => {
    try {
      // Mock new reservation for now - in real app would open a modal
      if (shouldUseMocks()) {
        console.log('New reservation shortcut triggered (mock mode)');
        return;
      }
      
      // CRITICAL FIX: Proper validation before accessing array elements
      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        toast.error('No tables available. Please ensure your restaurant has tables configured.');
        return;
      }
      
      // CRITICAL FIX: Find available table instead of using first table blindly  
      const availableTable = tables.find(table => 
        table.status === 'AVAILABLE' && table.seats > 0 // FIX: Use correct enum value
      );
      
      if (!availableTable) {
        toast.error('No available tables found. All tables are currently occupied or reserved.');
        return;
      }
      
      // CRITICAL FIX: Validate table data before using it
      if (!availableTable.id || !availableTable.seats) {
        toast.error('Invalid table data. Please refresh and try again.');
        return;
      }
      
      // Example of creating a reservation programmatically
      const result = await createReservationAction({
        tableId: availableTable.id,
        start: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours from now
        partySize: Math.min(4, availableTable.seats), // Don't exceed table capacity
        guestName: 'Test Guest',
        guestEmail: 'test@example.com',
        channel: 'WEB'
      });
      
      if (result.ok) {
        toast.success('Reservation created successfully');
      } else {
        toast.error(`Failed to create reservation: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create new reservation:', error);
      toast.error('Failed to create reservation. Please try again.');
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

  const {
    kpis,
    tables,
    reservations,
    policies,
    loading,
    error
  } = useCommandCenterData({
    date: selectedDate,
    filters: contractFilters
  });

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
      return reservations.map(transformReservationToLegacy);
    } catch (error) {
      console.error('Error transforming reservations:', error);
      return [];
    }
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
            <div className="text-red-400 font-semibold mb-2">❌ Command Center Error:</div>
            <div className="text-red-300 text-sm mb-4">{error}</div>
            <AuthDebugger />
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
          advancedMode={advancedMode}
          onAdvancedModeChange={handleAdvancedModeChange}
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
        <Filters 
          value={filters}
          onChange={setFilters}
          disabled={loading}
        />

        {/* Main Split Layout */}
        <MainSplit
          tables={legacyTables}
          reservations={legacyReservations}
          onSelectReservation={setSelectedReservationId}
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
          console.log('Cancel reservation:', selectedReservationId);
          // TODO: Implement cancellation
        }}
      />
    </main>
  );
}
