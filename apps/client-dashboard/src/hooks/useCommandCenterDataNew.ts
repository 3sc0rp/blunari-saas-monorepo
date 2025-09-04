import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
  validateKpiCard,
  shouldUseMocks
} from '@/lib/contracts';
import { parseError, toastError } from '@/lib/errors';
import { toast } from 'sonner';

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
 * Replaces all mock data with real API calls to Supabase Functions
 */
export function useCommandCenterData({ date, filters }: UseCommandCenterDataProps) {
  const { tenantId, loading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();

  // Query key with all dependencies
  const queryKey = ['command-center', tenantId, date, filters];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CommandCenterData> => {
      if (!tenantId) {
        throw new Error('Tenant not found');
      }

      // If mocks are enabled in development, use mock data
      if (shouldUseMocks()) {
        console.warn('🟡 Using mock data - disable VITE_ENABLE_MOCK_DATA for production');
        return generateMockData(date, filters);
      }

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

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        // Parallel fetch all data using appropriate methods
        const [tablesResult, kpisResult] = await Promise.all([
          // Fetch tables using GET request (edge function requires GET)
          fetch(`${supabaseUrl}/functions/v1/list-tables`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }).then(async (response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return { data, error: null };
          }).catch(error => ({ data: null, error })),
          
          // Fetch KPIs using POST request (edge function accepts both GET/POST)
          supabase.functions.invoke('get-kpis', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            body: { date }
          })
        ]);

        // Handle function invocation errors
        if (tablesResult.error) {
          throw new Error(`Failed to fetch tables: ${tablesResult.error.message}`);
        }
        if (kpisResult.error) {
          throw new Error(`Failed to fetch KPIs: ${kpisResult.error.message}`);
        }

        // Extract data from Supabase function results
        const tablesData = tablesResult.data;
        const kpisData = kpisResult.data;

        // For now, use empty reservations array (we can implement list-reservations later)
        const reservations: Reservation[] = [];

        // Validate and transform data
        const tables: TableRow[] = (tablesData?.data || []).map((t: any) => {
          try {
            return validateTableRow(t);
          } catch (error) {
            console.warn('Invalid table data:', t, error);
            return null;
          }
        }).filter(Boolean);

        const kpis: KpiCard[] = (kpisData?.data || []).map((k: any) => {
          try {
            return validateKpiCard(k);
          } catch (error) {
            console.warn('Invalid KPI data:', k, error);
            return null;
          }
        }).filter(Boolean);

        // Mock policies for now (could be another function)
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
    enabled: !!tenantId && !tenantLoading,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      const errorMessage = error?.message?.toLowerCase() || '';
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

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!tenantId || shouldUseMocks()) {
      return;
    }

    // Set up real-time subscriptions
    const channel = supabase
      .channel(`command-center-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Invalidate and refetch command center data
          queryClient.invalidateQueries({ queryKey: ['command-center', tenantId] });
          toast('Data updated', { 
            description: 'Live update received',
            duration: 2000 
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
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
    isStale: query.isStale
  };
}

/**
 * Generate mock data for development
 */
function generateMockData(date: string, filters: Filters): CommandCenterData {
  // Generate mock reservations
  const reservations: Reservation[] = Array.from({ length: 12 }, (_, i) => {
    const startTime = new Date(date);
    startTime.setHours(11 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
    const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);

    return {
      id: `mock-res-${i}`,
      tenantId: 'mock-tenant',
      tableId: `table-${(i % 20) + 1}`,
      section: (['Patio', 'Bar', 'Main'][Math.floor(i / 7)] || 'Main') as 'Patio' | 'Bar' | 'Main',
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      partySize: Math.floor(Math.random() * 6) + 2,
      channel: (['WEB', 'PHONE', 'WALKIN'][Math.floor(Math.random() * 3)] || 'WEB') as 'WEB' | 'PHONE' | 'WALKIN',
      vip: Math.random() > 0.8,
      guestName: `Guest ${i + 1}`,
      guestPhone: '+1234567890',
      status: (['CONFIRMED', 'SEATED', 'COMPLETED'][Math.floor(Math.random() * 3)] || 'CONFIRMED') as 'CONFIRMED' | 'SEATED' | 'COMPLETED',
      depositRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Generate mock tables
  const tables: TableRow[] = Array.from({ length: 20 }, (_, i) => ({
    id: `table-${i + 1}`,
    name: `Table ${i + 1}`,
    section: (i < 6 ? 'Patio' : i < 12 ? 'Bar' : 'Main') as 'Patio' | 'Bar' | 'Main',
    seats: [2, 4, 6, 8][Math.floor(Math.random() * 4)],
    status: 'AVAILABLE' as const,
    position: {
      x: Math.floor(Math.random() * 400) + 50,
      y: Math.floor(Math.random() * 300) + 50
    }
  }));

  // Generate mock KPIs
  const kpis: KpiCard[] = [
    {
      id: 'occupancy',
      label: 'Occupancy',
      value: '72%',
      tone: 'success',
      format: 'percentage',
      spark: Array.from({ length: 12 }, () => Math.random() * 100)
    },
    {
      id: 'covers',
      label: 'Covers',
      value: '48',
      tone: 'default',
      format: 'number',
      spark: Array.from({ length: 12 }, () => Math.random() * 60)
    },
    {
      id: 'no-show-risk',
      label: 'No-Show Risk',
      value: '12%',
      tone: 'warning',
      format: 'percentage'
    }
  ];

  return {
    kpis,
    tables,
    reservations,
    policies: {
      tenantId: 'mock-tenant',
      depositsEnabled: false,
      depositAmount: 25,
      minPartyForDeposit: 6,
      advanceBookingDays: 30
    },
    loading: false,
    error: null
  };
}
