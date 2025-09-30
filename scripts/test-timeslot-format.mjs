#!/usr/bin/env node

// Test with the exact TimeSlot format that the widget sends

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testWithTimeSlotFormat() {
  try {
    console.log('🎯 Testing with Exact TimeSlot Format\n');
    
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
    
    // Step 2: Try hold with exact TimeSlot format (what the widget actually sends)
    console.log('\n🏠 Step 2: Creating hold with TimeSlot format...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    
    const holdData = {
      action: "hold",
      token: token,
      party_size: 4,
      slot: {
        time: tomorrow.toISOString(),
        available_tables: 1,
        revenue_projection: 45.00,
        optimal: true
      },
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

    if (holdRes.ok) {
      console.log('\n✅ TIMESLOT FORMAT WORKS!');
      const holdResult = JSON.parse(holdResponseText);
      console.log('Hold result:', JSON.stringify(holdResult, null, 2));
    } else {
      console.log('\n❌ TimeSlot format failed');
      console.log(`Response: ${holdResponseText}`);
      try {
        const errorData = JSON.parse(holdResponseText);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch {
        console.log('Raw error:', holdResponseText);
      }
    }
    
  } catch (error) {
    console.error('💥 TimeSlot format test failed:', error.message);
  }
}

testWithTimeSlotFormat();