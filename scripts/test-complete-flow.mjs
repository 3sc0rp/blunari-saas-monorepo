#!/usr/bin/env node

// Test the complete booking flow with correct format

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testCompleteFlow() {
  try {
    console.log('🎯 Testing Complete Booking Flow\n');
    
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
    
    // Step 2: Create hold
    console.log('\n🏠 Step 2: Creating hold...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    
    const holdData = {
      action: "hold",
      token: token,
      party_size: 4,
      slot: {
        time: tomorrow.toISOString()
      },
      timestamp: new Date().toISOString()
    };

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

    if (!holdRes.ok) {
      throw new Error(`Hold creation failed: ${holdRes.status} ${await holdRes.text()}`);
    }

    const holdResult = await holdRes.json();
    console.log(`✅ Hold created: ${holdResult.hold_id}`);
    
    // Step 3: Confirm reservation
    console.log('\n📋 Step 3: Confirming reservation...');
    const confirmData = {
      action: "confirm",
      token: token,
      idempotency_key: crypto.randomUUID(),
      hold_id: holdResult.hold_id,
      guest_details: {
        name: "Test Customer",
        email: "test@example.com", 
        phone: "555-123-4567"
      },
      timestamp: new Date().toISOString()
    };

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

    if (confirmRes.ok) {
      const confirmResult = JSON.parse(confirmResponseText);
      console.log('\n🎉 COMPLETE BOOKING SUCCESS!');
      console.log('Reservation created:', {
        id: confirmResult.reservation_id || confirmResult.id,
        status: confirmResult.status,
        confirmation: confirmResult.confirmation_number || confirmResult.confirmationNumber
      });
      
      // Step 4: Check database for the new booking
      console.log('\n🔍 Step 4: Verifying booking in database...');
      
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/reservations?select=*&order=created_at.desc&limit=3`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (checkRes.ok) {
        const bookings = await checkRes.json();
        console.log(`📋 Recent bookings: ${bookings.length} found`);
        const newBooking = bookings.find(b => 
          b.guest_name === "Test Customer" || 
          b.guest_email === "test@example.com" ||
          b.id === (confirmResult.reservation_id || confirmResult.id)
        );
        
        if (newBooking) {
          console.log('✅ Booking verified in database!');
          console.log('Database record:', {
            id: newBooking.id,
            status: newBooking.status,
            guest_name: newBooking.guest_name,
            guest_email: newBooking.guest_email,
            party_size: newBooking.party_size,
            created_at: newBooking.created_at
          });
        } else {
          console.log('⚠️  Booking not found in recent records');
          console.log('Recent bookings:', bookings.map(b => ({
            id: b.id,
            guest: b.guest_name,
            created: b.created_at
          })));
        }
      } else {
        console.log(`❌ Database check failed: ${checkRes.status}`);
      }
      
    } else {
      console.log('\n❌ Confirmation failed');
      console.log(`Status: ${confirmRes.status}`);
      console.log(`Response: ${confirmResponseText}`);
    }
    
  } catch (error) {
    console.error('💥 Complete flow test failed:', error.message);
  }
}

testCompleteFlow();