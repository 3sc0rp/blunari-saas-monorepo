import React, { useState, useEffect } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { getTenantBySlug } from '@/lib/api-helpers';

export const TenantHookTester: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Use the actual hook
  const hookResult = useTenant();

  const runDirectApiTest = async (slug: string) => {
    console.log(`🧪 Direct API test for: ${slug}`);
    try {
      const result = await getTenantBySlug(slug);
      return {
        slug,
        success: !result.error,
        data: result.data,
        error: result.error?.message
      };
    } catch (error) {
      return {
        slug,
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    const results = [];
    
    const testSlugs = ['kpizza', 'dees-poizza', 'drood-wick', 'nonexistent-tenant'];
    
    for (const slug of testSlugs) {
      const result = await runDirectApiTest(slug);
      results.push(result);
    }
    
    setTestResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    console.log('🔄 TenantHookTester: Hook result changed:', hookResult);
  }, [hookResult]);

  return (
    <div className="p-6 bg-white rounded-lg shadow border">
      <h2 className="text-xl font-bold mb-4">🧪 Tenant Hook Tester</h2>
      
      {/* Current Hook State */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">Current Hook State</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Tenant Slug:</strong> {hookResult.tenantSlug || 'None'}</div>
          <div><strong>Tenant Name:</strong> {hookResult.tenant?.name || 'None'}</div>
          <div><strong>Loading:</strong> {hookResult.isLoading ? '⏳ Yes' : '✅ No'}</div>
          <div><strong>Error:</strong> {hookResult.error?.message || 'None'}</div>
          <div><strong>Access Type:</strong> {hookResult.accessType}</div>
          <div><strong>Tenant ID:</strong> {hookResult.tenant?.id || 'None'}</div>
        </div>
      </div>

      {/* URL Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">URL Analysis</h3>
        <div className="text-sm space-y-1">
          <div><strong>Full URL:</strong> {window.location.href}</div>
          <div><strong>Hostname:</strong> {window.location.hostname}</div>
          <div><strong>Search:</strong> {window.location.search || 'None'}</div>
          <div><strong>Pathname:</strong> {window.location.pathname}</div>
        </div>
      </div>

      {/* Direct API Tests */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Direct API Tests</h3>
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Run Tests'}
          </button>
        </div>
        
        {testResults.length > 0 && (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="font-medium">
                  {result.success ? '✅' : '❌'} {result.slug}
                </div>
                {result.success ? (
                  <div className="text-green-700 text-sm">
                    Found: {result.data?.name} (ID: {result.data?.id})
                  </div>
                ) : (
                  <div className="text-red-700 text-sm">{result.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => window.location.href = '?tenant=kpizza'}
          className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Test kpizza
        </button>
        <button
          onClick={() => window.location.href = '?tenant=dees-poizza'}
          className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Test dees-poizza
        </button>
        <button
          onClick={() => window.location.href = '?tenant=drood-wick'}
          className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Test drood-wick
        </button>
        <button
          onClick={() => window.location.href = window.location.pathname}
          className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
        >
          Clear Tenant
        </button>
      </div>
    </div>
  );
};
