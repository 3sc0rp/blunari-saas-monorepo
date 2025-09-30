// Enhanced Widget Debug Script - Run this in browser console before making a booking
// This will help us track which API path is being used and what the response is

// Clear console for clean debugging
console.clear();
console.log('🔍 Enhanced Widget Booking Debug Script Active');
console.log('📋 This will track:');
console.log('   1. API calls to widget-booking-live function');
console.log('   2. Response data and status');
console.log('   3. Environment routing decisions');
console.log('   4. Booking creation path (local vs external)');
console.log('');
console.log('💡 Instructions:');
console.log('   1. Open Network tab (F12 → Network)');
console.log('   2. Filter by "widget-booking-live" or "booking"');
console.log('   3. Make a test booking');
console.log('   4. Check both console logs AND network responses');
console.log('');

// Track all fetch requests to the booking function
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options] = args;
  
  // Check if this is a booking-related request
  if (typeof url === 'string' && url.includes('widget-booking-live')) {
    console.log('');
    console.log('🚀 Widget Booking API Call Detected');
    console.log('📍 URL:', url);
    console.log('🔧 Method:', options?.method || 'GET');
    
    if (options?.body) {
      try {
        const body = JSON.parse(options.body);
        console.log('📦 Request Data:', body);
        console.log('🎯 Action:', body.action);
        console.log('🏢 Tenant:', body.tenant_id);
        
        if (body.action === 'confirm') {
          console.log('');
          console.log('⚠️  CONFIRMATION REQUEST - This should show which path is taken!');
          console.log('   👀 Look for these logs in the response or function logs:');
          console.log('   • "Taking LOCAL booking path" = Pending status expected');
          console.log('   • "Taking EXTERNAL API booking path" = Confirmed status expected');
        }
      } catch (e) {
        console.log('📦 Request Body:', options.body);
      }
    }
    
    console.log('⏳ Making request...');
  }
  
  // Make the actual request
  const response = await originalFetch(...args);
  
  // If this was a booking request, log the response
  if (typeof url === 'string' && url.includes('widget-booking-live')) {
    console.log('');
    console.log('📨 Widget Booking API Response');
    console.log('📊 Status:', response.status);
    
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    try {
      const responseData = await clonedResponse.json();
      console.log('📋 Response Data:', responseData);
      
      if (responseData.status) {
        console.log('');
        console.log('🎯 BOOKING STATUS:', responseData.status.toUpperCase());
        if (responseData.status === 'pending') {
          console.log('✅ SUCCESS: Local path used - booking is pending approval');
        } else if (responseData.status === 'confirmed') {
          console.log('⚠️  External API path used - booking auto-confirmed');
        }
      }
      
      if (responseData.confirmation_number) {
        console.log('🎫 Confirmation:', responseData.confirmation_number);
        if (responseData.confirmation_number.startsWith('PEND')) {
          console.log('✅ Confirmation number format indicates PENDING status');
        } else if (responseData.confirmation_number.startsWith('CONF')) {
          console.log('⚠️  Confirmation number format indicates CONFIRMED status');
        }
      }
      
      if (responseData._local) {
        console.log('🏠 Local booking flag present - used local path');
      } else {
        console.log('🌐 No local flag - likely used external API');
      }
      
    } catch (e) {
      console.log('📋 Response (text):', await clonedResponse.text());
    }
    
    console.log('');
    console.log('📝 Summary:');
    console.log('   • Check Network tab for full request/response details');
    console.log('   • Look at function logs in Supabase dashboard for routing info');
    console.log('   • Status should be "pending" for moderation workflow');
    console.log('===============================================');
  }
  
  return response;
};

console.log('✅ Debug script ready! Make a test booking now.');
console.log('📱 Watch both console logs and Network tab responses.');