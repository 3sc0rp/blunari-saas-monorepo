#!/usr/bin/env node

// Comprehensive debug script for Smart Booking Creation issues

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function debugSmartBookingCreation() {
  console.log('🔬 Smart Booking Creation Debug Session');
  console.log('======================================\n');
  
  try {
    // Step 1: Check demo tenant exists and get details
    console.log('📝 Step 1: Checking demo tenant...');
    const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*&slug=eq.demo&limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!tenantRes.ok) {
      throw new Error(`Tenant check failed: ${tenantRes.status}`);
    }

    const tenants = await tenantRes.json();
    if (tenants.length === 0) {
      throw new Error('Demo tenant not found');
    }

    const tenant = tenants[0];
    console.log('✅ Demo tenant found:', {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status
    });

    // Step 2: Simulate the exact booking creation flow that SmartBookingCreation uses
    console.log('\n📝 Step 2: Testing booking creation flow...');
    
    const testBookingData = {
      customerName: "Debug Test Customer",
      email: `debug-test-${Date.now()}@example.com`,
      phone: "555-DEBUG-001",
      partySize: 3,
      date: "2025-10-02", // Tomorrow
      time: "18:30",
      duration: 120,
      source: "internal",
      specialRequests: "Debug test booking - please ignore"
    };

    console.log('Test booking data:', testBookingData);

    // Step 2a: Create widget token (like booking-proxy would)
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
    console.log('✅ Token created for booking flow');

    // Step 2b: Create hold (simulating createHold from booking-proxy)
    const bookingDateTime = new Date(`${testBookingData.date}T${testBookingData.time}`);
    const idempotencyKey = crypto.randomUUID();

    console.log('\n🏠 Creating hold...');
    const holdRequestBody = {
      action: "hold",
      tenant_id: tenant.id, // This would be resolved from token
      party_size: testBookingData.partySize,
      slot: { 
        time: bookingDateTime.toISOString(), 
        available_tables: 1 
      },
      table_id: undefined,
      idempotency_key: idempotencyKey,
      token: tokenData.token,
      timestamp: new Date().toISOString(),
    };

    console.log('Hold request:', JSON.stringify(holdRequestBody, null, 2));

    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify(holdRequestBody)
    });

    console.log(`Hold response status: ${holdRes.status}`);
    
    if (!holdRes.ok) {
      const holdError = await holdRes.text();
      throw new Error(`Hold creation failed: ${holdRes.status} - ${holdError}`);
    }

    const holdResult = await holdRes.json();
    console.log('✅ Hold created:', {
      hold_id: holdResult.hold_id,
      expires_at: holdResult.expires_at
    });

    // Step 2c: Confirm reservation (simulating confirmReservation from booking-proxy)
    console.log('\n📋 Confirming reservation...');
    
    const [first_name, ...rest] = testBookingData.customerName.trim().split(" ");
    const last_name = rest.join(" ") || "Guest";

    const confirmRequestBody = {
      action: "confirm",
      idempotency_key: idempotencyKey,
      tenant_id: tenant.id,
      hold_id: holdResult.hold_id,
      guest_details: {
        first_name: first_name,
        last_name: last_name,
        email: testBookingData.email,
        phone: testBookingData.phone,
        special_requests: testBookingData.specialRequests,
      },
      table_id: undefined,
      source: testBookingData.source,
      token: tokenData.token,
      timestamp: new Date().toISOString(),
    };

    console.log('Confirm request:', JSON.stringify(confirmRequestBody, null, 2));

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

    console.log(`Confirm response status: ${confirmRes.status}`);
    
    if (!confirmRes.ok) {
      const confirmError = await confirmRes.text();
      throw new Error(`Confirmation failed: ${confirmRes.status} - ${confirmError}`);
    }

    const confirmResult = await confirmRes.json();
    console.log('✅ Reservation confirmed:', {
      reservation_id: confirmResult.reservation_id || confirmResult.id,
      status: confirmResult.status,
      confirmation_number: confirmResult.confirmation_number || confirmResult.confirmationNumber
    });

    // Step 3: Test verification logic (simulating the verification in useSmartBookingCreation)
    console.log('\n🔍 Step 3: Testing verification logic...');
    
    const conf = confirmResult.confirmation_number || confirmResult.reservation_id || confirmResult.id;
    
    // Wait for replication (like the hook does)
    console.log('Waiting 1 second for database replication...');
    await new Promise(r => setTimeout(r, 1000));

    let verificationResults = [];

    // Verification Attempt 1: Search by confirmation number/ID
    console.log('\n🔍 Verification Attempt 1: By confirmation number/ID');
    try {
      const confCheckRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=id,status,booking_time,guest_email,confirmation_number&tenant_id=eq.${tenant.id}&or=(confirmation_number.eq.${conf},id.eq.${conf})&limit=3`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const confCheckStatus = confCheckRes.status;
      console.log(`Confirmation check status: ${confCheckStatus}`);
      
      if (confCheckRes.ok) {
        const confCheck = await confCheckRes.json();
        verificationResults.push({
          method: 'confirmation',
          success: confCheck.length > 0,
          count: confCheck.length,
          data: confCheck
        });
        console.log(`Found ${confCheck.length} booking(s) by confirmation`);
        if (confCheck.length > 0) {
          console.log('Matched booking:', confCheck[0]);
        }
      } else {
        const confError = await confCheckRes.text();
        verificationResults.push({
          method: 'confirmation',
          success: false,
          error: confError
        });
        console.log(`Confirmation check failed: ${confError}`);
      }
    } catch (e) {
      verificationResults.push({
        method: 'confirmation',
        success: false,
        error: e.message
      });
      console.log(`Confirmation check exception: ${e.message}`);
    }

    // Verification Attempt 2: Search by email + time window
    console.log('\n🔍 Verification Attempt 2: By email + time window');
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const emailCheckRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=id,status,booking_time,guest_email,confirmation_number&tenant_id=eq.${tenant.id}&guest_email=eq.${testBookingData.email}&created_at=gte.${fiveMinAgo}&order=created_at.desc&limit=5`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Email check status: ${emailCheckRes.status}`);
      
      if (emailCheckRes.ok) {
        const emailCheck = await emailCheckRes.json();
        const expectedTime = bookingDateTime.getTime();
        const matchedBooking = emailCheck.find(r => {
          const bookingTime = new Date(r.booking_time).getTime();
          const timeDiff = Math.abs(bookingTime - expectedTime);
          return timeDiff < 15 * 60 * 1000; // within 15 minutes
        });

        verificationResults.push({
          method: 'email_time',
          success: !!matchedBooking,
          count: emailCheck.length,
          matched: !!matchedBooking,
          data: emailCheck
        });
        
        console.log(`Found ${emailCheck.length} booking(s) by email, ${matchedBooking ? 'matched' : 'no match'} on time`);
        if (matchedBooking) {
          console.log('Time-matched booking:', matchedBooking);
        }
      } else {
        const emailError = await emailCheckRes.text();
        verificationResults.push({
          method: 'email_time',
          success: false,
          error: emailError
        });
        console.log(`Email check failed: ${emailError}`);
      }
    } catch (e) {
      verificationResults.push({
        method: 'email_time',
        success: false,
        error: e.message
      });
      console.log(`Email check exception: ${e.message}`);
    }

    // Verification Attempt 3: Recent bookings
    console.log('\n🔍 Verification Attempt 3: Recent bookings');
    try {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const recentCheckRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=id,status,booking_time,guest_email,confirmation_number,created_at&tenant_id=eq.${tenant.id}&created_at=gte.${twoMinAgo}&order=created_at.desc&limit=10`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Recent check status: ${recentCheckRes.status}`);
      
      if (recentCheckRes.ok) {
        const recentCheck = await recentCheckRes.json();
        verificationResults.push({
          method: 'recent',
          success: recentCheck.length > 0,
          count: recentCheck.length,
          data: recentCheck
        });
        
        console.log(`Found ${recentCheck.length} recent booking(s)`);
        if (recentCheck.length > 0) {
          console.log('Most recent:', recentCheck[0]);
        }
      } else {
        const recentError = await recentCheckRes.text();
        verificationResults.push({
          method: 'recent',
          success: false,
          error: recentError
        });
        console.log(`Recent check failed: ${recentError}`);
      }
    } catch (e) {
      verificationResults.push({
        method: 'recent',
        success: false,
        error: e.message
      });
      console.log(`Recent check exception: ${e.message}`);
    }

    // Step 4: Analyze verification results
    console.log('\n📊 Step 4: Verification Analysis');
    console.log('=================================');
    
    const successfulVerifications = verificationResults.filter(v => v.success);
    const hasPermissionErrors = verificationResults.some(v => 
      v.error && (
        v.error.includes('permission') || 
        v.error.includes('RLS') ||
        v.error.includes('access') ||
        v.error.includes('401') ||
        v.error.includes('403')
      )
    );

    console.log(`Successful verifications: ${successfulVerifications.length}/3`);
    console.log(`Permission errors detected: ${hasPermissionErrors}`);
    
    verificationResults.forEach((result, index) => {
      console.log(`\nAttempt ${index + 1} (${result.method}):`);
      console.log(`  Success: ${result.success}`);
      if (result.count !== undefined) console.log(`  Count: ${result.count}`);
      if (result.matched !== undefined) console.log(`  Matched: ${result.matched}`);
      if (result.error) console.log(`  Error: ${result.error}`);
    });

    // Step 5: Overall assessment
    console.log('\n🎯 Step 5: Debug Summary');
    console.log('========================');
    
    if (successfulVerifications.length > 0) {
      console.log('✅ BOOKING SYSTEM IS WORKING CORRECTLY');
      console.log('✅ Booking creation: SUCCESS');
      console.log('✅ Database persistence: SUCCESS');
      console.log('✅ Verification logic: SUCCESS');
      console.log('\n💡 The Smart Booking Creation should work properly.');
      console.log('💡 If you\'re still seeing errors, they might be UI-related or timing issues.');
    } else {
      console.log('❌ VERIFICATION ISSUES DETECTED');
      if (hasPermissionErrors) {
        console.log('❌ Database access permissions may be the issue');
        console.log('🔧 Check RLS policies on the bookings table');
      } else {
        console.log('❌ Verification logic may need adjustment');
        console.log('🔧 Consider loosening search criteria or extending wait times');
      }
    }

    // Step 6: Provide recommendations
    console.log('\n🔧 Recommendations:');
    if (successfulVerifications.length === 0 && hasPermissionErrors) {
      console.log('1. Check RLS policies on bookings table for anon role');
      console.log('2. Verify that tenant_id filtering is working correctly');
      console.log('3. Consider using service role for verification queries');
    } else if (successfulVerifications.length === 0) {
      console.log('1. Extend verification wait time beyond 1 second');
      console.log('2. Broaden search criteria (longer time windows, etc.)');
      console.log('3. Add retry logic for verification queries');
    } else {
      console.log('1. The booking system is working - consider removing verification entirely');
      console.log('2. If UI still shows errors, check browser console for client-side issues');
      console.log('3. Consider adding more detailed logging in the React hook');
    }

  } catch (error) {
    console.error('\n💥 Debug session failed:', error.message);
    console.error('Full error:', error);
  }
}

debugSmartBookingCreation();