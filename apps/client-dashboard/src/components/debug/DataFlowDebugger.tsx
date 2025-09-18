import React, { useEffect, useState } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useAdvancedBookings } from '@/hooks/useAdvancedBookings';
import { useTodayData } from '@/hooks/useTodayData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
          anonKeyPrefix: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
          mode: import.meta.env.MODE,
          isDev: import.meta.env.DEV,
          isProd: import.meta.env.PROD
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

      // Test multiple API calls
      if (tenantId) {
        try {
          // Test 1: All bookings for tenant
          const { data: allBookings, error: allError } = await supabase
            .from('bookings')
            .select('*')
            .eq('tenant_id', tenantId);
          
          // Test 2: Count only
          const { count: bookingCount, error: countError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

          // Test 3: Tables
          const { data: tables, error: tablesError } = await supabase
            .from('restaurant_tables')
            .select('*')
            .eq('tenant_id', tenantId);

          // Test 4: Raw auth session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

          info.apiTests = {
            allBookings: {
              success: !allError,
              count: allBookings?.length || 0,
              error: allError?.message,
              sample: allBookings?.[0] ? { 
                id: allBookings[0].id, 
                name: allBookings[0].guest_name, 
                time: allBookings[0].booking_time,
                tenant: allBookings[0].tenant_id 
              } : null
            },
            bookingCount: {
              success: !countError,
              count: bookingCount || 0,
              error: countError?.message
            },
            tables: {
              success: !tablesError,
              count: tables?.length || 0,
              error: tablesError?.message
            },
            session: {
              hasSession: !!sessionData.session,
              userId: sessionData.session?.user?.id,
              email: sessionData.session?.user?.email,
              error: sessionError?.message
            }
          };
        } catch (err) {
          info.apiTests = {
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
      }

      setDebugInfo(info);
    };

    runDebugChecks();
  }, [tenant, tenantId, tenantLoading, bookings, bookingsLoading, bookingsError, todayDataQuery]);

  // Always show in development, and show in production if there are issues
  const shouldShow = import.meta.env.MODE === 'development' || 
                    (import.meta.env.MODE === 'production' && 
                     (bookings.length === 0 || tenantLoading || bookingsError));
  
  if (!shouldShow) {
    return null;
  }

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: collapsed ? '200px' : '500px',
      maxHeight: '80vh',
      overflow: 'auto',
      background: 'rgba(0,0,0,0.95)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '11px',
      zIndex: 9999,
      fontFamily: 'monospace',
      border: '1px solid #333'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>🔍 Data Flow Debug</h3>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: '1px solid #666', color: 'white', padding: '2px 6px', borderRadius: '4px' }}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      {!collapsed && (
        <>
          <div style={{ marginBottom: '10px', padding: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
            <strong>Quick Status:</strong><br/>
            Tenant: {debugInfo.tenant?.id ? '✅' : '❌'} {debugInfo.tenant?.id}<br/>
            Bookings: {debugInfo.bookings?.count || 0} items<br/>
            API Test: {debugInfo.apiTests?.allBookings?.success ? '✅' : '❌'} {debugInfo.apiTests?.allBookings?.count || 0} found<br/>
            Session: {debugInfo.apiTests?.session?.hasSession ? '✅' : '❌'} {debugInfo.apiTests?.session?.email}
          </div>
          <details style={{ marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📊 Full Debug Data</summary>
            <pre style={{ fontSize: '10px', maxHeight: '300px', overflow: 'auto', margin: '5px 0' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
};

export default DataFlowDebugger;
