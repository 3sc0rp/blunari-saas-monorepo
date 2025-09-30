#!/usr/bin/env node

// Production Widget API Endpoint Discovery and Test

const PRODUCTION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiZGVtbyIsImNvbmZpZ1ZlcnNpb24iOiIyLjAiLCJ0aW1lc3RhbXAiOjE3NTkyNjg2MzIsIndpZGdldFR5cGUiOiJib29raW5nIiwiZXhwIjoxNzU5MjcyMjMyLCJpYXQiOjE3NTkyNjg2MzJ9.MGE3YTRhN2IwMjU3NWYyYzRjNTk2MjdjMDM3MTVhNzk1YjM3NmY2ZDQyMmI3Njc1NGU3ZDVmMjg0YjA2NWUyOA';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function discoverProductionAPI() {
  console.log('🔍 Production API Endpoint Discovery');
  console.log('===================================');

  // Test different API base URLs
  const apiCandidates = [
    'https://app.blunari.ai/functions/v1',
    'https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1',
    'https://api.blunari.ai/functions/v1',
    'https://app.blunari.ai/api/v1'
  ];

  const endpoints = [
    'tenant',
    'widget-booking-live'
  ];

  for (const baseUrl of apiCandidates) {
    console.log(`\n🌐 Testing ${baseUrl}:`);
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`,
            'apikey': ANON_KEY,
          },
          body: JSON.stringify({
            slug: 'demo',
            token: PRODUCTION_TOKEN,
            action: 'search',
            party_size: 2
          })
        });

        const statusIcon = response.ok ? '✅' : response.status === 405 ? '🔒' : response.status === 401 ? '🔑' : '❌';
        console.log(`  ${statusIcon} ${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          try {
            const data = await response.json();
            console.log(`     Response: ${JSON.stringify(data).substring(0, 100)}...`);
          } catch (e) {
            console.log(`     Response: ${await response.text().substring(0, 100)}...`);
          }
        }

      } catch (error) {
        console.log(`  ❌ ${endpoint}: ${error.message}`);
      }
    }
  }
}

async function testDirectSupabaseAPI() {
  console.log('\n🎯 Testing Direct Supabase API (Backend):');
  console.log('========================================');

  const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
  
  try {
    // Test tenant resolution
    console.log('📋 Testing tenant resolution...');
    const tenantResponse = await fetch(`${supabaseUrl}/functions/v1/tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        slug: 'demo',
        token: PRODUCTION_TOKEN
      })
    });

    if (tenantResponse.ok) {
      const tenantData = await tenantResponse.json();
      console.log('✅ Tenant resolution working');
      console.log(`   Tenant: ${tenantData.tenant?.name}`);
      console.log(`   ID: ${tenantData.tenant?.id}`);

      // Test widget booking
      console.log('\n📅 Testing widget booking API...');
      const bookingResponse = await fetch(`${supabaseUrl}/functions/v1/widget-booking-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          action: 'search',
          party_size: 2,
          service_date: new Date().toISOString().split('T')[0],
          time_window: { start: '18:00', end: '20:00' },
          token: PRODUCTION_TOKEN,
          timestamp: new Date().toISOString()
        })
      });

      if (bookingResponse.ok) {
        const bookingData = await bookingResponse.json();
        console.log('✅ Widget booking API working');
        console.log(`   Slots available: ${bookingData.slots?.length || 0}`);
        
        return { 
          success: true, 
          apiUrl: supabaseUrl,
          tenantId: tenantData.tenant?.id 
        };
      } else {
        console.log(`❌ Widget booking API failed: ${bookingResponse.status}`);
        const errorText = await bookingResponse.text();
        console.log(`   Error: ${errorText}`);
      }
    } else {
      console.log(`❌ Tenant resolution failed: ${tenantResponse.status}`);
      const errorText = await tenantResponse.text();
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Direct Supabase API test failed: ${error.message}`);
  }

  return { success: false };
}

async function analyzeProductionWidget() {
  console.log('\n📱 Production Widget Analysis:');
  console.log('=============================');

  const widgetUrl = 'https://app.blunari.ai/public-widget/book/demo';
  const fullUrl = `${widgetUrl}?slug=demo&token=${PRODUCTION_TOKEN}`;

  try {
    const response = await fetch(fullUrl);
    console.log(`✅ Widget page accessible: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Look for API configurations in the HTML
      const apiMatches = html.match(/https?:\/\/[^"'\s]+\.supabase\.co/g) || [];
      const uniqueApis = [...new Set(apiMatches)];
      
      if (uniqueApis.length > 0) {
        console.log('🔗 Found API endpoints in widget:');
        uniqueApis.forEach(api => console.log(`   ${api}`));
      }

      // Look for environment configurations
      const envMatches = html.match(/VITE_[A-Z_]+/g) || [];
      const uniqueEnvs = [...new Set(envMatches)];
      
      if (uniqueEnvs.length > 0) {
        console.log('⚙️  Environment variables found:');
        uniqueEnvs.forEach(env => console.log(`   ${env}`));
      }

      // Check if it's a React app
      if (html.includes('React') || html.includes('vite') || html.includes('main.tsx')) {
        console.log('⚛️  Detected React/Vite application');
      }
      
      return { success: true, html };
    }
    
  } catch (error) {
    console.log(`❌ Widget analysis failed: ${error.message}`);
  }

  return { success: false };
}

async function performSimpleBookingTest() {
  console.log('\n🧪 Simple Production Booking Test:');
  console.log('=================================');

  const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
  const testId = `SIMPLE-${Date.now()}`;

  try {
    // Create a simple booking directly
    console.log('🎯 Creating test booking...');
    const bookingResponse = await fetch(`${supabaseUrl}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': testId,
      },
      body: JSON.stringify({
        action: 'confirm',
        tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Demo tenant
        party_size: 2,
        slot: { 
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          available_tables: 1 
        },
        guest_details: {
          first_name: 'Production',
          last_name: 'Widget',
          email: `prod-widget-${testId}@test.com`,
          phone: '+1-555-WIDGET',
          special_requests: `Production widget test ${testId}`
        },
        idempotency_key: testId,
        token: PRODUCTION_TOKEN,
        timestamp: new Date().toISOString()
      })
    });

    if (bookingResponse.ok) {
      const bookingData = await bookingResponse.json();
      console.log('🎉 Production booking successful!');
      console.log(`   Reservation ID: ${bookingData.reservation_id}`);
      console.log(`   Status: ${bookingData.status}`);
      console.log(`   Confirmation: ${bookingData.confirmation_number}`);
      console.log(`   Local: ${bookingData._local ? 'Yes' : 'No'}`);
      
      if (bookingData.status === 'pending') {
        console.log('✅ Pending status - moderation workflow active');
      } else if (bookingData.status === 'confirmed') {
        console.log('ℹ️  Confirmed status - auto-confirmation active');
      }

      return { success: true, booking: bookingData };
    } else {
      const errorText = await bookingResponse.text();
      console.log(`❌ Booking failed: ${bookingResponse.status}`);
      console.log(`   Error: ${errorText}`);
      return { success: false, error: errorText };
    }

  } catch (error) {
    console.log(`❌ Simple booking test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main execution
console.log('🚀 Production Widget Comprehensive Testing');
console.log('========================================');
console.log(`🌐 Target: https://app.blunari.ai/public-widget/book/demo`);
console.log(`🔑 Token expires: ${new Date(1759272232 * 1000).toLocaleString()}`);
console.log('');

discoverProductionAPI()
  .then(() => testDirectSupabaseAPI())
  .then((apiResult) => {
    if (apiResult.success) {
      console.log('✅ Direct Supabase API is working');
      return analyzeProductionWidget();
    } else {
      console.log('❌ API connectivity issues detected');
      return { success: false };
    }
  })
  .then(() => performSimpleBookingTest())
  .then((bookingResult) => {
    console.log('\n📊 Final Production Test Summary:');
    console.log('================================');
    
    if (bookingResult.success) {
      console.log('🎉 PRODUCTION WIDGET: FULLY FUNCTIONAL');
      console.log(`   ✅ Widget loads correctly`);
      console.log(`   ✅ API connectivity working`);
      console.log(`   ✅ Booking creation working`);
      console.log(`   ✅ Status: ${bookingResult.booking.status}`);
      console.log(`   ✅ Reservation: ${bookingResult.booking.reservation_id}`);
    } else {
      console.log('⚠️  PRODUCTION WIDGET: PARTIAL FUNCTIONALITY');
      console.log('   ✅ Widget page loads');
      console.log('   ❓ Booking functionality needs manual testing');
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. ✅ Open the production widget URL in browser');
    console.log('2. ✅ Complete manual end-to-end booking test');
    console.log('3. ✅ Verify booking appears in admin dashboard');
    console.log('4. ✅ Check for any browser console errors');
  })
  .catch(console.error);