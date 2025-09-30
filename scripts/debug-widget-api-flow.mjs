#!/usr/bin/env node

// Debug the widget booking API flow vs regular booking flow

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function debugBookingAPIPaths() {
  console.log('🔧 DEBUGGING WIDGET vs REGULAR BOOKING PATHS');
  console.log('============================================');
  
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  // Get a fresh token
  console.log('1. Creating fresh widget token...');
  const createTokenResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      slug: 'demo',
      widgetType: 'booking'
    })
  });
  
  if (createTokenResponse.ok) {
    const tokenData = await createTokenResponse.json();
    console.log('✅ Fresh token created');
    
    // Test widget booking path
    console.log('\n2. Testing widget booking search...');
    const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'search',
        party_size: 2,
        service_date: '2025-10-01',
        time_window: { start: '20:00', end: '21:00' },
        token: tokenData.token
      })
    });
    
    console.log(`   Search response: ${searchResponse.status}`);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log(`   ✅ Found ${searchData.slots?.length || 0} available slots`);
      
      if (searchData.slots && searchData.slots.length > 0) {
        const slot = searchData.slots[0];
        console.log(`   Selected slot: ${slot.time}`);
        
        // Test hold creation
        console.log('\n3. Testing hold creation...');
        const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`,
            'apikey': ANON_KEY,
          },
          body: JSON.stringify({
            action: 'hold',
            tenant_id: tenantId,
            party_size: 2,
            slot: slot,
            token: tokenData.token
          })
        });
        
        console.log(`   Hold response: ${holdResponse.status}`);
        if (holdResponse.ok) {
          const holdData = await holdResponse.json();
          console.log(`   ✅ Hold created: ${holdData.hold_id}`);
          
          // Test booking confirmation
          console.log('\n4. Testing booking confirmation...');
          const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ANON_KEY}`,
              'apikey': ANON_KEY,
            },
            body: JSON.stringify({
              action: 'confirm',
              tenant_id: tenantId,
              hold_id: holdData.hold_id,
              guest_details: {
                first_name: 'API',
                last_name: 'DebugTest',
                email: `api-debug-${Date.now()}@test.com`,
                phone: '+1-555-DEBUG'
              },
              idempotency_key: `debug-${Date.now()}`,
              token: tokenData.token
            })
          });
          
          console.log(`   Confirm response: ${confirmResponse.status}`);
          const confirmText = await confirmResponse.text();
          console.log(`   Response body: ${confirmText.substring(0, 200)}...`);
          
          if (confirmResponse.ok) {
            try {
              const confirmData = JSON.parse(confirmText);
              console.log(`   ✅ Booking confirmed: ${confirmData.reservation_id}`);
              console.log(`   Status: ${confirmData.status}`);
              
              // Immediate verification
              console.log('\n5. Immediate verification...');
              const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${confirmData.reservation_id}&select=*`, {
                headers: {
                  'apikey': ANON_KEY,
                  'Authorization': `Bearer ${ANON_KEY}`
                }
              });
              
              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                if (verifyData.length > 0) {
                  console.log(`   ✅ BOOKING FOUND in database`);
                  console.log(`   Database status: ${verifyData[0].status}`);
                  console.log(`   Database guest: ${verifyData[0].guest_name}`);
                } else {
                  console.log(`   ❌ BOOKING NOT FOUND in database`);
                }
              }
            } catch (e) {
              console.log(`   ❌ Failed to parse confirm response: ${e.message}`);
            }
          } else {
            console.log(`   ❌ Confirmation failed`);
          }
        } else {
          const holdError = await holdResponse.text();
          console.log(`   ❌ Hold failed: ${holdError.substring(0, 200)}...`);
        }
      }
    } else {
      const searchError = await searchResponse.text();
      console.log(`   ❌ Search failed: ${searchError.substring(0, 200)}...`);
    }
  } else {
    console.log('❌ Token creation failed:', createTokenResponse.status);
  }
}

debugBookingAPIPaths();