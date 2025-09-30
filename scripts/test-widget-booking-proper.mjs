#!/usr/bin/env node

// Test widget booking with proper token generation

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

// Generate a proper widget token using the create-widget-token function
async function createProperWidgetToken() {
  console.log('🔑 Creating proper widget token...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        slug: 'demo',
        widget_type: 'booking',
        config_version: '2.0',
        ttl_seconds: 3600
      })
    });

    if (!response.ok) {
      throw new Error(`Token creation failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('✅ Token created successfully');
    console.log('   Expires at:', new Date(data.expires_at * 1000).toLocaleString());
    
    return data.token;
  } catch (error) {
    console.error('❌ Failed to create token:', error.message);
    throw error;
  }
}

async function testBookingFlow() {
  console.log('🧪 Testing widget booking flow with proper token validation...\n');
  
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  try {
    // Get a proper widget token first
    const token = await createProperWidgetToken();
    console.log('🎫 Using token:', token.substring(0, 50) + '...\n');
    
    // Step 1: Create hold
    console.log('📅 Step 1: Creating hold...');
    const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': requestId,
      },
      body: JSON.stringify({
        action: 'hold',
        tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // demo tenant
        party_size: 2,
        slot: { 
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          available_tables: 1 
        },
        token,
        timestamp
      })
    });
    
    console.log('Hold response status:', holdResponse.status);
    const holdText = await holdResponse.text();
    console.log('Hold response:', holdText);
    
    if (!holdResponse.ok) {
      throw new Error(`Hold failed: ${holdResponse.status} ${holdText}`);
    }
    
    const holdData = JSON.parse(holdText);
    console.log('✅ Hold created:', { hold_id: holdData.hold_id });
    
    // Step 2: Confirm reservation
    console.log('\n🎯 Step 2: Confirming reservation...');
    const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': requestId,
      },
      body: JSON.stringify({
        action: 'confirm',
        tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        hold_id: holdData.hold_id,
        guest_details: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          phone: '+1234567890',
          special_requests: 'Test booking from script'
        },
        token,
        idempotency_key: crypto.randomUUID(),
        timestamp
      })
    });
    
    console.log('Confirm response status:', confirmResponse.status);
    const confirmText = await confirmResponse.text();
    console.log('Confirm response:', confirmText);
    
    if (!confirmResponse.ok) {
      throw new Error(`Confirm failed: ${confirmResponse.status} ${confirmText}`);
    }
    
    const confirmData = JSON.parse(confirmText);
    console.log('✅ Reservation response received');
    console.log('📋 Full response:', JSON.stringify(confirmData, null, 2));
    
    // Extract key info
    console.log('\n🔍 Key Details:');
    console.log(`   Status: ${confirmData.status}`);
    console.log(`   Confirmation: ${confirmData.confirmation_number}`);
    console.log(`   Reservation ID: ${confirmData.reservation_id}`);
    console.log(`   Local booking: ${confirmData._local ? 'Yes' : 'No'}`);
    
    if (confirmData.status === 'pending') {
      console.log('✅ SUCCESS: Booking correctly created as PENDING (requires approval)');
    } else if (confirmData.status === 'confirmed') {
      console.log(`⚠️ EXTERNAL API: Booking auto-confirmed (using external service)`);
    } else {
      console.log(`❓ UNEXPECTED: Got status '${confirmData.status}'`);
    }
    
    // Check what the logs show
    console.log('\n📋 Next Steps:');
    console.log('1. Check function logs at: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions');
    console.log('2. Look for debug messages showing which booking path was taken');
    console.log('3. Verify USE_LOCAL_BOOKING environment variable setting');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testBookingFlow();