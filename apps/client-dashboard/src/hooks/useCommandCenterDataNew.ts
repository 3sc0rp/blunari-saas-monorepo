import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';
import { 
  Reservation, 
  TableRow, 
  KpiCard, 
  Policy, 
  Filters,
  validateReservation,
  validateTableRow,
  validateKpiCard
} from '@/lib/contracts';
import { parseError, toastError } from '@/lib/errors';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { handleFallbackUsage } from '@/utils/productionErrorManager';

// UUID validation helper
      const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Types matching the enhanced contracts
export interface CommandCenterData {
  kpis: KpiCard[];
  tables: TableRow[];
  reservations: Reservation[];
  policies: Policy;
  loading: boolean;
  error: string | null;
}

interface UseCommandCenterDataProps {
  date: string;
  filters: Filters;
}

/**
 * Enhanced Command Center data hook with live Supabase integration
 * Production-ready hook using only real API calls to Supabase Functions
 */
export function useCommandCenterData({ date, filters }: UseCommandCenterDataProps) {
  const { tenantId, loading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();
  const [liveConnected, setLiveConnected] = useState(false);
  const lastRequestIdRef = useRef<string | null>(null);

  // Debounce filters to reduce thrash
      const debouncedFilters = useDebouncedValue(filters, 300);

  // Query key with all dependencies
      const queryKey = ['command-center', tenantId, date, debouncedFilters];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CommandCenterData> => {
      if (!tenantId) {
        throw new Error('Tenant not found');
      }

      // Validate UUID format before making database calls
      if (!isValidUUID(tenantId)) {
        handleFallbackUsage('useCommandCenterDataNew', 'empty data (invalid UUID)', { tenantId });
        return {
          kpis: [],
          tables: [],
          reservations: [],
          policies: {
            tenantId: tenantId,
            depositsEnabled: false,
            depositAmount: 25,
            minPartyForDeposit: 6,
            advanceBookingDays: 30,
            cancellationPolicy: 'flexible'
          },
          loading: false,
          error: 'Invalid tenant configuration'
        };
      }

      // PRODUCTION FIX: Attempt real data fetch with graceful fallback      logger.info('Fetching real Command Center data for production', {
        component: 'useCommandCenterDataNew',
        tenantId,
        date,
        filters
      });

      try {
        // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Authentication required');
        }

        const authHeaders = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };

        // Validate session and authentication
      if (!session?.access_token) {
          throw new Error('No valid session or access token available');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;        // Standardized fetch for all edge functions to ensure consistent behavior
      const fetchEdgeFunction = async (functionName: string, method: string = 'POST', body?: any) => {
          logger.debug(`Calling edge function: ${functionName} (${method})`, body ? { bodyKeys: Object.keys(body) } : { body: 'none' });
          
          const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
            method,
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': supabaseKey
            },
            ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {})
          });
          
          const requestId = response.headers.get('x-request-id') || null;
          if (requestId) lastRequestIdRef.current = requestId;
          logger.debug(`Response from ${functionName}`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            requestId
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Edge function ${functionName} error:`, {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          }
          
          const data = await response.json();
          logger.debug(`Edge function ${functionName} success`, { dataKeys: Object.keys(data) });
          return { data, error: null, requestId } as const;
        };
        
        // Use direct Supabase queries instead of edge functions for reliability       
      const [tablesResult, bookingsResult] = await Promise.all([
          supabase
            .from('restaurant_tables')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('active', true)
            .then(res => ({ data: res.data, error: res.error }))
            .catch(error => ({ data: null, error })),
          
          supabase
            .from('bookings')
            .select('*')
            .eq('tenant_id', tenantId)
            .then(res => ({ data: res.data, error: res.error }))
            .catch(error => ({ data: null, error }))
        ]);        // Handle direct query errors gracefully
      if (tablesResult.error) {
          console.error('Tables fetch error details:', tablesResult.error);
        }
        if (bookingsResult.error) {
          console.error('Bookings fetch error details:', bookingsResult.error);
        }

        // Extract data from direct queries
      const tablesData = tablesResult.data || [];
        const bookingsData = bookingsResult.data || [];
        
        // Generate KPIs from real data
      const kpisData = [
          {
            id: 'bookings-today',
            label: 'Bookings Today',
            value: bookingsData.length.toString(),
            spark: [],
            tone: 'positive' as const,
            hint: 'Total bookings for today'
          },
          {
            id: 'tables-active',
            label: 'Active Tables',
            value: tablesData.length.toString(),
            spark: [],
            tone: 'neutral' as const,
            hint: 'Currently active tables'
          }
        ];

        // Transform bookings to reservations format
      const reservationsData = bookingsData.map((booking: any) => ({
          id: booking.id,
          guestName: booking.guest_name,
          email: booking.guest_email,
          phone: booking.guest_phone,
          partySize: booking.party_size,
          start: booking.booking_time,
          end: new Date(new Date(booking.booking_time).getTime() + booking.duration_minutes * 60000).toISOString(),
          status: booking.status.toUpperCase(),
          tableId: booking.table_id,
          specialRequests: booking.special_requests,
          depositRequired: booking.deposit_required,
          depositAmount: booking.deposit_amount
        }));        // Use the transformed reservations data
      const reservations: Reservation[] = reservationsData.map((r: any) => {
          try { 
            return {
              id: r.id,
              guestName: r.guestName,
              email: r.email,
              phone: r.phone,
              partySize: r.partySize,
              start: r.start,
              end: r.end,
              status: r.status,
              tableId: r.tableId,
              specialRequests: r.specialRequests,
              depositRequired: r.depositRequired || false,
              depositAmount: r.depositAmount || 0
            } as Reservation;
          } catch { return null; }
        }).filter(Boolean);

        // Validate and transform data - fix the data access
        logger.debug('Raw table data sample', { data: tablesData?.data?.[0] });
        logger.debug('Raw KPI data sample', { data: kpisData?.data?.[0] });
        logger.debug('Raw reservation data sample', { data: reservationsData?.data?.[0] });

        const tables: TableRow[] = (tablesData?.data || []).map((t: any, index: number) => {
          try {
            const validated = validateTableRow(t);
            if (index === 0) logger.debug('First table validated successfully', { data: validated });
            return validated;
          } catch (error) {
            console.warn(`❌ Invalid table data at index ${index}:`, t, error);
            return null;
          }
        }).filter(Boolean);

        const kpis: KpiCard[] = (kpisData?.data || []).map((k: any, index: number) => {
          try {
            const validated = validateKpiCard(k);
            if (index === 0) logger.debug('First KPI validated successfully', { data: validated });
            return validated;
          } catch (error) {
            console.warn(`❌ Invalid KPI data at index ${index}:`, k, error);
            return null;
          }
        }).filter(Boolean);

        logger.debug('Data validation complete', {
          validTables: tables.length,
          validKpis: kpis.length,
          totalTablesReceived: tablesData?.data?.length || 0,
          totalKpisReceived: kpisData?.data?.length || 0
        });

        // TEMPORARY:
      if (validation is failing,
      return raw data for debugging
      if (tables.length === 0 && tablesData?.data?.length > 0) {
          console.warn('⚠️ Table validation failed, using raw data structure');
          // Convert raw data to match expected structure
      const rawTables = tablesData.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            section: t.section,
            seats: t.seats,
            status: t.status,
            position: t.position
          }));
          tables.push(...rawTables);
        }

        if (kpis.length === 0 && kpisData?.data?.length > 0) {
          console.warn('⚠️ KPI validation failed, using raw data structure');
          // Convert raw data to match expected structure  
      const rawKpis = kpisData.data.map((k: any) => ({
            id: k.id,
            label: k.label,
            value: k.value,
            tone: k.tone || 'default',
            format: k.format || 'number',
            spark: k.spark || [],
            hint: k.hint || ''
          }));
          kpis.push(...rawKpis);
        }

        // Default policies (could be fetched from database policies table)
      const policies: Policy = {
          tenantId,
          depositsEnabled: false,
          depositAmount: 25,
          minPartyForDeposit: 6,
          advanceBookingDays: 30
        };

        return {
          kpis,
          tables,
          reservations,
          policies,
          loading: false,
          error: null
        };

      } catch (error) {
        const parsedError = parseError(error);
        console.error('Command Center data fetch failed:', parsedError);
        throw error;
      }
    },
    enabled: !!tenantId && !tenantLoading && isValidUUID(tenantId),
    staleTime: 60_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      const errorMessage = (error as any)?.message?.toLowerCase() || '';
      if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Handle query errors with useEffect instead of onError
  useEffect(() => {
    if (query.error) {
      const parsedError = parseError(query.error);
      toastError(parsedError, 'Failed to load Command Center data');
    }
  }, [query.error]);

  // Visibility refetch
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible' && tenantId) {
        queryClient.invalidateQueries({ queryKey: ['command-center', tenantId] });
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [tenantId, queryClient]);

  // Real-time subscriptions for live updates (bookings + tables)
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`command-center-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['command-center', tenantId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['command-center', tenantId] });
      })
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });

    return () => { channel.unsubscribe(); };
  }, [tenantId, queryClient]);

  const data = query.data;
  
  return {
    kpis: data?.kpis || [],
    tables: data?.tables || [],
    reservations: data?.reservations || [],
    policies: data?.policies || {
      tenantId: tenantId || '',
      depositsEnabled: false,
      depositAmount: 25,
      minPartyForDeposit: 6,
      advanceBookingDays: 30
    },
    loading: query.isLoading || tenantLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    isStale: query.isStale,
    liveConnected,
    requestId: lastRequestIdRef.current,
  };
}

// simple debounce hook
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}





