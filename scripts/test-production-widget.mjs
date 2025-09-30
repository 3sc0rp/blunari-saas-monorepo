#!/usr/bin/env node

// Production Widget Test Script
// Tests the live production widget booking system

const PRODUCTION_URL = 'https://app.blunari.ai';
const PRODUCTION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiZGVtbyIsImNvbmZpZ1ZlcnNpb24iOiIyLjAiLCJ0aW1lc3RhbXAiOjE3NTkyNjg2MzIsIndpZGdldFR5cGUiOiJib29raW5nIiwiZXhwIjoxNzU5MjcyMjMyLCJpYXQiOjE3NTkyNjg2MzJ9.MGE3YTRhN2IwMjU3NWYyYzRjNTk2MjdjMDM3MTVhNzk1YjM3NmY2ZDQyMmI3Njc1NGU3ZDVmMjg0YjA2NWUyOA';

async function testProductionWidget() {
  console.log('🌐 Testing Production Widget at app.blunari.ai\n');
  
  const testResults = {
    widgetLoad: false,
    tenantResolution: false,
    availabilitySearch: false,
    tokenValidation: false,
    apiConnectivity: false
  };

  try {
    // Test 1: Widget accessibility check
    console.log('📱 Step 1: Testing widget page accessibility...');
    const widgetResponse = await fetch(`${PRODUCTION_URL}/public-widget/book/demo?token=${PRODUCTION_TOKEN}`);
    
    if (widgetResponse.ok) {
      testResults.widgetLoad = true;
      console.log('✅ Widget page is accessible');
      console.log(`   Status: ${widgetResponse.status} ${widgetResponse.statusText}`);
    } else {
      console.log('❌ Widget page is not accessible');
      console.log(`   Status: ${widgetResponse.status} ${widgetResponse.statusText}`);
    }

    // Test 2: API connectivity check
    console.log('\n🔗 Step 2: Testing API connectivity...');
    
    // First, let's check if the production API uses the same Supabase instance
    const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';
    
    try {
      const apiTest = await fetch(`${supabaseUrl}/functions/v1/tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          slug: 'demo',
          token: PRODUCTION_TOKEN
        })
      });

      if (apiTest.ok) {
        testResults.apiConnectivity = true;
        const apiData = await apiTest.json();
        console.log('✅ API connectivity working');
        console.log(`   Tenant: ${apiData.tenant?.name || 'Unknown'}`);
        
        if (apiData.tenant?.name) {
          testResults.tenantResolution = true;
          console.log('✅ Tenant resolution working');
        }
      } else {
        console.log('❌ API connectivity failed');
        console.log(`   Status: ${apiTest.status}`);
        const errorText = await apiTest.text();
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ API connectivity error:', error.message);
    }

    // Test 3: Token validation
    console.log('\n🔑 Step 3: Testing token validation...');
    
    try {
      // Decode the token to check its contents (without validation)
      const tokenParts = PRODUCTION_TOKEN.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
        console.log('🔍 Token payload:', {
          slug: payload.slug,
          widgetType: payload.widgetType,
          configVersion: payload.configVersion,
          expires: new Date(payload.exp * 1000).toLocaleString(),
          isExpired: payload.exp < Math.floor(Date.now() / 1000)
        });

        if (payload.exp > Math.floor(Date.now() / 1000)) {
          testResults.tokenValidation = true;
          console.log('✅ Token is valid and not expired');
        } else {
          console.log('❌ Token is expired');
        }
      } else {
        console.log('❌ Token format is invalid');
      }
    } catch (error) {
      console.log('❌ Token parsing failed:', error.message);
    }

    // Test 4: Availability search
    console.log('\n📅 Step 4: Testing availability search...');
    
    try {
      const availabilityResponse = await fetch(`${supabaseUrl}/functions/v1/widget-booking-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          action: 'search',
          party_size: 2,
          service_date: new Date().toISOString().split('T')[0],
          time_window: { start: '17:00', end: '21:00' },
          token: PRODUCTION_TOKEN,
          timestamp: new Date().toISOString()
        })
      });

      if (availabilityResponse.ok) {
        testResults.availabilitySearch = true;
        const availabilityData = await availabilityResponse.json();
        console.log('✅ Availability search working');
        console.log(`   Slots found: ${availabilityData.slots?.length || 0}`);
      } else {
        console.log('❌ Availability search failed');
        console.log(`   Status: ${availabilityResponse.status}`);
        const errorText = await availabilityResponse.text();
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ Availability search error:', error.message);
    }

    // Summary
    console.log('\n📊 Production Widget Test Summary:');
    console.log('==========================================');
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log('');
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${testName}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 All production tests passed! Widget is fully functional.');
    } else {
      console.log('\n⚠️  Some tests failed. Widget may have limited functionality.');
    }

    // Widget URL Analysis
    console.log('\n📝 Widget URL Analysis:');
    console.log('======================');
    const widgetUrl = `${PRODUCTION_URL}/public-widget/book/demo?slug=demo&token=${PRODUCTION_TOKEN}`;
    console.log('Widget URL:', widgetUrl);
    console.log('');
    console.log('URL Parameters:');
    const params = new URL(widgetUrl).searchParams;
    for (const [key, value] of params) {
      if (key === 'token') {
        console.log(`  ${key}: ${value.substring(0, 50)}...`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

  } catch (error) {
    console.error('❌ Production test failed:', error.message);
  }
}

// Test production environment detection
async function testEnvironmentConfiguration() {
  console.log('\n🔧 Testing Environment Configuration:');
  console.log('====================================');
  
  // Test if production uses different API endpoints
  const prodApiTests = [
    'https://app.blunari.ai/api/health',
    'https://app.blunari.ai/functions/v1/tenant',
    'https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/tenant'
  ];

  for (const endpoint of prodApiTests) {
    try {
      const response = await fetch(endpoint, { method: 'HEAD' });
      console.log(`${response.ok ? '✅' : '❌'} ${endpoint} - ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint} - ${error.message}`);
    }
  }
}

console.log('🧪 Production Widget Testing Started...');
console.log('Target URL: https://app.blunari.ai/public-widget/book/demo');
console.log('');

testProductionWidget()
  .then(() => testEnvironmentConfiguration())
  .then(() => {
    console.log('\n✨ Production testing completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Open the widget URL in a browser');
    console.log('2. Test the complete booking flow manually');
    console.log('3. Check browser developer tools for any console errors');
    console.log('4. Verify the booking appears in the admin dashboard');
  })
  .catch(console.error);