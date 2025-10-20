import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DebugResults {
  session?: {
    hasSession: boolean;
    hasAccessToken: boolean;
    tokenLength?: number;
    userId?: string;
    email?: string;
  };
  listTables?: {
    status: number;
    statusText: string;
    ok: boolean;
  };
  listTablesData?: unknown;
  listTablesError?: string;
  getKpis?: {
    status: number;
    statusText: string;
    ok: boolean;
  };
  getKpisData?: unknown;
  getKpisError?: string;
  error?: string;
}

export const DebugEdgeFunctions: React.FC = () => {
  // Always call hooks at the top - before any conditional returns
  const [status, setStatus] = useState<string>('Initializing...');
  const [results, setResults] = useState<DebugResults>({});

  useEffect(() => {
    // Only run test if in development mode
    if (import.meta.env.MODE === 'development') {
      testEdgeFunctions();
    }
  }, []);

  const testEdgeFunctions = async () => {
    try {
      setStatus('🔐 Checking session...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setStatus('❌ No session found. Please sign in first.');
        return;
      }

      setResults(prev => ({
        ...prev,
        session: {
          hasSession: !!session,
          hasAccessToken: !!session.access_token,
          tokenLength: session.access_token?.length,
          userId: session.user?.id,
          email: session.user?.email
        }
      }));

      setStatus('📡 Testing list-tables function...');

      // Test list-tables using direct fetch (same as hook)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-tables`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });

      setResults(prev => ({
        ...prev,
        listTables: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        }
      }));

      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({
          ...prev,
          listTablesData: data
        }));
        setStatus('✅ list-tables working!');
      } else {
        const errorText = await response.text();
        setResults(prev => ({
          ...prev,
          listTablesError: errorText
        }));
        setStatus(`❌ list-tables failed: ${response.status} ${response.statusText}`);
      }

      // Test get-kpis
      setStatus('📡 Testing get-kpis function...');
      
      const kpisResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-kpis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] })
      });

      setResults(prev => ({
        ...prev,
        getKpis: {
          status: kpisResponse.status,
          statusText: kpisResponse.statusText,
          ok: kpisResponse.ok
        }
      }));

      if (kpisResponse.ok) {
        const kpisData = await kpisResponse.json();
        setResults(prev => ({
          ...prev,
          getKpisData: kpisData
        }));
        setStatus('✅ Both functions working!');
      } else {
        const errorText = await kpisResponse.text();
        setResults(prev => ({
          ...prev,
          getKpisError: errorText
        }));
        setStatus(`❌ get-kpis failed: ${kpisResponse.status} ${kpisResponse.statusText}`);
      }

    } catch (error) {
      setStatus(`🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResults(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Early return AFTER hooks are called - this is correct pattern
  if (import.meta.env.MODE !== 'development') return null;

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Edge Functions Debug</h3>
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>
      <div className="space-y-4">
        <details>
          <summary className="cursor-pointer font-medium">Session Info</summary>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(results.session, null, 2)}
          </pre>
        </details>
        
        <details>
          <summary className="cursor-pointer font-medium">List Tables Response</summary>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(results.listTables, null, 2)}
          </pre>
          {results.listTablesData && (
            <pre className="mt-2 text-sm bg-green-100 p-2 rounded overflow-auto">
              {JSON.stringify(results.listTablesData, null, 2)}
            </pre>
          )}
          {results.listTablesError && (
            <pre className="mt-2 text-sm bg-red-100 p-2 rounded overflow-auto">
              {results.listTablesError}
            </pre>
          )}
        </details>

        <details>
          <summary className="cursor-pointer font-medium">Get KPIs Response</summary>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(results.getKpis, null, 2)}
          </pre>
          {results.getKpisData && (
            <pre className="mt-2 text-sm bg-green-100 p-2 rounded overflow-auto">
              {JSON.stringify(results.getKpisData, null, 2)}
            </pre>
          )}
          {results.getKpisError && (
            <pre className="mt-2 text-sm bg-red-100 p-2 rounded overflow-auto">
              {results.getKpisError}
            </pre>
          )}
        </details>
      </div>
    </div>
  );
};
