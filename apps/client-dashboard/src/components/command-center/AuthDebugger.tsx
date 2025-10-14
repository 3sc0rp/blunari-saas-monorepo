import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface AuthDebugData {
  user: any;
  session: any;
  tenant: any;
  tenantError: string | null;
}

export function AuthDebugger() {
  const [debugData, setDebugData] = useState<AuthDebugData | null>(null);
  const { tenant, tenantId, loading: tenantLoading, error: tenantError } = useTenant();

  useEffect(() => {
    const loadDebugData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();
        
        setDebugData({
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          } : null,
          session: session ? {
            access_token: session.access_token ? 'Present' : 'Missing',
            expires_at: session.expires_at,
            token_type: session.token_type
          } : null,
          tenant: {
            tenantId,
            name: tenant?.name,
            slug: tenant?.slug,
            loading: tenantLoading
          },
          tenantError
        });
      } catch (error) {
        console.error('Debug data loading error:', error);
      }
    };

    loadDebugData();
  }, [tenant, tenantId, tenantLoading, tenantError]);

  if (!debugData) return <div>Loading debug data...</div>;

  return (
    <div className="bg-slate-900 text-white p-4 rounded-lg text-xs font-mono">
      <h3 className="text-lg font-bold mb-2">🔍 Auth Debug Panel</h3>
      
      <div className="space-y-3">
        <div>
          <strong className="text-blue-400">User:</strong>
          {debugData.user ? (
            <div className="ml-2">
              <div>✅ ID: {debugData.user.id}</div>
              <div>✅ Email: {debugData.user.email}</div>
              <div>✅ Created: {debugData.user.created_at}</div>
            </div>
          ) : (
            <div className="ml-2 text-red-400">❌ No user found</div>
          )}
        </div>

        <div>
          <strong className="text-green-400">Session:</strong>
          {debugData.session ? (
            <div className="ml-2">
              <div>✅ Token: {debugData.session.access_token}</div>
              <div>✅ Type: {debugData.session.token_type}</div>
              <div>✅ Expires: {new Date(debugData.session.expires_at * 1000).toLocaleString()}</div>
            </div>
          ) : (
            <div className="ml-2 text-red-400">❌ No session found</div>
          )}
        </div>

        <div>
          <strong className="text-yellow-400">Tenant:</strong>
          {debugData.tenant.loading ? (
            <div className="ml-2 text-yellow-400">⏳ Loading...</div>
          ) : debugData.tenant.tenantId ? (
            <div className="ml-2">
              <div>✅ ID: {debugData.tenant.tenantId}</div>
              <div>✅ Name: {debugData.tenant.name}</div>
              <div>✅ Slug: {debugData.tenant.slug}</div>
            </div>
          ) : (
            <div className="ml-2 text-red-400">❌ No tenant: {debugData.tenantError}</div>
          )}
        </div>

        <div>
          <strong className="text-purple-400">Functions Test:</strong>
          <button 
            className="ml-2 bg-purple-600 px-2 py-1 rounded text-xs"
            onClick={async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  console.error('No session for function test');
                  return;
                }

                console.log('Testing tenant function...');
                const result = await supabase.functions.invoke('tenant', {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                  }
                  // Remove empty body to avoid JSON parsing issues
                });
                console.log('Tenant function result:', result);
              } catch (error) {
                console.error('Function test error:', error);
              }
            }}
          >
            Test Functions
          </button>
        </div>
      </div>
    </div>
  );
}
