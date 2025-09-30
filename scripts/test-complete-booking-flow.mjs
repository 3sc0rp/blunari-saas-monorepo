#!/usr/bin/env node

// Test the complete booking flow with a valid token

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testCompleteBookingFlow() {
  try {
    console.log('🎯 Testing Complete Widget Booking Flow\n');
    
    // Step 1: Create token
    console.log('📝 Step 1: Creating widget token...');
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
      throw new Error(`Token creation failed: ${tokenRes.status} ${await tokenRes.text()}`);
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token;
    console.log(`✅ Token created: ${token.substring(0, 30)}...`);
    
    // Step 2: Try to create a hold using the booking-proxy API
    console.log('\n🏠 Step 2: Creating reservation hold...');
    const holdData = {
      partySize: 4,
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      customerInfo: {
        name: "Test Customer",
        email: "test@example.com",
        phone: "555-123-4567"
      },
      specialRequests: "Test booking from debug script"
    };

    console.log('Hold data:', JSON.stringify(holdData, null, 2));

    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/booking-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Widget-Action': 'createHold'
      },
      body: JSON.stringify(holdData)
    });

    console.log(`📊 Hold response status: ${holdRes.status}`);
    const holdResponseText = await holdRes.text();
    console.log(`📜 Hold response: ${holdResponseText}`);

    if (!holdRes.ok) {
      console.log('❌ Hold creation failed, but continuing to test confirmReservation...');
    } else {
      try {
        const holdResult = JSON.parse(holdResponseText);
        console.log('✅ Hold created successfully:', JSON.stringify(holdResult, null, 2));
        
        // Step 3: Try to confirm the reservation
        console.log('\n📋 Step 3: Confirming reservation...');
        const confirmRes = await fetch(`${SUPABASE_URL}/functions/v1/booking-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Widget-Action': 'confirmReservation'
          },
          body: JSON.stringify({
            holdId: holdResult.holdId || 'test-hold-id',
            ...holdData
          })
        });

        console.log(`📊 Confirm response status: ${confirmRes.status}`);
        const confirmResponseText = await confirmRes.text();
        console.log(`📜 Confirm response: ${confirmResponseText}`);

        if (confirmRes.ok) {
          const confirmResult = JSON.parse(confirmResponseText);
          console.log('\n🎉 BOOKING FLOW SUCCESS!');
          console.log('Final result:', JSON.stringify(confirmResult, null, 2));
        } else {
          console.log('\n❌ Confirmation failed');
        }
      } catch (parseError) {
        console.log('⚠️  Hold response not JSON, trying confirm anyway...');
      }
    }
    
    // Step 4: Check what's actually in the database
    console.log('\n🔍 Step 4: Checking database for new bookings...');
    
    // Note: This would normally require authentication, but let's see what happens
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/reservations?select=*&order=created_at.desc&limit=5`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (checkRes.ok) {
      const bookings = await checkRes.json();
      console.log(`📋 Recent bookings count: ${bookings.length}`);
      if (bookings.length > 0) {
        console.log('Most recent booking:', JSON.stringify(bookings[0], null, 2));
      } else {
        console.log('📭 No bookings found in database');
      }
    } else {
      console.log(`❌ Database check failed: ${checkRes.status}`);
    }
    
  } catch (error) {
    console.error('💥 Complete flow test failed:', error.message);
  }
}

testCompleteBookingFlow();