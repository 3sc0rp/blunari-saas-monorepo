import React from "react";
import { TopBar } from "@/components/command-center/TopBar.tsx";
import { KpiStrip, type KpiCard } from "@/components/command-center/KpiStrip.tsx";
import { Filters } from "@/components/command-center/Filters.tsx";
import { MainSplit } from "@/components/command-center/MainSplit.tsx";
import { ReservationDrawer } from "@/components/command-center/ReservationDrawer.tsx";
import { useCommandCenterData, type KpiItem } from "@/hooks/useCommandCenterData.ts";
import { useState, useMemo } from "react";
import { FiltersState } from "@/components/command-center/Filters.tsx";

export default function CommandCenter() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filters, setFilters] = useState<FiltersState>({});
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [focusTableId, setFocusTableId] = useState<string | undefined>();

  const {
    kpis,
    tables,
    reservations,
    policies,
    loading,
    error
  } = useCommandCenterData({
    date: selectedDate,
    filters
  });

  // Convert KpiItem to KpiCard format
  const kpiCards = useMemo<KpiCard[]>(() => {
    return kpis.map((item: KpiItem) => ({
      id: item.id,
      label: item.label,
      value: formatKpiValue(item.value, item.format),
      trendDirection: item.change && item.change > 0 ? 'up' : 'down',
      sublabel: item.change ? `${item.change > 0 ? '+' : ''}${item.change}%` : undefined,
    }));
  }, [kpis]);

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
        {/* Top Bar */}
        <TopBar 
          onDateChange={setSelectedDate}
          selectedDate={selectedDate}
          onNewReservation={() => {
            // TODO: Open new reservation modal
            console.log('New reservation clicked');
          }}
          onExport={() => {
            // TODO: Handle export
            console.log('Export clicked');
          }}
        />

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
          tables={tables}
          reservations={reservations}
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
