#!/usr/bin/env node

/**
 * Comprehensive Booking Flow Test
 * Tests the complete booking flow to identify why reservation_id is undefined
 */

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';
const DEMO_TENANT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function testCompleteBookingFlow() {
  console.log('🧪 COMPREHENSIVE BOOKING FLOW TEST');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // Step 1: Verify tenant exists
    console.log('📍 Step 1: Verifying demo tenant exists...');
    const tenantCheck = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${DEMO_TENANT_ID}&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    
    if (tenantCheck.ok) {
      const tenants = await tenantCheck.json();
      if (tenants.length > 0) {
        console.log('✅ Tenant found:', {
          id: tenants[0].id,
          slug: tenants[0].slug,
          name: tenants[0].name
        });
      } else {
        console.error('❌ Demo tenant not found!');
        return;
      }
    } else {
      console.error('❌ Failed to check tenant:', await tenantCheck.text());
      return;
    }
    console.log('');

    // Step 2: Create widget token
    console.log('📍 Step 2: Creating widget token...');
    const tokenRes = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ 
        slug: 'demo', 
        widget_type: 'booking', 
        config_version: '2.0', 
        ttl_seconds: 3600 
      })
    });

    if (!tokenRes.ok) {
      console.error('❌ Token creation failed:', tokenRes.status, await tokenRes.text());
      return;
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token;
    console.log('✅ Token created:', token.substring(0, 30) + '...');
    console.log('');

    // Step 3: Create hold
    console.log('📍 Step 3: Creating booking hold...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    
    const holdRequest = {
      action: "hold",
      party_size: 4,
      slot: {
        time: tomorrow.toISOString(),
        available_tables: 1
      },
      idempotency_key: crypto.randomUUID(),
      token: token,
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Hold request:', JSON.stringify(holdRequest, null, 2));

    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify(holdRequest)
    });

    console.log(`📊 Hold response status: ${holdRes.status}`);
    const holdResponseText = await holdRes.text();

    if (!holdRes.ok) {
      console.error('❌ Hold creation failed');
      console.error('Response:', holdResponseText);
      try {
        const errorData = JSON.parse(holdResponseText);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch {}
      return;
    }

    const holdResult = JSON.parse(holdResponseText);
    console.log('✅ Hold created:', JSON.stringify(holdResult, null, 2));
    console.log('');

    // Step 4: Confirm reservation
    console.log('📍 Step 4: Confirming reservation...');
    
    const confirmRequest = {
      action: "confirm",
      idempotency_key: crypto.randomUUID(),
      hold_id: holdResult.hold_id,
      guest_details: {
        name: "Test Customer Flow",
        email: "test-flow@example.com",
        phone: "555-999-8888"
      },
      token: token,
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Confirm request:', JSON.stringify(confirmRequest, null, 2));

    const confirmRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify(confirmRequest)
    });

    console.log(`📊 Confirm response status: ${confirmRes.status}`);
    const confirmResponseText = await confirmRes.text();

    if (!confirmRes.ok) {
      console.error('❌ Confirmation failed');
      console.error('Response:', confirmResponseText);
      try {
        const errorData = JSON.parse(confirmResponseText);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch {}
      return;
    }

    const confirmResult = JSON.parse(confirmResponseText);
    console.log('📦 Raw confirmation response:', JSON.stringify(confirmResult, null, 2));
    console.log('');

    // Step 5: Analyze the response
    console.log('📍 Step 5: Analyzing response structure...');
    console.log('Response keys:', Object.keys(confirmResult));
    console.log('');
    
    // Check all possible ID fields
    const possibleIdFields = [
      'reservation_id',
      'reservationId', 
      'id',
      'booking_id',
      'bookingId',
      'recordId'
    ];

    console.log('🔍 Checking for reservation ID in various fields:');
    possibleIdFields.forEach(field => {
      const value = confirmResult[field];
      console.log(`  ${field}: ${value !== undefined ? value : '(undefined)'} [${typeof value}]`);
    });
    console.log('');

    // Check nested fields
    if (confirmResult.data) {
      console.log('🔍 Found nested "data" object:', JSON.stringify(confirmResult.data, null, 2));
    }
    if (confirmResult.reservation) {
      console.log('🔍 Found nested "reservation" object:', JSON.stringify(confirmResult.reservation, null, 2));
    }
    console.log('');

    // Step 6: Check database for the booking
    console.log('📍 Step 6: Checking database for created booking...');
    const dbCheck = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${DEMO_TENANT_ID}&guest_email=eq.test-flow@example.com&order=created_at.desc&limit=1&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });

    if (dbCheck.ok) {
      const bookings = await dbCheck.json();
      if (bookings.length > 0) {
        console.log('✅ Booking found in database!');
        console.log('Database record:', JSON.stringify(bookings[0], null, 2));
        console.log('');
        console.log('🎯 ISSUE IDENTIFIED: Booking was created in database but not returned in response!');
      } else {
        console.log('❌ No booking found in database');
        console.log('🎯 ISSUE IDENTIFIED: Booking was NOT created in database!');
      }
    } else {
      console.error('❌ Failed to check database:', await dbCheck.text());
    }
    console.log('');

    // Final verdict
    const hasReservationId = possibleIdFields.some(field => confirmResult[field] !== undefined);
    
    console.log('=' .repeat(80));
    console.log('📋 TEST SUMMARY');
    console.log('=' .repeat(80));
    
    if (hasReservationId) {
      const idField = possibleIdFields.find(field => confirmResult[field] !== undefined);
      console.log(`✅ Reservation ID found in field: "${idField}"`);
      console.log(`   Value: ${confirmResult[idField]}`);
      console.log('');
      console.log('💡 SOLUTION: Update booking-proxy.ts normalization to check this field');
    } else {
      console.log('❌ No reservation ID found in any expected field');
      console.log('');
      console.log('💡 SOLUTION: The edge function needs to be fixed to return reservation_id');
    }

  } catch (error) {
    console.error('💥 Test failed with exception:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testCompleteBookingFlow();
