import React, { useEffect, useState } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useAdvancedBookings } from '@/hooks/useAdvancedBookings';
import { useTodayData } from '@/hooks/useTodayData';
import { supabase } from '@/integrations/supabase/client';

const DataFlowDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { tenant, tenantId, loading: tenantLoading } = useTenant();
  const { bookings, isLoading: bookingsLoading, error: bookingsError } = useAdvancedBookings(tenantId || undefined);
  const todayDataQuery = useTodayData();

  useEffect(() => {
    const runDebugChecks = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        environment: import.meta.env.MODE,
        tenant: {
          id: tenantId,
          slug: tenant?.slug,
          loading: tenantLoading,
          object: tenant
        },
        supabaseConfig: {
          url: import.meta.env.VITE_SUPABASE_URL,
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          anonKeyPrefix: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
        },
        bookings: {
          count: bookings.length,
          loading: bookingsLoading,
          error: bookingsError?.message,
          data: bookings.map(b => ({ id: b.id, name: b.guest_name, time: b.booking_time, status: b.status }))
        },
        todayData: {
          loading: todayDataQuery.isLoading,
          error: todayDataQuery.error?.message,
          data: todayDataQuery.data ? {
            totalCovers: todayDataQuery.data.totalCovers,
            reservations: todayDataQuery.data.reservations,
            bookingsCount: todayDataQuery.data.bookings?.length
          } : null
        }
      };

      // Test direct API call
      if (tenantId) {
        try {
          const { data: directBookings, error: directError } = await supabase
            .from('bookings')
            .select('*')
            .eq('tenant_id', tenantId);
          
          info.directApiTest = {
            success: !directError,
            count: directBookings?.length || 0,
            error: directError?.message,
            data: directBookings?.map(b => ({ id: b.id, name: b.guest_name, time: b.booking_time }))
          };
        } catch (err) {
          info.directApiTest = {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
      }

      setDebugInfo(info);
    };

    runDebugChecks();
  }, [tenant, tenantId, tenantLoading, bookings, bookingsLoading, bookingsError, todayDataQuery]);

  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h3>🔍 Data Flow Debug</h3>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
};

export default DataFlowDebugger;
