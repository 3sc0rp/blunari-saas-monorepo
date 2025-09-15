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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { FiltersState } from "@/components/command-center/Filters.tsx";
import { 
  Filters as FiltersType, 
  shouldUseMocks,
  Reservation as ContractReservation,
  TableRow as ContractTableRow
} from "@/lib/contracts.ts";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
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

  const { kpis, tables, reservations, policies, loading, error, refetch, isStale, liveConnected, requestId } = useCommandCenterData({ date: selectedDate, filters: contractFilters });

  // Add debug logging in development mode
  if (import.meta.env.VITE_ENABLE_DEV_MODE === 'true') {
    console.log('🏢 Command Center State:', {
      loading,
      error,
      hasKpis: kpis?.length > 0,
      hasTables: tables?.length > 0,
      hasReservations: reservations?.length > 0,
      kpiCount: kpis?.length,
      tableCount: tables?.length,
      reservationCount: reservations?.length
    });
  }

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
            {requestId && (
              <div className="text-xs text-red-200">
                requestId: <code className="px-1 py-0.5 bg-red-950/40 rounded">{requestId}</code>
                <a className="ml-3 underline hover:no-underline" href={`https://admin.blunari.ai/logs?requestId=${encodeURIComponent(requestId)}`} target="_blank" rel="noreferrer">View logs</a>
              </div>
            )}
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

      {/* New Reservation Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="table">Table</Label>
                <Select value={formTableId} onValueChange={setFormTableId}>
                  <SelectTrigger id="table"><SelectValue placeholder="Select table" /></SelectTrigger>
                  <SelectContent>
                    {legacyTables.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.capacity})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="party">Party Size</Label>
                <Input id="party" type="number" min={1} max={20} value={formParty} onChange={(e) => setFormParty(parseInt(e.target.value || '0'))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" min={30} step={15} value={formDuration} onChange={(e) => setFormDuration(parseInt(e.target.value || '0'))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Guest Name</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={isActionLoading}>Cancel</Button>
            <Button onClick={async () => {
              try {
                if (!formTableId) { toast.error('Select a table'); return; }
                if (!formName) { toast.error('Enter guest name'); return; }
                const startIso = new Date(`${formDate}T${formTime}:00`).toISOString();
                const endIso = new Date(new Date(startIso).getTime() + formDuration * 60000).toISOString();
                const res = await createReservationAction({
                  tableId: formTableId,
                  start: startIso,
                  end: endIso,
                  partySize: formParty,
                  guestName: formName,
                  guestEmail: formEmail || undefined,
                  guestPhone: formPhone || undefined,
                  specialRequests: formNotes || undefined,
                  channel: 'WEB'
                });
                if ((res as any)?.ok === false) {
                  toast.error(`Create failed: ${(res as any).error}`);
                } else {
                  toast.success('Reservation created');
                  setNewOpen(false);
                  setFormName(""); setFormEmail(""); setFormPhone(""); setFormNotes("");
                  await refetch();
                }
              } catch (err) {
                console.error(err);
                toast.error('Failed to create reservation');
              }
            }} disabled={isActionLoading}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
