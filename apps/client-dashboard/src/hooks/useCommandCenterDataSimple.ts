import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export function useCommandCenterDataSimple() {
  const { tenant, tenantId } = useTenant();

  const query = useQuery({
    queryKey: ['command-center-simple', tenantId],
    queryFn: async () => {
      const devLogs = true; // Always enable debug logs temporarily
      if (devLogs) {      }
      
      if (!tenantId) {
        if (devLogs)        return {
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
        // Try calling the service-role backed function first for better RLS handling
        const { data: functionData, error: functionError } = await (supabase as any).functions.invoke('command-center-bookings', {
          body: { tenant_id: tenantId, date: new Date().toISOString().slice(0,10) }
        });

        if (!functionError && functionData?.success) {
          if (devLogs)          const tables = (functionData.tables || []).map((table: any) => ({
            id: table.id,
            name: table.name,
            seats: table.capacity,
            section: 'Main Dining',
            status: table.status || 'AVAILABLE'
          }));

          // Auto-assignment helper: deterministically assign a table if booking has no table_id
          const autoAssignTableId = (b: any) => {
            if (!tables.length) return undefined;
            // Try exact / minimum capacity fit first
            const capacityFit = [...tables]
              .filter(t => t.seats >= (b.party_size || 1))
              .sort((a, b2) => a.seats - b2.seats)[0];
            if (capacityFit) return capacityFit.id;
            // Fallback: hash booking id to stable index
            const hash = (b.id || '').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
            return tables[hash % tables.length].id;
          };

          const reservations = (functionData.bookings || []).map((booking: any) => {
            const startTs = booking.booking_time;
            const endIso = new Date(new Date(startTs).getTime() + (Number(booking.duration_minutes || 120) * 60000)).toISOString();
            return {
              id: booking.id,
              guestName: booking.guest_name,
              email: booking.guest_email,
              phone: booking.guest_phone,
              partySize: booking.party_size,
              start: startTs,
              end: endIso,
              // Keep status lowercase to match timeline & filter logic
              status: (booking.status || 'pending').toLowerCase(),
              tableId: booking.table_id || autoAssignTableId(booking),
              specialRequests: booking.special_requests,
              depositRequired: booking.deposit_required || false,
              depositAmount: booking.deposit_amount || 0
            };
          });

          const kpis = [
            {
              id: 'total-bookings',
              label: 'Total Bookings',
              value: functionData.bookings?.length?.toString() || '0',
              spark: [],
              tone: 'positive' as const,
              hint: 'Total bookings in system'
            },
            {
              id: 'active-tables',
              label: 'Active Tables',
              value: functionData.tables?.length?.toString() || '0',
              spark: [],
              tone: 'neutral' as const,
              hint: 'Currently active tables'
            },
            {
              id: 'confirmed-bookings',
              label: 'Confirmed',
              value: (functionData.bookings?.filter((b: any) => b.status === 'confirmed')?.length || 0).toString(),
              spark: [],
              tone: 'positive' as const,
              hint: 'Confirmed bookings'
            }
          ];

          if (devLogs)          return {
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
            requestId: functionData.requestId,
            refetch: () => Promise.resolve()
          };
        }

        if (devLogs)        // Fallback to direct queries if function fails
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
        ]);        const tables = (tablesResult.data || []).map((table: any) => ({
          id: table.id,
          name: table.name,
          seats: table.capacity,
          section: 'Main Dining',
          status: table.status || 'AVAILABLE'
        }));

        // Reuse auto-assignment in fallback path
        const autoAssignFallback = (b: any) => {
          if (!tables.length) return undefined;
          const capacityFit = [...tables]
            .filter(t => t.seats >= (b.party_size || 1))
            .sort((a, b2) => a.seats - b2.seats)[0];
          if (capacityFit) return capacityFit.id;
            const hash = (b.id || '').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
          return tables[hash % tables.length].id;
        };

        const reservations = (bookingsResult.data || []).map((booking: any) => {
          const startTs = booking.booking_time;
            const endIso = new Date(new Date(startTs).getTime() + (Number(booking.duration_minutes || 120) * 60000)).toISOString();
          return {
            id: booking.id,
            guestName: booking.guest_name,
            email: booking.guest_email,
            phone: booking.guest_phone,
            partySize: booking.party_size,
            start: startTs,
            end: endIso,
            status: (booking.status || 'pending').toLowerCase(),
            tableId: booking.table_id || autoAssignFallback(booking),
            specialRequests: booking.special_requests,
            depositRequired: booking.deposit_required || false,
            depositAmount: booking.deposit_amount || 0
          };
        });

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

        if (devLogs)        return {
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
    // Don't wait for tenantId - query will return empty data if not available
    enabled: true,
    // Reduce refetch interval for faster updates
    refetchInterval: 30000,
    // Short stale time so data feels fresh
    staleTime: 5000,
    // Retry failed requests
    retry: 2,
    retryDelay: 1000,
    // Timeout for slow queries
    networkMode: 'online',
  });

  return {
    ...query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    refetch: query.refetch
  };
}

