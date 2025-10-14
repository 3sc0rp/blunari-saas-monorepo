import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function BookingDebugger() {
  const [isCreating, setIsCreating] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  
  const createTestBooking = async () => {
    setIsCreating(true);
    try {
      const now = new Date();
      const bookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      
      const testBooking = {
        tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        guest_name: 'Debug Test User',
        guest_email: 'debug@testbooking.com',
        guest_phone: '+1-555-DEBUG',
        party_size: 2,
        booking_time: bookingTime.toISOString(),
        status: 'confirmed',
        special_requests: 'Created from dashboard debug tool'
      };      const { data, error } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select();
      
      if (error) {
        console.error('Failed to create booking:', error);
        toast({
          title: 'Failed to create booking',
          description: `Error: ${error.message}`,
          variant: 'destructive'
        });
      } else {        toast({
          title: 'Test booking created!',
          description: `Booking ID: ${data[0].id}`
        });
        setResults({ type: 'create', data });
      }
    } catch (err) {
      console.error('Exception creating booking:', err);
      toast({
        title: 'Exception occurred',
        description: String(err),
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const queryBookings = async () => {
    setIsQuerying(true);
    try {
      const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Failed to query bookings:', error);
        toast({
          title: 'Failed to query bookings',
          description: `Error: ${error.message}`,
          variant: 'destructive'
        });
      } else {        toast({
          title: 'Query successful!',
          description: `Found ${data?.length || 0} bookings`
        });
        setResults({ type: 'query', data });
      }
    } catch (err) {
      console.error('Exception querying bookings:', err);
      toast({
        title: 'Exception occurred',
        description: String(err),
        variant: 'destructive'
      });
    } finally {
      setIsQuerying(false);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Booking System Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={createTestBooking} 
            disabled={isCreating}
            variant="outline"
          >
            {isCreating ? 'Creating...' : 'Create Test Booking'}
          </Button>
          
          <Button 
            onClick={queryBookings} 
            disabled={isQuerying}
            variant="outline"
          >
            {isQuerying ? 'Querying...' : 'Query Bookings'}
          </Button>
        </div>
        
        {results && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h4 className="font-semibold mb-2">
              Last {results.type === 'create' ? 'Creation' : 'Query'} Result:
            </h4>
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(results.data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
