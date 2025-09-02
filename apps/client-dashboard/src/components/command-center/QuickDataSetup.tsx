import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeCommandCenterContext } from "@/contexts/RealtimeCommandCenterContext";
import { Loader2, Database, CheckCircle, RefreshCw, BarChart3, Users, Calendar } from "lucide-react";

const QuickDataSetup: React.FC = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { metrics, isLoading, error } = useRealtimeCommandCenterContext();
  const [dataStats, setDataStats] = useState<{
    tables: number;
    bookings: number;
    waitlist: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (metrics) {
      setDataStats({
        tables: metrics.totalTables || 0,
        bookings: metrics.totalBookings || 0,
        waitlist: metrics.waitlistData?.length || 0
      });
    }
  }, [metrics]);

  const refreshData = async () => {
    if (!tenant) return;
    
    setLoading(true);
    try {
      // Force refresh the data by invalidating the React Query cache
      // This would need to be implemented in the context
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-amber-800">⚠️ No tenant available for data display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Database className="w-5 h-5" />
          Live Data Overview
        </CardTitle>
        <p className="text-sm text-blue-600">
          Real-time data from your restaurant system
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="bg-red-100 border border-red-300 rounded p-3">
            <p className="text-sm text-red-800">
              ❌ <strong>Error loading data:</strong> {error.message}
            </p>
          </div>
        ) : isLoading ? (
          <div className="bg-gray-100 rounded p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading real-time data...</span>
          </div>
        ) : dataStats ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-blue-800">{dataStats.tables}</div>
              <div className="text-xs text-blue-600">Tables</div>
            </div>
            
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-xl font-bold text-green-800">{dataStats.bookings}</div>
              <div className="text-xs text-green-600">Bookings</div>
            </div>
            
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-800">{dataStats.waitlist}</div>
              <div className="text-xs text-amber-600">Waitlist</div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              onClick={refreshData} 
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh Data
            </Button>
            
            {tenant && (
              <span className="text-sm text-blue-600">
                {tenant.name} ({tenant.slug})
              </span>
            )}
          </div>
          
          {dataStats && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Live Data</span>
            </div>
          )}
        </div>

        <div className="bg-white/50 rounded border p-3">
          <h4 className="font-medium text-sm mb-2 text-blue-800">Data Sources:</h4>
          <div className="space-y-1 text-xs text-blue-600">
            <div>• Tables: Real restaurant_tables from database</div>
            <div>• Bookings: Live bookings with real-time updates</div>
            <div>• Waitlist: Real-time waitlist with Supabase subscriptions</div>
          </div>
        </div>

        {!dataStats?.tables && !isLoading && (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
            <p className="text-sm text-yellow-800">
              💡 <strong>Note:</strong> No tables found. You may need to set up your restaurant tables first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickDataSetup;
