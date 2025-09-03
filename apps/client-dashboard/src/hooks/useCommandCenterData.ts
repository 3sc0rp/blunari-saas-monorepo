import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types matching MainSplit.tsx interfaces
export interface TableRow {
  id: string;
  name: string;
  capacity: number;
  section: 'Patio' | 'Bar' | 'Main';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

export interface Reservation {
  id: string;
  tableId: string;
  guestName: string;
  partySize: number;
  start: string;
  end: string;
  status: 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled';
  channel: 'online' | 'phone' | 'walkin';
  deposit?: number;
  isVip?: boolean;
  guestPhone?: string;
  specialRequests?: string;
}

export interface KpiItem {
  id: string;
  label: string;
  value: number;
  change?: number;
  format?: 'number' | 'percentage' | 'currency';
}

export function useCommandCenterData({ date, filters }: { date: string; filters: any }) {
  const [data, setData] = useState({
    kpis: [] as KpiItem[],
    tables: [] as TableRow[],
    reservations: [] as Reservation[],
    policies: {},
    loading: true,
    error: null as string | null
  });

  useEffect(() => {
    loadCommandCenterData();
    
    // Set up real-time subscriptions
    const tableSubscription = supabase
      .channel('command-center-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadCommandCenterData();
      })
      .subscribe();

    return () => {
      tableSubscription.unsubscribe();
    };
  }, [date, filters]);

  const loadCommandCenterData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Get bookings for selected date
      const selectedDate = new Date(date);
      const dateStart = new Date(selectedDate.setHours(0, 0, 0, 0));
      const dateEnd = new Date(selectedDate.setHours(23, 59, 59, 999));

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .gte('booking_time', dateStart.toISOString())
        .lte('booking_time', dateEnd.toISOString())
        .order('booking_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Transform bookings data
      const reservations: Reservation[] = (bookingsData || []).map(booking => {
        const guestName = booking.guest_name || `Guest ${booking.id.slice(0, 6)}`;

        // Calculate end time using duration_minutes or default
        const startTime = new Date(booking.booking_time);
        const duration = booking.duration_minutes || 90; // minutes
        const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

        return {
          id: booking.id,
          tableId: `table-${Math.floor(Math.random() * 20) + 1}`, // Mock table assignment
          guestName,
          partySize: booking.party_size,
          start: booking.booking_time,
          end: endTime.toISOString(),
          status: (booking.status as any) || 'confirmed',
          channel: 'online', // Default channel
          deposit: booking.deposit_amount || undefined,
          isVip: booking.special_requests?.toLowerCase().includes('vip') || false,
          guestPhone: booking.guest_phone || undefined,
          specialRequests: booking.special_requests || undefined
        };
      });

      // Generate mock table data (in real app, this would come from a tables table)
      const tables: TableRow[] = Array.from({ length: 20 }, (_, i) => {
        const tableId = `table-${i + 1}`;
        const sections: Array<'Patio' | 'Bar' | 'Main'> = ['Patio', 'Bar', 'Main'];
        const section = sections[Math.floor(i / 7)] || 'Main';
        
        // Check if table has current reservation
        const currentTime = new Date();
        const currentReservation = reservations.find(r => 
          r.tableId === tableId &&
          new Date(r.start) <= currentTime &&
          new Date(r.end) >= currentTime &&
          r.status !== 'cancelled'
        );

        let status: 'available' | 'occupied' | 'reserved' | 'maintenance' = 'available';
        if (currentReservation) {
          status = currentReservation.status === 'seated' ? 'occupied' : 'reserved';
        }

        return {
          id: tableId,
          name: `Table ${i + 1}`,
          capacity: [2, 4, 6, 8][Math.floor(Math.random() * 4)],
          section,
          status
        };
      });

      // Calculate KPIs
      const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
      const occupiedTables = tables.filter(t => t.status === 'occupied');
      const occupancy = Math.round((occupiedTables.length / tables.length) * 100);
      
      const todayReservations = reservations.filter(r => r.status !== 'cancelled');
      const covers = todayReservations.reduce((sum, r) => sum + r.partySize, 0);
      
      const confirmedReservations = todayReservations.filter(r => r.status === 'confirmed');
      const noShowRisk = confirmedReservations.length > 0 
        ? Math.round((confirmedReservations.length * 0.15) * 100) / 100 
        : 0;
      
      const avgPartySize = todayReservations.length > 0 
        ? Math.round((covers / todayReservations.length) * 10) / 10
        : 0;
      
      // Kitchen pacing based on current hour load
      const currentHour = new Date().getHours();
      const currentHourReservations = reservations.filter(r => {
        const resHour = new Date(r.start).getHours();
        return resHour === currentHour && r.status === 'seated';
      });
      const kitchenPacing = Math.min(100, (currentHourReservations.length * 20));

      const kpis: KpiItem[] = [
        {
          id: 'occupancy',
          label: 'Occupancy',
          value: occupancy,
          format: 'percentage'
        },
        {
          id: 'covers',
          label: 'Covers',
          value: covers,
          format: 'number'
        },
        {
          id: 'no-show-risk',
          label: 'No-Show Risk',
          value: noShowRisk,
          format: 'percentage'
        },
        {
          id: 'avg-party',
          label: 'Avg Party',
          value: avgPartySize,
          format: 'number'
        },
        {
          id: 'kitchen-pacing',
          label: 'Kitchen Pacing',
          value: kitchenPacing,
          format: 'percentage'
        }
      ];

      setData({
        kpis,
        tables,
        reservations,
        policies: {},
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Failed to load command center data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  };

  return data;
}
