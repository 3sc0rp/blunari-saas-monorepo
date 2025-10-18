// Debug script to test booking queries in the browser
console.log('=== BOOKING QUERY DEBUG TEST ===');

// Test direct query using the same client as the dashboard
import { supabase } from '/src/integrations/supabase/client.js';

async function debugBookingQuery() {
  console.log('Testing direct booking query...');
  console.log('Supabase client:', supabase);
  
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  console.log('Using tenant ID:', tenantId);
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(5);
    
    console.log('Query result:', { data, error });
    
    if (error) {
      console.error('Direct query failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    } else {
      console.log('Success! Found', data?.length || 0, 'bookings');
      if (data && data.length > 0) {
        console.log('First booking:', data[0]);
      }
    }
  } catch (err) {
    console.error('Exception during query:', err);
  }
  
  // Test tenant resolution
  console.log('Testing tenant resolution...');
  try {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo')
      .single();
    
    console.log('Tenant query result:', { tenant, tenantError });
  } catch (err) {
    console.error('Exception during tenant query:', err);
  }
}

debugBookingQuery().catch(console.error);

console.log('Debug script loaded. Check console for results.');