import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';

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

export interface DatabaseBooking {
  id: string;
  guest_name?: string;
  booking_time: string;
  duration_minutes?: number;
  party_size: number;
  status?: string;
  deposit_amount?: number;
  special_requests?: string;
  guest_phone?: string;
}

export interface CommandCenterData {
  kpis: KpiItem[];
  tables: TableRow[];
  reservations: Reservation[];
  policies: Record<string, unknown>;
  loading: boolean;
  error: string | null;
}

export interface UseCommandCenterDataParams {
  date: string;
  filters: {
    status?: string[];
    channel?: string[];
    section?: string[];
  };
}

// Constants
const DEFAULT_DURATION_MINUTES = 90;
const TABLE_COUNT = 20;
const TABLES_PER_SECTION = 7;
const NO_SHOW_RISK_MULTIPLIER = 0.15;
const KITCHEN_PACING_MULTIPLIER = 20;
const SEAT_OPTIONS = [2, 4, 6, 8] as const;
const TABLE_SECTIONS: Array<'Patio' | 'Bar' | 'Main'> = ['Patio', 'Bar', 'Main'];

// Utility functions
const generateTableId = (index: number): string => `table-${index + 1}`;

const getTableSection = (index: number): 'Patio' | 'Bar' | 'Main' => {
  return TABLE_SECTIONS[Math.floor(index / TABLES_PER_SECTION)] || 'Main';
};

const getRandomCapacity = (): number => {
  return SEAT_OPTIONS[Math.floor(Math.random() * SEAT_OPTIONS.length)];
};

const transformBookingToReservation = (booking: DatabaseBooking): Reservation => {
  // CRITICAL FIX: Validate booking data before transformation
  if (!booking || !booking.id) {
    throw new Error('Invalid booking data: missing required fields');
  }

  const guestName = booking.guest_name || `Guest ${booking.id.slice(0, 6)}`;
  const startTime = new Date(booking.booking_time);
  
  // FIX: Validate date before using it
  if (isNaN(startTime.getTime())) {
    throw new Error(`Invalid booking time: ${booking.booking_time}`);
  }
  
  const duration = booking.duration_minutes || DEFAULT_DURATION_MINUTES;
  
  // FIX: Validate duration is positive
  if (duration <= 0) {
    console.warn(`Invalid duration for booking ${booking.id}, using default`);
  }
  
  const endTime = new Date(startTime.getTime() + (Math.max(duration, 30) * 60 * 1000)); // Min 30 minutes

  return {
    id: booking.id,
    tableId: generateTableId(Math.floor(Math.random() * TABLE_COUNT)), // TODO: Replace with actual table assignment
    guestName,
    partySize: Math.max(1, booking.party_size), // FIX: Ensure party size is at least 1
    start: booking.booking_time,
    end: endTime.toISOString(),
    status: (booking.status as Reservation['status']) || 'confirmed',
    channel: 'online', // TODO: Add channel field to database
    deposit: booking.deposit_amount || undefined,
    isVip: booking.special_requests?.toLowerCase().includes('vip') || false,
    guestPhone: booking.guest_phone || undefined,
    specialRequests: booking.special_requests || undefined
  };
};

const getTableStatus = (
  tableId: string, 
  reservations: Reservation[], 
  currentTime: Date
): TableRow['status'] => {
  const currentReservation = reservations.find(reservation => 
    reservation.tableId === tableId &&
    new Date(reservation.start) <= currentTime &&
    new Date(reservation.end) >= currentTime &&
    reservation.status !== 'cancelled'
  );

  if (currentReservation) {
    return currentReservation.status === 'seated' ? 'occupied' : 'reserved';
  }

  return 'available';
};

const applyFilters = (
  reservations: Reservation[], 
  filters: UseCommandCenterDataParams['filters']
): Reservation[] => {
  return reservations.filter(reservation => {
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(reservation.status)) {
        return false;
      }
    }

    // Filter by channel
    if (filters.channel && filters.channel.length > 0) {
      if (!filters.channel.includes(reservation.channel)) {
        return false;
      }
    }

    // TODO: Add section filtering when table assignments are real
    
    return true;
  });
};

const calculateKPIs = (tables: TableRow[], reservations: Reservation[]): KpiItem[] => {
  // Basic table statistics
  const occupiedTables = tables.filter(table => table.status === 'occupied');
  const occupancy = tables.length > 0 
    ? Math.round((occupiedTables.length / tables.length) * 100) 
    : 0;

  // Reservation statistics
  const activeReservations = reservations.filter(reservation => 
    reservation.status !== 'cancelled'
  );
  const covers = activeReservations.reduce((sum, reservation) => 
    sum + reservation.partySize, 0
  );

  // No-show risk calculation
  const confirmedReservations = activeReservations.filter(reservation => 
    reservation.status === 'confirmed'
  );
  const noShowRisk = confirmedReservations.length > 0 
    ? Math.round((confirmedReservations.length * NO_SHOW_RISK_MULTIPLIER) * 100) / 100
    : 0;

  // Average party size
  const avgPartySize = activeReservations.length > 0 
    ? Math.round((covers / activeReservations.length) * 10) / 10
    : 0;

  // Kitchen pacing based on current hour load
  const currentHour = new Date().getHours();
  const currentHourReservations = reservations.filter(reservation => {
    const reservationHour = new Date(reservation.start).getHours();
    return reservationHour === currentHour && reservation.status === 'seated';
  });
  const kitchenPacing = Math.min(100, currentHourReservations.length * KITCHEN_PACING_MULTIPLIER);

  return [
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
};

export function useCommandCenterData({ date, filters }: UseCommandCenterDataParams) {
  const [data, setData] = useState<CommandCenterData>({
    kpis: [],
    tables: [],
    reservations: [],
    policies: {},
    loading: true,
    error: null
  });

  useEffect(() => {
    const loadData = async () => {
      await loadCommandCenterData();
    };
    
    loadData();
    
    // Set up real-time subscriptions
    const tableSubscription = supabase
      .channel('command-center-tables')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        () => {
          loadCommandCenterData();
        }
      )
      .subscribe();

    return () => {
      tableSubscription.unsubscribe();
    };
  }, [date, filters]);

  const loadCommandCenterData = async (): Promise<void> => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Validate date parameter
      const selectedDate = new Date(date);
      if (isNaN(selectedDate.getTime())) {
        throw new Error('Invalid date provided');
      }

      // Create date range for the selected day
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);

      // Fetch bookings with proper error handling
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          guest_name,
          booking_time,
          duration_minutes,
          party_size,
          status,
          deposit_amount,
          special_requests,
          guest_phone
        `)
        .gte('booking_time', dateStart.toISOString())
        .lte('booking_time', dateEnd.toISOString())
        .order('booking_time', { ascending: true });

      if (bookingsError) {
        throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
      }

      // Transform bookings data with type safety
      const reservations: Reservation[] = (bookingsData || []).map(
        (booking: DatabaseBooking) => transformBookingToReservation(booking)
      );

      // Apply filters if provided
      const filteredReservations = applyFilters(reservations, filters);

      // Generate table data (TODO: Replace with actual restaurant_tables query)
      const currentTime = new Date();
      const tables: TableRow[] = Array.from({ length: TABLE_COUNT }, (_, i): TableRow => {
        const tableId = generateTableId(i);
        
        return {
          id: tableId,
          name: `Table ${i + 1}`,
          capacity: getRandomCapacity(),
          section: getTableSection(i),
          status: getTableStatus(tableId, filteredReservations, currentTime)
        };
      });

      // Calculate KPIs with proper error handling
      const kpis = calculateKPIs(tables, filteredReservations);

      setData({
        kpis,
        tables,
        reservations: filteredReservations,
        policies: {}, // TODO: Add policies data
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Failed to load command center data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  return data;
}
