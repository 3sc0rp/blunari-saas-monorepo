// Widget Booking Debug Test
// Run this in your browser console on the widget page after opening dev tools

console.log('🔧 Widget Booking Debug Test');

// Intercept fetch requests to see what's being sent/received
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1] || {};
  
  // Only log widget-booking-live calls
  if (typeof url === 'string' && url.includes('widget-booking-live')) {
    console.log('🌐 Widget API Call:', {
      url,
      method: options.method,
      body: options.body ? JSON.parse(options.body) : null
    });
    
    return originalFetch(...args).then(response => {
      // Clone response to read it without consuming it
      const clonedResponse = response.clone();
      
      clonedResponse.json().then(data => {
        console.log('📨 Widget API Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // Specifically highlight the reservation status
        if (data && data.status) {
          console.log(`🎯 RESERVATION STATUS: ${data.status}`);
          if (data.status === 'pending') {
            console.log('✅ Correctly returned PENDING status');
          } else if (data.status === 'confirmed') {
            console.log('❌ Incorrectly returned CONFIRMED status (should be pending)');
          }
        }
      }).catch(err => {
        console.log('❌ Failed to parse response:', err);
      });
      
      return response;
    });
  }
  
  return originalFetch(...args);
};

console.log('🎯 Fetch interceptor installed. Now create a booking through the widget and watch the console.');
console.log('👀 Look for "RESERVATION STATUS" messages to see what the backend is returning.');