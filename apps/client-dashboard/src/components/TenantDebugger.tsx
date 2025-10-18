import React, { useState } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { checkApiHealth } from '@/lib/api-helpers';

export const TenantDebugger: React.FC = () => {
  const { tenant, tenantSlug, isLoading, error, accessType, tenantInfo } = useTenant();
  const { user } = useAuth();
  const [healthResults, setHealthResults] = useState<any[]>([]);
  const [testSlug, setTestSlug] = useState('demo-restaurant');

  const runHealthCheck = async () => {
    const results = await checkApiHealth();
    setHealthResults(results);
  };

  const testDirectUrl = () => {
    const newUrl = `${window.location.origin}?tenant=${testSlug}`;
    window.location.href = newUrl;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow border max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">🔍 Tenant System Debugger</h2>
      
      {/* Current State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-600">Current State</h3>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <div><strong>URL:</strong> {window.location.href}</div>
            <div><strong>Hostname:</strong> {window.location.hostname}</div>
            <div><strong>Tenant Slug:</strong> {tenantSlug || 'None'}</div>
            <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
            <div><strong>Access Type:</strong> {accessType}</div>
            <div><strong>Error:</strong> {error?.message || 'None'}</div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-green-600">Auth & Tenant Data</h3>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <div><strong>User:</strong> {user ? user.email || user.id : 'Anonymous'}</div>
            <div><strong>Tenant Found:</strong> {tenant ? 'Yes' : 'No'}</div>
            {tenant && (
              <>
                <div><strong>Tenant Name:</strong> {tenant.name}</div>
                <div><strong>Tenant ID:</strong> {tenant.id}</div>
                <div><strong>Tenant Status:</strong> {tenant.status}</div>
              </>
            )}
            {tenantInfo && (
              <div><strong>User Tenant:</strong> {tenantInfo.tenant_name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🧪 Quick Tests</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runHealthCheck}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Check API Health
          </button>
          
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={testSlug}
              onChange={(e) => setTestSlug(e.target.value)}
              placeholder="Enter tenant slug to test"
              className="px-3 py-2 border rounded"
            />
            <button
              onClick={testDirectUrl}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Tenant
            </button>
          </div>
        </div>
      </div>

      {/* Health Results */}
      {healthResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🏥 API Health Results</h3>
          <div className="space-y-2">
            {healthResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="font-medium">{result.test}</div>
                {result.success ? (
                  <div className="text-green-700 text-sm">✅ Success</div>
                ) : (
                  <div className="text-red-700 text-sm">❌ {result.error}</div>
                )}
                {result.data && (
                  <div className="text-gray-600 text-xs mt-1">
                    Data: {JSON.stringify(result.data)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">📋 How to Test</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>For localhost: Use <code>?tenant=your-slug</code> in URL</li>
          <li>Check console for detailed API logs</li>
          <li>Verify Supabase connection with API Health</li>
          <li>Test with real tenant slugs from your database</li>
        </ul>
      </div>
    </div>
  );
};
