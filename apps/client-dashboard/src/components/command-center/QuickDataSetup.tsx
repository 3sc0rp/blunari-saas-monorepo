import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Database, CheckCircle } from "lucide-react";

const QuickDataSetup: React.FC = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, message]);
  };

  const createDemoData = async () => {
    if (!tenant) {
      addStatus("❌ No tenant available");
      return;
    }

    setLoading(true);
    setStatus([]);
    setSuccess(false);

    try {
      addStatus("🚀 Starting data setup...");

      // Check existing tables
      const { data: existingTables } = await supabase
        .from('restaurant_tables')
        .select('id, name')
        .eq('tenant_id', tenant.id);

      if (!existingTables || existingTables.length === 0) {
        addStatus("📋 Creating restaurant tables...");
        
        const sampleTables = [
          { name: 'Table 1', capacity: 4, table_type: 'standard', active: true, tenant_id: tenant.id, position_x: 100, position_y: 100 },
          { name: 'Table 2', capacity: 2, table_type: 'small', active: true, tenant_id: tenant.id, position_x: 200, position_y: 100 },
          { name: 'Table 3', capacity: 6, table_type: 'large', active: true, tenant_id: tenant.id, position_x: 300, position_y: 100 },
          { name: 'Table 4', capacity: 4, table_type: 'standard', active: true, tenant_id: tenant.id, position_x: 100, position_y: 200 },
          { name: 'Bar Counter', capacity: 8, table_type: 'bar', active: true, tenant_id: tenant.id, position_x: 200, position_y: 200 },
        ];

        const { error: tableError } = await supabase
          .from('restaurant_tables')
          .insert(sampleTables);

        if (tableError) {
          addStatus(`❌ Failed to create tables: ${tableError.message}`);
          return;
        } else {
          addStatus(`✅ Created ${sampleTables.length} tables`);
        }
      } else {
        addStatus(`✅ Found ${existingTables.length} existing tables`);
      }

      // Check existing bookings for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id, guest_name')
        .eq('tenant_id', tenant.id)
        .gte('booking_time', today);

      if (!existingBookings || existingBookings.length === 0) {
        addStatus("📅 Creating sample bookings...");
        
        const now = new Date();
        const sampleBookings = [
          {
            tenant_id: tenant.id,
            guest_name: 'John Smith',
            guest_email: 'john@demo.com',
            guest_phone: '+1-555-0101',
            booking_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
            party_size: 4,
            status: 'confirmed',
            duration_minutes: 90,
            deposit_required: false,
            deposit_paid: false
          },
          {
            tenant_id: tenant.id,
            guest_name: 'Sarah Johnson',
            guest_email: 'sarah@demo.com',
            guest_phone: '+1-555-0102',
            booking_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
            party_size: 2,
            status: 'confirmed',
            duration_minutes: 60,
            deposit_required: false,
            deposit_paid: false
          },
          {
            tenant_id: tenant.id,
            guest_name: 'Mike Wilson',
            guest_email: 'mike@demo.com',
            guest_phone: '+1-555-0103',
            booking_time: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // +30 minutes
            party_size: 6,
            status: 'seated',
            duration_minutes: 120,
            deposit_required: false,
            deposit_paid: false
          },
          {
            tenant_id: tenant.id,
            guest_name: 'Emily Brown',
            guest_email: 'emily@demo.com',
            guest_phone: '+1-555-0104',
            booking_time: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
            party_size: 3,
            status: 'confirmed',
            duration_minutes: 75,
            deposit_required: true,
            deposit_paid: true
          }
        ];

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert(sampleBookings);

        if (bookingError) {
          addStatus(`❌ Failed to create bookings: ${bookingError.message}`);
          return;
        } else {
          addStatus(`✅ Created ${sampleBookings.length} bookings`);
        }
      } else {
        addStatus(`✅ Found ${existingBookings.length} existing bookings today`);
      }

      addStatus("✨ Demo data setup complete!");
      setSuccess(true);
      
    } catch (error) {
      addStatus(`❌ Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-amber-800">⚠️ No tenant available for data setup</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Database className="w-5 h-5" />
          Quick Data Setup
        </CardTitle>
        <p className="text-sm text-blue-600">
          Create sample data for testing Command Center functionality
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={createDemoData} 
            disabled={loading || success}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : success ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {success ? 'Data Created' : 'Create Sample Data'}
          </Button>
          
          {tenant && (
            <span className="text-sm text-blue-600">
              for {tenant.name} ({tenant.slug})
            </span>
          )}
        </div>

        {status.length > 0 && (
          <div className="bg-white/50 rounded border p-3">
            <h4 className="font-medium text-sm mb-2">Setup Progress:</h4>
            <div className="space-y-1 text-sm font-mono max-h-32 overflow-y-auto">
              {status.map((message, index) => (
                <div key={index} className="text-gray-700">
                  {message}
                </div>
              ))}
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-300 rounded p-3">
            <p className="text-sm text-green-800">
              ✅ <strong>Success!</strong> You can now reload the page to see the Command Center with sample data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickDataSetup;
