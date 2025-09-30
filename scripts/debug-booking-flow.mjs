#!/usr/bin/env node

// Debug the edge function flow to see why bookings are getting cancelled

const PRODUCTION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiZGVtbyIsImNvbmZpZ1ZlcnNpb24iOiIyLjAiLCJ0aW1lc3RhbXAiOjE3NTkyNjg2MzIsIndpZGdldFR5cGUiOiJib29raW5nIiwiZXhwIjoxNzU5MjcyMjMyLCJpYXQiOjE3NTkyNjg2MzJ9.MGE3YTRhN2IwMjU3NWYyYzRjNTk2MjdjMDM3MTVhNzk1YjM3NmY2ZDQyMmI3Njc1NGU3ZDVmMjg0YjA2NWUyOA';
const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function debugBookingFlow() {
  console.log('🔧 DEBUGGING EDGE FUNCTION BOOKING FLOW');
  console.log('======================================');
  
  const testId = `DEBUG-${Date.now()}`;
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  try {
    // Step 1: Create hold (this should work)
    console.log('🎯 Step 1: Creating hold...');
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
        slot: {
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          available_tables: 1
        },
        token: PRODUCTION_TOKEN,
        timestamp: new Date().toISOString()
      })
    });

    if (!holdResponse.ok) {
      throw new Error(`Hold failed: ${holdResponse.status} ${await holdResponse.text()}`);
    }

    const holdData = await holdResponse.json();
    console.log('✅ Hold created successfully');
    console.log(`   Hold ID: ${holdData.hold_id}`);

    // Step 2: Confirm booking WITH detailed logging
    console.log('\n🎉 Step 2: Confirming booking with debug...');
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
          first_name: 'Debug',
          last_name: 'FlowTest',
          email: `debug-flow-${testId}@test.com`,
          phone: '+1-555-DEBUG',
          special_requests: `Debug booking flow test ${testId}`
        },
        idempotency_key: testId,
        token: PRODUCTION_TOKEN,
        timestamp: new Date().toISOString()
      })
    });

    const confirmText = await confirmResponse.text();
    console.log(`   Confirm Response Status: ${confirmResponse.status}`);
    console.log(`   Response Headers:`, Object.fromEntries(confirmResponse.headers.entries()));
    console.log(`   Raw Response Text: ${confirmText}`);
    
    if (confirmResponse.ok) {
      const confirmData = JSON.parse(confirmText);
      console.log('\n✅ Booking confirmed by edge function');
      console.log(`   Reservation ID: ${confirmData.reservation_id}`);
      console.log(`   Status from API: ${confirmData.status}`);
      console.log(`   Local booking: ${confirmData._local ? 'YES' : 'NO'}`);
      
      // Step 3: Immediately check what was actually saved to database
      console.log('\n🔍 Step 3: Checking what was saved to database...');
      
      const dbCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${confirmData.reservation_id}&select=*`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (dbCheckResponse.ok) {
        const dbResult = await dbCheckResponse.json();
        if (dbResult.length > 0) {
          const booking = dbResult[0];
          console.log('✅ Found booking in database:');
          console.log(`   ID: ${booking.id}`);
          console.log(`   Status in DB: ${booking.status}`);
          console.log(`   Guest Name: ${booking.guest_name}`);
          console.log(`   Guest Email: ${booking.guest_email}`);
          console.log(`   Created At: ${booking.created_at}`);
          console.log(`   Updated At: ${booking.updated_at}`);
          
          // Check if status changed between API response and database
          if (confirmData.status !== booking.status) {
            console.log(`⚠️  STATUS MISMATCH!`);
            console.log(`      API returned: ${confirmData.status}`);
            console.log(`      Database shows: ${booking.status}`);
            console.log(`      Something changed the status after creation!`);
          }
          
        } else {
          console.log('❌ Booking not found in database!');
        }
      } else {
        console.log(`❌ Database check failed: ${dbCheckResponse.status}`);
      }
      
    } else {
      console.log('❌ Booking confirmation failed');
      console.log(`   Error: ${confirmText}`);
    }
    
  } catch (error) {
    console.error('❌ Debug flow failed:', error.message);
  }
}

// Execute debug flow
debugBookingFlow();