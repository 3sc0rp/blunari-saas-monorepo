import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

const DataAuditor: React.FC = () => {
  const [auditResults, setAuditResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const { tenant, tenantId } = useTenant();

  const runComprehensiveAudit = async () => {
    if (!tenantId) return;
    
    setIsRunning(true);
    console.log('[DataAuditor] === COMPREHENSIVE DATA AUDIT START ===');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tenantId,
      tests: {}
    };

    try {
      // Test 1: Raw bookings count
      console.log('[DataAuditor] Testing bookings...');
      const { data: bookings, error: bookingsError, count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);
      
      results.tests.bookings = {
        success: !bookingsError,
        count: bookingsCount,
        dataCount: bookings?.length,
        error: bookingsError?.message,
        sample: bookings?.[0]
      };

      // Test 2: Restaurant tables
      console.log('[DataAuditor] Testing restaurant_tables...');
      const { data: tables, error: tablesError, count: tablesCount } = await supabase
        .from('restaurant_tables')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);
      
      results.tests.tables = {
        success: !tablesError,
        count: tablesCount,
        dataCount: tables?.length,
        error: tablesError?.message,
        sample: tables?.[0]
      };

      // Test 3: Business hours
      console.log('[DataAuditor] Testing business_hours...');
      const { data: hours, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('tenant_id', tenantId);
      
      results.tests.businessHours = {
        success: !hoursError,
        count: hours?.length,
        error: hoursError?.message,
        sample: hours?.[0]
      };

      // Test 4: Tenant settings
      console.log('[DataAuditor] Testing tenant_settings...');
      const { data: settings, error: settingsError } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId);
      
      results.tests.tenantSettings = {
        success: !settingsError,
        count: settings?.length,
        error: settingsError?.message,
        sample: settings?.[0]
      };

      // Test 5: Holidays
      console.log('[DataAuditor] Testing holidays...');
      const { data: holidays, error: holidaysError } = await supabase
        .from('holidays')
        .select('*')
        .eq('tenant_id', tenantId);
      
      results.tests.holidays = {
        success: !holidaysError,
        count: holidays?.length,
        error: holidaysError?.message,
        sample: holidays?.[0]
      };

      // Test 6: Auth session
      console.log('[DataAuditor] Testing auth session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      results.tests.session = {
        success: !sessionError,
        hasSession: !!sessionData.session,
        userId: sessionData.session?.user?.id,
        email: sessionData.session?.user?.email,
        error: sessionError?.message
      };

      // Test 7: Edge function connectivity
      console.log('[DataAuditor] Testing edge functions...');
      try {
        const { data: tenantTest, error: tenantTestError } = await supabase.functions.invoke('tenant', {
          body: { slug: 'demo' }
        });
        
        results.tests.edgeFunctions = {
          tenant: {
            success: !tenantTestError,
            error: tenantTestError?.message,
            data: tenantTest
          }
        };
      } catch (err) {
        results.tests.edgeFunctions = {
          tenant: {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          }
        };
      }

    } catch (globalError) {
      results.globalError = globalError instanceof Error ? globalError.message : 'Unknown error';
    }

    console.log('[DataAuditor] === AUDIT COMPLETE ===');
    console.log('[DataAuditor] Results:', results);
    
    setAuditResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    if (tenantId) {
      runComprehensiveAudit();
    }
  }, [tenantId]);

  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      width: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '11px',
      zIndex: 9999,
      fontFamily: 'monospace',
      border: '1px solid #333'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>🔍 Data Audit</h3>
        <button 
          onClick={runComprehensiveAudit}
          disabled={isRunning}
          style={{ 
            background: isRunning ? '#666' : '#0066cc', 
            border: 'none', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? 'Running...' : 'Re-audit'}
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Status Summary:</strong><br/>
        {Object.entries(auditResults.tests || {}).map(([key, test]: [string, any]) => (
          <div key={key} style={{ margin: '2px 0' }}>
            {test.success ? '✅' : '❌'} {key}: {test.count || 0} items
            {test.error && <span style={{ color: '#ff6666' }}> - {test.error}</span>}
          </div>
        ))}
      </div>

      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📊 Full Audit Results</summary>
        <pre style={{ fontSize: '10px', maxHeight: '150px', overflow: 'auto', margin: '5px 0' }}>
          {JSON.stringify(auditResults, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default DataAuditor;
