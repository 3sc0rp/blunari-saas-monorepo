import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";

const AuthTenantTest: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [authData, setAuthData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testAuth() {
      try {        // Get current session
      const { data: session, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(`Session error: ${sessionError.message}`);
          return;
        }

        // Test tenant access
        let tenantTest = null;
        if (tenant) {
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenant.id)
            .single();

          tenantTest = { data: tenantData, error: tenantError };
        }

        // Test RLS function
      if (available
        let rlsTest = null;
        try {
          const { data: rlsData, error: rlsError } = await supabase.rpc('get_current_user_tenant_id');
          rlsTest = { data: rlsData, error: rlsError };
        } catch (err) {          rlsTest = { error: "Function not available" };
        }

        setAuthData({
          session: session?.session,
          user,
          tenant,
          tenantTest,
          rlsTest,
        });

      } catch (err) {
        console.error("Auth test error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    testAuth();
  }, [user, tenant]);

  if (loading) {
    return <div className="p-4">Loading auth test...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 rounded bg-red-50">
        <h3 className="font-semibold text-red-700">Auth Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-blue-50 border border-blue-200 rounded">
      <h3 className="font-semibold text-blue-800">Auth & Tenant Test Results</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h4 className="font-medium">Session Status:</h4>
          <p className={`text-sm ${authData?.session ? 'text-green-600' : 'text-red-600'}`}>
            {authData?.session ? '✅ Authenticated' : '❌ Not authenticated'}
          </p>
          {authData?.session && (
            <p className="text-xs text-gray-600">
              User ID: {authData.session.user?.id}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Tenant Status:</h4>
          <p className={`text-sm ${authData?.tenant ? 'text-green-600' : 'text-red-600'}`}>
            {authData?.tenant ? '✅ Tenant loaded' : '❌ No tenant'}
          </p>
          {authData?.tenant && (
            <p className="text-xs text-gray-600">
              Tenant: {authData.tenant.name} ({authData.tenant.slug})
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Tenant Access:</h4>
          <p className={`text-sm ${!authData?.tenantTest?.error ? 'text-green-600' : 'text-red-600'}`}>
            {!authData?.tenantTest?.error ? '✅ Can access tenant' : '❌ Tenant access denied'}
          </p>
          {authData?.tenantTest?.error && (
            <p className="text-xs text-red-600">
              Error: {authData.tenantTest.error.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">RLS Function:</h4>
          <p className={`text-sm ${!authData?.rlsTest?.error ? 'text-green-600' : 'text-yellow-600'}`}>
            {!authData?.rlsTest?.error ? '✅ RLS function works' : '⚠️ RLS function issue'}
          </p>
          {authData?.rlsTest?.error && (
            <p className="text-xs text-yellow-600">
              {typeof authData.rlsTest.error === 'string' ? authData.rlsTest.error : authData.rlsTest.error.message}
            </p>
          )}
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer font-medium">Raw Data (Click to expand)</summary>
        <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-60">
          {JSON.stringify(authData, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default AuthTenantTest;



