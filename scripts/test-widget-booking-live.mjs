#!/usr/bin/env node

// Test the correct edge function: widget-booking-live

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testWidgetBookingLive() {
  try {
    console.log('🎯 Testing Widget-Booking-Live Edge Function\n');
    
    // Step 1: Create token (we know this works)
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
    
    // Step 2: Try to create a hold using the widget-booking-live function
    console.log('\n🏠 Step 2: Creating hold via widget-booking-live...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0); // 7 PM tomorrow
    
    const holdData = {
      action: "hold",
      token: token,
      party_size: 4,
      slot: tomorrow.toISOString(),
      timestamp: new Date().toISOString()
    };

    console.log('Hold request data:', JSON.stringify(holdData, null, 2));

    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify(holdData)
    });

    console.log(`📊 Hold response status: ${holdRes.status}`);
    const holdResponseText = await holdRes.text();
    console.log(`📜 Hold response: ${holdResponseText}`);

    if (holdRes.ok) {
      try {
        const holdResult = JSON.parse(holdResponseText);
        console.log('✅ Hold created successfully!');
        console.log('Hold result:', JSON.stringify(holdResult, null, 2));
        
        // Step 3: Try to confirm the reservation
        console.log('\n📋 Step 3: Confirming reservation...');
        const confirmData = {
          action: "confirm",
          token: token,
          idempotency_key: crypto.randomUUID(),
          hold_id: holdResult.hold_id || holdResult.holdId || 'test-hold',
          guest_details: {
            name: "Test Customer",
            email: "test@example.com", 
            phone: "555-123-4567"
          },
          timestamp: new Date().toISOString()
        };

        console.log('Confirm request data:', JSON.stringify(confirmData, null, 2));

        const confirmRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`,
            'apikey': ANON_KEY,
            'x-correlation-id': crypto.randomUUID()
          },
          body: JSON.stringify(confirmData)
        });

        console.log(`📊 Confirm response status: ${confirmRes.status}`);
        const confirmResponseText = await confirmRes.text();
        console.log(`📜 Confirm response: ${confirmResponseText}`);

        if (confirmRes.ok) {
          try {
            const confirmResult = JSON.parse(confirmResponseText);
            console.log('\n🎉 BOOKING FLOW SUCCESS!');
            console.log('Final reservation:', JSON.stringify(confirmResult, null, 2));
          } catch (parseError) {
            console.log('\n⚠️  Confirm response not valid JSON:', parseError.message);
          }
        } else {
          console.log('\n❌ Confirmation failed');
          try {
            const errorData = JSON.parse(confirmResponseText);
            console.log('Error details:', JSON.stringify(errorData, null, 2));
          } catch {
            console.log('Raw error:', confirmResponseText);
          }
        }
      } catch (parseError) {
        console.log('⚠️  Hold response not valid JSON:', parseError.message);
      }
    } else {
      console.log('\n❌ Hold creation failed');
      try {
        const errorData = JSON.parse(holdResponseText);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch {
        console.log('Raw error:', holdResponseText);
      }
    }
    
  } catch (error) {
    console.error('💥 Widget booking live test failed:', error.message);
  }
}

testWidgetBookingLive();