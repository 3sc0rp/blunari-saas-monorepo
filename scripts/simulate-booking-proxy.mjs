#!/usr/bin/env node

// Simulate the exact same calls that booking-proxy.ts makes

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function simulateBookingProxy() {
  try {
    console.log('🎯 Simulating booking-proxy.ts API calls\n');
    
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
    console.log(`✅ Token created`);
    
    // Step 2: Simulate callEdgeFunction for "hold" action
    console.log('\n🏠 Step 2: Simulating callEdgeFunction for hold...');
    
    // This simulates what booking-proxy.ts does in createHold()
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    
    const requestBody = {
      // From createHold function parameters
      action: "hold",
      tenant_id: undefined, // This is set by the edge function from token
      party_size: 4,
      slot: {
        time: tomorrow.toISOString(),
        available_tables: 1
      },
      table_id: undefined,
      idempotency_key: crypto.randomUUID(),
      
      // Added by callEdgeFunction
      token: token,
      timestamp: new Date().toISOString(),
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // This matches what booking-proxy.ts does:
        'Authorization': `Bearer ${ANON_KEY}`, // No userJwt in widget context
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📊 Hold response status: ${holdRes.status}`);
    const holdResponseText = await holdRes.text();

    if (holdRes.ok) {
      console.log('\n✅ BOOKING-PROXY SIMULATION SUCCESS!');
      const holdResult = JSON.parse(holdResponseText);
      console.log('Hold result:', JSON.stringify(holdResult, null, 2));
      
      // Step 3: Simulate confirmReservation
      console.log('\n📋 Step 3: Simulating confirmReservation...');
      
      const confirmRequestBody = {
        action: "confirm",
        idempotency_key: crypto.randomUUID(),
        tenant_id: undefined, // Set by edge function
        hold_id: holdResult.hold_id,
        guest_details: {
          name: "Test Customer",
          email: "test@example.com",
          phone: "555-123-4567"
        },
        table_id: undefined,
        deposit: undefined,
        source: undefined,
        
        // Added by callEdgeFunction
        token: token,
        timestamp: new Date().toISOString(),
      };

      const confirmRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
          'x-correlation-id': crypto.randomUUID()
        },
        body: JSON.stringify(confirmRequestBody)
      });

      console.log(`📊 Confirm response status: ${confirmRes.status}`);
      const confirmResponseText = await confirmRes.text();

      if (confirmRes.ok) {
        const confirmResult = JSON.parse(confirmResponseText);
        console.log('\n🎉 COMPLETE SIMULATION SUCCESS!');
        console.log('Reservation:', {
          id: confirmResult.reservation_id || confirmResult.id,
          status: confirmResult.status,
          confirmation: confirmResult.confirmation_number || confirmResult.confirmationNumber
        });
      } else {
        console.log('\n❌ Confirmation simulation failed');
        console.log(`Response: ${confirmResponseText}`);
      }
      
    } else {
      console.log('\n❌ Hold simulation failed');
      console.log(`Response: ${holdResponseText}`);
      try {
        const errorData = JSON.parse(holdResponseText);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch {
        console.log('Raw error:', holdResponseText);
      }
    }
    
  } catch (error) {
    console.error('💥 Booking-proxy simulation failed:', error.message);
  }
}

simulateBookingProxy();