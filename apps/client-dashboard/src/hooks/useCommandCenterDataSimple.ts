import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export function useCommandCenterDataSimple() {
  const { tenant, tenantId } = useTenant();

  const query = useQuery({
    queryKey: ['command-center-simple', tenantId],
    queryFn: async () => {
      const devLogs = true; // Always enable debug logs temporarily
      if (devLogs) {
        console.log('[useCommandCenterDataSimple] === DIRECT DB QUERIES ONLY ===');
        console.log('[useCommandCenterDataSimple] Tenant ID:', tenantId);
      }
      
      if (!tenantId) {
        if (devLogs) console.log('[useCommandCenterDataSimple] No tenant ID - returning empty data');
        return {
          kpis: [],
          tables: [],
          reservations: [],
          policies: {
            tenantId,
            depositsEnabled: false,
            depositAmount: 25,
            minPartyForDeposit: 6,
            advanceBookingDays: 30,
            cancellationPolicy: 'flexible' as const
          },
          loading: false,
          error: null
        };
      }

      try {
        // Direct queries only - no edge functions
        const [tablesResult, bookingsResult] = await Promise.all([
          supabase
            .from('restaurant_tables')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('active', true),
          
          supabase
            .from('bookings')
            .select('*')
            .eq('tenant_id', tenantId)
        ]);

        console.log('[useCommandCenterDataSimple] Query results:', {
          tenantId,
          tables: { count: tablesResult.data?.length, error: tablesResult.error },
          bookings: { count: bookingsResult.data?.length, error: bookingsResult.error }
        });

        const tables = (tablesResult.data || []).map((table: any) => ({
          id: table.id,
          name: table.name,
          seats: table.capacity,
          section: 'Main Dining',
          status: table.status || 'AVAILABLE'
        }));

        const reservations = (bookingsResult.data || []).map((booking: any) => ({
          id: booking.id,
          guestName: booking.guest_name,
          email: booking.guest_email,
          phone: booking.guest_phone,
          partySize: booking.party_size,
          start: booking.booking_time,
          end: new Date(new Date(booking.booking_time).getTime() + (Number(booking.duration_minutes || 120) * 60000)).toISOString(),
          status: booking.status.toUpperCase(),
          tableId: booking.table_id,
          specialRequests: booking.special_requests,
          depositRequired: booking.deposit_required || false,
          depositAmount: booking.deposit_amount || 0
        }));

        const kpis = [
          {
            id: 'total-bookings',
            label: 'Total Bookings',
            value: bookingsResult.data?.length?.toString() || '0',
            spark: [],
            tone: 'positive' as const,
            hint: 'Total bookings in system'
          },
          {
            id: 'active-tables',
            label: 'Active Tables',
            value: tablesResult.data?.length?.toString() || '0',
            spark: [],
            tone: 'neutral' as const,
            hint: 'Currently active tables'
          },
          {
            id: 'confirmed-bookings',
            label: 'Confirmed',
            value: (bookingsResult.data?.filter((b: any) => b.status === 'confirmed')?.length || 0).toString(),
            spark: [],
            tone: 'positive' as const,
            hint: 'Confirmed bookings'
          }
        ];

        if (devLogs) console.log('[useCommandCenterDataSimple] Returning data:', {
          kpis: kpis.length,
          tables: tables.length,
          reservations: reservations.length
        });

        return {
          kpis,
          tables,
          reservations,
          policies: {
            tenantId,
            depositsEnabled: false,
            depositAmount: 25,
            minPartyForDeposit: 6,
            advanceBookingDays: 30,
            cancellationPolicy: 'flexible' as const
          },
          loading: false,
          error: null,
          liveConnected: false,
          requestId: null,
          refetch: () => Promise.resolve()
        };

      } catch (error) {
        console.error('[useCommandCenterDataSimple] Error:', error);
        return {
          kpis: [],
          tables: [],
          reservations: [],
          policies: {
            tenantId,
            depositsEnabled: false,
            depositAmount: 25,
            minPartyForDeposit: 6,
            advanceBookingDays: 30,
            cancellationPolicy: 'flexible' as const
          },
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    staleTime: 10000
  });

  return {
    ...query.data,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
