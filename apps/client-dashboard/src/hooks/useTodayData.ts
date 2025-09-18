import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Database } from "@/integrations/supabase/types";

// Use actual database types
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type RestaurantTableRow = Database['public']['Tables']['restaurant_tables']['Row'];


export interface TodayData {
  totalCovers: number;
  reservations: number;
  walkIns: number;
  averageWaitTime: number;
  estimatedRevenue: number;
  satisfactionScore: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  bookings: BookingWithProfiles[];
  waitlistEntries: WaitlistEntryWithProfiles[];
  tables: RestaurantTable[];
}

// Updated interface to match actual database schema
interface BookingWithProfiles {
  id: string;
  booking_time: string;
  party_size: number;
  status: string;
  table_id?: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  duration_minutes: number;
  special_requests?: string | null;
  deposit_amount?: number | null;
  deposit_paid: boolean;
  deposit_required: boolean;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  // Mock fields for compatibility
  customer_name?: string;
  table_number?: string;
  source?: string;
}

// Mock interface since waitlist_entries doesn't exist in database
interface WaitlistEntryWithProfiles {
  id: string;
  created_at: string;
  party_size: number;
  status: string;
  customer_name?: string;
  phone?: string;
  special_requests?: string;
  priority?: string;
  estimated_wait_minutes?: number;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
  };
}

// Updated interface to match actual database schema
interface RestaurantTable {
  id: string;
  name: string; // Changed from table_number
  capacity: number;
  active: boolean; // Changed from status
  table_type: string;
  position_x: number | null;
  position_y: number | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Compatibility fields
  table_number?: string;
  status?: string;
}

export const useTodayData = () => {
  const { tenant } = useTenant();

  const query = useQuery({
    queryKey: ["today-data", tenant?.id],
    queryFn: async (): Promise<TodayData> => {
      if (!tenant) {
        throw new Error("No tenant available");
      }

      try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch today's bookings with improved error handling
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('tenant_id', tenant.id)
          .gte('booking_time', startOfDay.toISOString())
          .lte('booking_time', endOfDay.toISOString())
          .order('booking_time', { ascending: true });

        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError);
          throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
        }

        // Build waitlist entries from real data if present: bookings with status 'waiting'
        const waitlistEntries: WaitlistEntryWithProfiles[] = (bookings || [])
          .filter(b => (b as any).status === 'waiting')
          .map(b => ({
            id: (b as any).id,
            created_at: (b as any).created_at,
            party_size: (b as any).party_size || 0,
            status: 'waiting',
            customer_name: (b as any).guest_name,
            phone: (b as any).guest_phone || undefined,
            special_requests: (b as any).special_requests || undefined,
            priority: 'standard',
            estimated_wait_minutes: undefined,
            profiles: {
              first_name: undefined,
              last_name: undefined,
              email: (b as any).guest_email,
              phone: (b as any).guest_phone || undefined,
              avatar_url: undefined
            }
          }));

        // Fetch restaurant tables with proper column names
        const { data: tables, error: tablesError } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('active', true) // Changed from 'status' to 'active'
          .order('name', { ascending: true }); // Changed from 'table_number' to 'name'

        if (tablesError) {
          console.error("Error fetching tables:", tablesError);
          throw new Error(`Failed to fetch tables: ${tablesError.message}`);
        }

        // Calculate metrics with proper data handling
        const bookingsList: BookingWithProfiles[] = (bookings || []).map(booking => ({
          ...booking,
          // Add compatibility fields for existing components
          customer_name: (booking as any).guest_name,
          table_number: (booking as any).table_id || undefined,
        }));

        const waitlistList = waitlistEntries || [];
        
        const tablesList: RestaurantTable[] = (tables || []).map(table => ({
          ...table,
          // Add compatibility fields for existing components
          table_number: table.name,
          status: table.active ? 'active' : 'inactive',
        }));

        const completedBookings = bookingsList.filter(b => b.status === 'completed').length;
        const cancelledBookings = bookingsList.filter(b => b.status === 'cancelled').length;
        const noShowBookings = bookingsList.filter(b => b.status === 'no_show').length;
        const totalCovers = bookingsList.reduce((sum, b) => sum + (b.party_size || 0), 0);
        
        // Reservations based on real statuses; walk-ins not tracked without explicit column
        const reservations = bookingsList.filter(b => ['confirmed','seated','completed'].includes((b as any).status)).length;
        const walkIns = 0;

        // Calculate average wait time safely
        const averageWaitTime = waitlistList.length > 0 ? 
          Math.round(waitlistList.reduce((sum, w) => {
            try {
              const waitTime = (new Date().getTime() - new Date(w.created_at).getTime()) / (1000 * 60);
              return sum + Math.max(0, waitTime); // Ensure non-negative wait time
            } catch (error) {
              console.warn('Error calculating wait time:', error);
              return sum + (w.estimated_wait_minutes || 15); // Fallback to estimated time
            }
          }, 0) / waitlistList.length) : 0;

        // Estimated revenue based on covers and a configurable average (set to 0 if not desired)
        const avgSpendPerCover = 0; // Use only real revenue if available; keep 0 to avoid synthetic numbers
        const estimatedRevenue = totalCovers * avgSpendPerCover;

        // Satisfaction score derived from real booking outcomes (lower with cancellations/no-shows)
        const issueRate = (cancelledBookings + noShowBookings) / Math.max(1, bookingsList.length);
        const satisfactionScore = Math.max(0, Math.round(100 - issueRate * 100));

        return {
          totalCovers,
          reservations,
          walkIns,
          averageWaitTime,
          estimatedRevenue,
          satisfactionScore,
          completedBookings,
          cancelledBookings,
          noShowBookings,
          bookings: bookingsList,
          waitlistEntries: waitlistList,
          tables: tablesList
        };
      } catch (error) {
        console.error('Error in useTodayData:', error);
        // Re-throw with more context
        throw new Error(
          `Failed to fetch today's data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    enabled: !!tenant,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: (failureCount, error) => {
      // Retry up to 2 times, but not for certain error types
      if (failureCount >= 2) return false;
      if (error instanceof Error && error.message.includes('tenant')) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Subscribe to real-time updates for today’s bookings to refresh dashboard metrics
  useEffect(() => {
    if (!tenant?.id) return;
    const channel = supabase
      .channel(`today_data_rt_${tenant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenant.id}` },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [tenant?.id]);

  return query;
};
