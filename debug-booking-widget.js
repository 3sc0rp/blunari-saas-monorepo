// Debug script for booking widget issues
// Run this in your browser console when testing the booking widget

console.log('=== BOOKING WIDGET DEBUG SCRIPT ===');

// 1. Check environment variables
console.log('Environment Check:', {
  hasSupabaseUrl: !!window.location.origin,
  currentUrl: window.location.href,
  hasWidgetToken: new URLSearchParams(window.location.search).has('token'),
  token: new URLSearchParams(window.location.search).get('token')?.substring(0, 20) + '...',
});

// 2. Check if supabase client is available
try {
  const hasSupabase = typeof window.supabase !== 'undefined';
  console.log('Supabase client available:', hasSupabase);
} catch (e) {
  console.log('Supabase client check failed:', e.message);
}

// 3. Test edge function directly
async function testEdgeFunctionDirectly() {
  console.log('=== Testing Edge Function Directly ===');
  
  const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your actual URL
  const anonKey = 'YOUR_ANON_KEY'; // Replace with your actual key
  const token = new URLSearchParams(window.location.search).get('token');
  
  try {
    // Test tenant lookup first
    console.log('Testing tenant lookup...');
    const tenantResponse = await fetch(`${supabaseUrl}/functions/v1/tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ 
        slug: 'YOUR_TENANT_SLUG', // Replace with your tenant slug
        token: token 
      })
    });
    
    console.log('Tenant lookup response:', tenantResponse.status, await tenantResponse.text());
    
    // Test availability search
    console.log('Testing availability search...');
    const searchResponse = await fetch(`${supabaseUrl}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        action: 'search',
        party_size: 2,
        service_date: new Date().toISOString().split('T')[0], // Today
        token: token
      })
    });
    
    console.log('Search response:', searchResponse.status, await searchResponse.text());
    
  } catch (error) {
    console.error('Direct test failed:', error);
  }
}

// 4. Monitor network requests
console.log('=== Setting up network monitoring ===');
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('widget-booking-live') || args[0].includes('tenant')) {
    console.log('🌐 Booking API call:', {
      url: args[0],
      options: args[1],
      body: args[1]?.body ? JSON.parse(args[1].body) : null
    });
    
    return originalFetch.apply(this, args).then(response => {
      console.log('📥 Booking API response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return response.clone().text().then(text => {
        console.log('📄 Response body:', text);
        return response;
      });
    }).catch(error => {
      console.error('❌ Booking API error:', error);
      throw error;
    });
  }
  return originalFetch.apply(this, args);
};

// 5. Check for React errors
window.addEventListener('error', (event) => {
  if (event.message.includes('booking') || event.message.includes('reservation')) {
    console.error('🚨 Booking-related error:', event.error);
  }
});

// 6. Instructions
console.log(`
=== DEBUGGING INSTRUCTIONS ===
1. Replace YOUR_SUPABASE_URL, YOUR_ANON_KEY, and YOUR_TENANT_SLUG in the testEdgeFunctionDirectly function above
2. Run: testEdgeFunctionDirectly()
3. Try to make a booking - all API calls will be logged
4. Check the Network tab in DevTools for failed requests
5. Look for any error messages in the console

Common issues to check:
- Missing or invalid widget token in URL
- Incorrect Supabase environment variables
- Database schema mismatches
- Edge function deployment issues
`);