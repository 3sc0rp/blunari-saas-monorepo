#!/usr/bin/env node

// Complete booking flow test with comprehensive debugging
const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function generateWidgetToken() {
  console.log('🔑 Step 1: Generating widget token...');
  
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
    const errorText = await response.text();
    throw new Error(`Token creation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Token created successfully');
  return data.token;
}

async function testHoldCreation(token) {
  console.log('\n📅 Step 2: Creating booking hold...');
  
  const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      action: 'hold',
      party_size: 2,
      slot: { 
        time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        available_tables: 1 
      },
      token,
      timestamp: new Date().toISOString(),
      idempotency_key: `hold-${Date.now()}`
    })
  });
  
  const holdText = await holdResponse.text();
  console.log('Hold response status:', holdResponse.status);
  console.log('Hold response body:', holdText);
  
  if (!holdResponse.ok) {
    throw new Error(`Hold creation failed: ${holdResponse.status} ${holdText}`);
  }
  
  const holdData = JSON.parse(holdText);
  console.log('✅ Hold created:', holdData.hold_id);
  return holdData;
}

async function testReservationConfirmation(token, holdData) {
  console.log('\n🎯 Step 3: Confirming reservation...');
  
  const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      action: 'confirm',
      hold_id: holdData.hold_id,
      guest_details: {
        first_name: 'Test',
        last_name: 'User',
        email: `test-${Date.now()}@example.com`,
        phone: '+1234567890',
        special_requests: 'Comprehensive test booking'
      },
      token,
      idempotency_key: `confirm-${Date.now()}`,
      timestamp: new Date().toISOString()
    })
  });
  
  const confirmText = await confirmResponse.text();
  console.log('Confirm response status:', confirmResponse.status);
  console.log('Confirm response body:', confirmText);
  
  if (!confirmResponse.ok) {
    console.error('❌ CONFIRMATION FAILED');
    console.error('Status:', confirmResponse.status);
    console.error('Body:', confirmText);
    
    // Try to parse error details
    try {
      const errorData = JSON.parse(confirmText);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      
      // Check for database issues
      if (errorData.error?.details) {
        console.error('Database error details:', errorData.error.details);
      }
    } catch (parseError) {
      console.error('Could not parse error response');
    }
    
    throw new Error(`Reservation confirmation failed: ${confirmResponse.status} ${confirmText}`);
  }
  
  const confirmData = JSON.parse(confirmText);
  console.log('✅ Reservation response received');
  
  // Check critical fields
  console.log('\n🔍 Response Analysis:');
  console.log('Has reservation_id:', !!confirmData.reservation_id);
  console.log('Reservation ID:', confirmData.reservation_id);
  console.log('Status:', confirmData.status);
  console.log('Confirmation number:', confirmData.confirmation_number);
  console.log('Local booking:', !!confirmData._local);
  
  if (!confirmData.reservation_id) {
    console.error('❌ CRITICAL ISSUE: No reservation_id in response');
    console.error('This explains the undefined ID in the verification query');
    console.error('Available fields:', Object.keys(confirmData));
  } else {
    console.log('✅ SUCCESS: Reservation ID present');
  }
  
  return confirmData;
}

async function testCompleteFlow() {
  console.log('🧪 COMPREHENSIVE BOOKING FLOW TEST');
  console.log('====================================\n');
  
  try {
    // Step 1: Generate token
    const token = await generateWidgetToken();
    
    // Step 2: Create hold  
    const holdData = await testHoldCreation(token);
    
    // Step 3: Confirm reservation
    const confirmData = await testReservationConfirmation(token, holdData);
    
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY');
    console.log('============================');
    console.log('Final reservation data:');
    console.log(JSON.stringify(confirmData, null, 2));
    
    // Test conclusion
    if (confirmData.reservation_id) {
      console.log('\n✅ DIAGNOSIS: Booking system is working correctly');
      console.log('   The issue may be in the UI flow or error handling');
    } else {
      console.log('\n❌ DIAGNOSIS: Edge function not returning reservation_id');
      console.log('   This is the root cause of the undefined ID issue');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('=============');
    console.error('Error:', error.message);
    
    // Provide debugging guidance
    console.log('\n🔧 DEBUGGING STEPS:');
    console.log('1. Check Supabase function logs at:');
    console.log('   https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions');
    console.log('2. Look for database insertion errors');
    console.log('3. Verify booking table schema and permissions');
    console.log('4. Check if demo tenant exists in database');
  }
}

testCompleteFlow();