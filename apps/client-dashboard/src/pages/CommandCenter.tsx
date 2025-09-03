import React from "react";
import { TopBar } from "@/components/command-center/TopBar";
import { KpiStrip } from "@/components/command-center/KpiStrip";
import { Filters } from "@/components/command-center/Filters";
import { MainSplit } from "@/components/command-center/MainSplit";
import { ReservationDrawer } from "@/components/command-center/ReservationDrawer";
import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import { useState } from "react";
import { FiltersState } from "@/components/command-center/Filters";

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

  const selectedReservation = selectedReservationId 
    ? reservations.find(r => r.id === selectedReservationId)
    : null;

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
          items={kpis}
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
          error={error}
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
