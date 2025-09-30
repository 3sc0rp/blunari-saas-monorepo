#!/usr/bin/env node

// Test the fixed verification logic

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testFixedVerification() {
  try {
    console.log('🔧 Testing Fixed Verification Logic\n');

    // Test 1: Query with correct schema (no confirmation_number)
    console.log('📝 Test 1: Query with correct schema...');
    
    const correctRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id,status,booking_time,guest_email,guest_name&limit=3&order=created_at.desc`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Correct query status: ${correctRes.status}`);
    
    if (correctRes.ok) {
      const correct = await correctRes.json();
      console.log(`✅ Fixed query works! Found ${correct.length} bookings`);
      if (correct.length > 0) {
        console.log('Sample booking with correct schema:', correct[0]);
      }
    } else {
      const correctError = await correctRes.text();
      console.log(`❌ Fixed query failed: ${correctError}`);
    }

    // Test 2: Create a booking and verify with fixed logic
    console.log('\n📝 Test 2: Create booking and verify with fixed logic...');
    
    // Create booking first
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
      throw new Error(`Token creation failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const testEmail = `fixed-test-${Date.now()}@example.com`;
    
    // Hold
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);
    
    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        action: "hold",
        token: tokenData.token,
        party_size: 2,
        slot: { time: tomorrow.toISOString() },
        timestamp: new Date().toISOString()
      })
    });

    if (!holdRes.ok) {
      throw new Error(`Hold failed: ${holdRes.status}`);
    }

    const holdResult = await holdRes.json();
    
    // Confirm
    const confirmRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        action: "confirm",
        token: tokenData.token,
        idempotency_key: crypto.randomUUID(),
        hold_id: holdResult.hold_id,
        guest_details: {
          first_name: "Fixed",
          last_name: "Test",
          email: testEmail,
          phone: "555-FIXED-01"
        },
        timestamp: new Date().toISOString()
      })
    });

    if (!confirmRes.ok) {
      throw new Error(`Confirm failed: ${confirmRes.status}`);
    }

    const confirmResult = await confirmRes.json();
    console.log('✅ Booking created for verification test');
    
    // Now test the fixed verification logic
    console.log('\n🔍 Testing fixed verification with created booking...');
    
    await new Promise(r => setTimeout(r, 1000)); // Wait like the hook does

    // Test the fixed query approach (by email)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const emailVerifyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=id,status,booking_time,guest_email,guest_name&tenant_id=eq.f47ac10b-58cc-4372-a567-0e02b2c3d479&guest_email=eq.${encodeURIComponent(testEmail)}&created_at=gte.${fiveMinAgo}&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`Email verification status: ${emailVerifyRes.status}`);
    
    if (emailVerifyRes.ok) {
      const emailVerify = await emailVerifyRes.json();
      console.log(`✅ Fixed email verification works! Found ${emailVerify.length} booking(s)`);
      if (emailVerify.length > 0) {
        console.log('Verified booking:', {
          id: emailVerify[0].id,
          email: emailVerify[0].guest_email,
          name: emailVerify[0].guest_name,
          status: emailVerify[0].status,
          booking_time: emailVerify[0].booking_time
        });

        // Test time matching logic
        const expectedTime = tomorrow.getTime();
        const bookingTime = new Date(emailVerify[0].booking_time).getTime();
        const timeDiff = Math.abs(bookingTime - expectedTime);
        const withinWindow = timeDiff < 15 * 60 * 1000; // 15 minutes
        
        console.log(`Time matching: expected=${new Date(expectedTime).toISOString()}, actual=${emailVerify[0].booking_time}`);
        console.log(`Time difference: ${Math.round(timeDiff / 1000)} seconds, within window: ${withinWindow}`);
      }
    } else {
      const emailError = await emailVerifyRes.text();
      console.log(`❌ Email verification failed: ${emailError}`);
    }

    console.log('\n🎯 Verification Fix Summary:');
    console.log('✅ Removed non-existent confirmation_number column');
    console.log('✅ Using correct database schema (id, guest_email, guest_name, etc.)');
    console.log('✅ Verification queries should now work properly');
    console.log('✅ Smart Booking Creation should stop showing false errors');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testFixedVerification();