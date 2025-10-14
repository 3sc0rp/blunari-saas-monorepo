import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

const DatabaseTest: React.FC = () => {
  const { tenant } = useTenant();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testDatabase() {
      if (!tenant) {
        setError("No tenant available");
        setLoading(false);
        return;
      }

      try {        // Test bookings
      const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('tenant_id', tenant.id)
          .limit(5);

        if (bookingsError) {
          console.error("Bookings error:", bookingsError);
        } else {        }

        // Test restaurant_tables
      const { data: tables, error: tablesError } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('tenant_id', tenant.id)
          .limit(5);

        if (tablesError) {
          console.error("Tables error:", tablesError);
        } else {        }

        setData({
          bookings: bookings || [],
          tables: tables || [],
          bookingsError,
          tablesError,
          tenant
        });

      } catch (err) {
        console.error("Database test error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    testDatabase();
  }, [tenant]);

  if (loading) {
    return <div className="p-4">Loading database test...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 rounded bg-red-50">
        <h3 className="font-semibold text-red-700">Database Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">Database Test Results</h3>
      
      <div className="space-y-2">
        <h4 className="font-medium">Tenant Info:</h4>
        <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(data?.tenant, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Bookings ({data?.bookings?.length || 0}):</h4>
        {data?.bookingsError && (
          <div className="text-red-600 text-sm">Error: {data.bookingsError.message}</div>
        )}
        <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(data?.bookings, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Tables ({data?.tables?.length || 0}):</h4>
        {data?.tablesError && (
          <div className="text-red-600 text-sm">Error: {data.tablesError.message}</div>
        )}
        <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(data?.tables, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DatabaseTest;


