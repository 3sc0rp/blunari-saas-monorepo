import React, { useEffect, useState } from 'react';
import { checkApiHealth } from '@/lib/api-helpers';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';

interface HealthResult {
  test: string;
  success: boolean;
  error?: string;
  data?: any;
}

export const ApiDebugPanel: React.FC = () => {
  const [healthResults, setHealthResults] = useState<HealthResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const { tenant, tenantSlug, isLoading, error } = useTenant();
  const { user } = useAuth();

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const results = await checkApiHealth();
      setHealthResults(results);
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">API Debug Panel</h3>
      
      <div className="space-y-4">
        {/* Tenant Status */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Tenant Status</h4>
          <div className="space-y-2 text-sm">
            <div><strong>Slug:</strong> {tenantSlug || 'N/A'}</div>
            <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
            <div><strong>Error:</strong> {error || 'None'}</div>
            <div><strong>Tenant Found:</strong> {tenant ? 'Yes' : 'No'}</div>
            {tenant && (
              <div><strong>Tenant Name:</strong> {tenant.name}</div>
            )}
          </div>
        </div>

        {/* User Status */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Authentication Status</h4>
          <div className="space-y-2 text-sm">
            <div><strong>User:</strong> {user ? 'Authenticated' : 'Anonymous'}</div>
            {user && (
              <div><strong>User ID:</strong> {user.id}</div>
            )}
          </div>
        </div>

        {/* API Health */}
        <div className="p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">API Health Check</h4>
            <button
              onClick={runHealthCheck}
              disabled={isChecking}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : 'Recheck'}
            </button>
          </div>
          <div className="space-y-2">
            {healthResults.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm ${
                  result.success 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <div className="font-medium">{result.test}</div>
                {result.error && <div className="text-xs mt-1">Error: {result.error}</div>}
                {result.data && (
                  <div className="text-xs mt-1">Data: {JSON.stringify(result.data)}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Environment Info */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Environment Info</h4>
          <div className="space-y-2 text-sm">
            <div><strong>Hostname:</strong> {window.location.hostname}</div>
            <div><strong>URL:</strong> {window.location.href}</div>
            <div><strong>Node Env:</strong> {import.meta.env.MODE}</div>
            <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
