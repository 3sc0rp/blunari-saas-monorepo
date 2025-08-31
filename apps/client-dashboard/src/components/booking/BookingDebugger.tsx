import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { getTenantBySlug, searchAvailability, createHold, confirmReservation } from '@/api/booking-proxy';
import { format } from 'date-fns';

interface DebugResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  data?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

interface BookingDebuggerProps {
  slug: string;
}

const BookingDebugger: React.FC<BookingDebuggerProps> = ({ slug }) => {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState({
    party_size: 2,
    service_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const logResult = (step: string, status: 'pending' | 'success' | 'error', data?: Record<string, unknown>, error?: string, duration?: number) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.step === step);
      const result = { step, status, data, error, duration };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      
      return [...prev, result];
    });
  };

  const testBookingFlow = async () => {
    setTesting(true);
    setResults([]);
    
    try {
      // Step 1: Get Tenant
      logResult('1. Get Tenant', 'pending');
      const tenantStart = Date.now();
      
      try {
        const tenant = await getTenantBySlug(slug);
        logResult('1. Get Tenant', 'success', tenant, undefined, Date.now() - tenantStart);
        
        // Step 2: Search Availability
        logResult('2. Search Availability', 'pending');
        const searchStart = Date.now();
        
        try {
          const searchRequest = {
            tenant_id: tenant.tenant_id,
            party_size: testData.party_size,
            service_date: testData.service_date,
          };
          
          const availability = await searchAvailability(searchRequest);
          logResult('2. Search Availability', 'success', availability, undefined, Date.now() - searchStart);
          
          if (availability.slots.length > 0) {
            const selectedSlot = availability.slots[0];
            
            // Step 3: Create Hold
            logResult('3. Create Hold', 'pending');
            const holdStart = Date.now();
            
            try {
              const hold = await createHold({
                tenant_id: tenant.tenant_id,
                party_size: testData.party_size,
                slot: selectedSlot,
              });
              logResult('3. Create Hold', 'success', hold, undefined, Date.now() - holdStart);
              
              // Step 4: Confirm Reservation (Test Mode)
              logResult('4. Confirm Reservation', 'pending');
              const confirmStart = Date.now();
              
              try {
                const guestDetails = {
                  first_name: 'Test',
                  last_name: 'User',
                  email: 'test@example.com',
                  phone: '+1234567890',
                  special_requests: 'This is a test booking from the debugger',
                };
                
                const reservation = await confirmReservation({
                  tenant_id: tenant.tenant_id,
                  hold_id: hold.hold_id,
                  guest_details: guestDetails,
                }, `test-${Date.now()}`);
                
                logResult('4. Confirm Reservation', 'success', reservation, undefined, Date.now() - confirmStart);
              } catch (confirmError) {
                logResult('4. Confirm Reservation', 'error', undefined, (confirmError as Error).message, Date.now() - confirmStart);
              }
            } catch (holdError) {
              logResult('3. Create Hold', 'error', undefined, (holdError as Error).message, Date.now() - holdStart);
            }
          } else {
            logResult('2. Search Availability', 'error', undefined, 'No available slots found');
          }
        } catch (searchError) {
          logResult('2. Search Availability', 'error', undefined, (searchError as Error).message, Date.now() - searchStart);
        }
      } catch (tenantError) {
        logResult('1. Get Tenant', 'error', undefined, (tenantError as Error).message, Date.now() - tenantStart);
      }
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 animate-pulse text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    const variants = {
      pending: 'default',
      success: 'secondary',
      error: 'destructive',
    } as const;
    
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Booking Widget Debugger
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Test the complete booking flow for slug: <code className="bg-muted px-1 rounded">{slug}</code>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Configuration */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Party Size:</label>
          <input
            type="number"
            min="1"
            max="20"
            value={testData.party_size}
            onChange={(e) => setTestData(prev => ({ ...prev, party_size: parseInt(e.target.value) || 2 }))}
            className="w-20 px-2 py-1 border rounded text-sm"
            disabled={testing}
          />
          <label className="text-sm font-medium">Date:</label>
          <input
            type="date"
            value={testData.service_date}
            onChange={(e) => setTestData(prev => ({ ...prev, service_date: e.target.value }))}
            className="px-2 py-1 border rounded text-sm"
            disabled={testing}
          />
          <Button onClick={testBookingFlow} disabled={testing}>
            {testing ? 'Testing...' : 'Run Test'}
          </Button>
        </div>

        <Separator />

        {/* Test Results */}
        <div className="space-y-4">
          <h3 className="font-medium">Test Results</h3>
          
          {results.length === 0 && !testing && (
            <div className="text-center py-8 text-muted-foreground">
              Click "Run Test" to start the booking flow test
            </div>
          )}
          
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.step}</span>
                </div>
                <div className="flex items-center gap-2">
                  {result.duration && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {result.duration}ms
                    </span>
                  )}
                  {getStatusBadge(result.status)}
                </div>
              </div>
              
              {result.error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-3 mt-2">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Error:</strong> {result.error}
                  </p>
                </div>
              )}
              
              {result.data && (
                <details className="mt-2">
                  <summary className="text-sm font-medium cursor-pointer text-blue-600 hover:text-blue-800">
                    View Response Data
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {results.length > 0 && !testing && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Summary:</span>
              <div className="flex gap-2">
                <span className="text-sm">
                  ✅ {results.filter(r => r.status === 'success').length} passed
                </span>
                <span className="text-sm">
                  ❌ {results.filter(r => r.status === 'error').length} failed
                </span>
                <span className="text-sm">
                  Total: {results.reduce((sum, r) => sum + (r.duration || 0), 0)}ms
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingDebugger;