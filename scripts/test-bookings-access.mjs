#!/usr/bin/env node

// Test bookings table access to debug verification issues

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testBookingsAccess() {
  try {
    console.log('🔍 Testing Bookings Table Access\n');
    
    // Test 1: Try to access bookings table with anon key
    console.log('📝 Test 1: Checking bookings table access (anon)...');
    const bookingsRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&limit=3&order=created_at.desc`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Bookings response status: ${bookingsRes.status}`);
    
    if (bookingsRes.ok) {
      const bookings = await bookingsRes.json();
      console.log(`✅ Bookings accessible: ${bookings.length} records found`);
      if (bookings.length > 0) {
        console.log('Sample booking:', {
          id: bookings[0].id,
          guest_email: bookings[0].guest_email,
          booking_time: bookings[0].booking_time,
          status: bookings[0].status,
          created_at: bookings[0].created_at
        });
      }
    } else {
      const error = await bookingsRes.text();
      console.log(`❌ Bookings table access failed: ${error}`);
    }
    
    // Test 2: Create a booking and immediately verify
    console.log('\n📝 Test 2: Create booking and verify access...');
    
    // Create token
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
    const token = tokenData.token;
    
    // Create booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 30, 0, 0);
    
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Hold
    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify({
        action: "hold",
        token: token,
        party_size: 2,
        slot: { time: tomorrow.toISOString() },
        timestamp: new Date().toISOString()
      })
    });
    
    if (!holdRes.ok) {
      throw new Error(`Hold creation failed: ${holdRes.status}`);
    }
    
    const holdResult = await holdRes.json();
    console.log(`✅ Hold created: ${holdResult.hold_id}`);
    
    // Confirm
    const confirmRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify({
        action: "confirm",
        token: token,
        idempotency_key: crypto.randomUUID(),
        hold_id: holdResult.hold_id,
        guest_details: {
          first_name: "Test",
          last_name: "Customer", 
          email: testEmail,
          phone: "555-123-4567"
        },
        timestamp: new Date().toISOString()
      })
    });
    
    if (!confirmRes.ok) {
      throw new Error(`Confirmation failed: ${confirmRes.status}`);
    }
    
    const confirmResult = await confirmRes.json();
    console.log(`✅ Reservation created: ${confirmResult.reservation_id || confirmResult.id}`);
    
    // Test 3: Try to find the booking we just created
    console.log('\n📝 Test 3: Verifying created booking...');
    
    // Wait a moment
    await new Promise(r => setTimeout(r, 1000));
    
    // Search by email
    const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&guest_email=eq.${encodeURIComponent(testEmail)}&limit=5`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Search response status: ${searchRes.status}`);
    
    if (searchRes.ok) {
      const searchResults = await searchRes.json();
      console.log(`📋 Found ${searchResults.length} booking(s) with email ${testEmail}`);
      if (searchResults.length > 0) {
        console.log('Found booking:', {
          id: searchResults[0].id,
          status: searchResults[0].status,
          booking_time: searchResults[0].booking_time,
          created_at: searchResults[0].created_at
        });
      }
    } else {
      const searchError = await searchRes.text();
      console.log(`❌ Search failed: ${searchError}`);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testBookingsAccess();