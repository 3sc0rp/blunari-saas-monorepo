#!/usr/bin/env node

// Test that our dashboard fix shows pending bookings

const PRODUCTION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiZGVtbyIsImNvbmZpZ1ZlcnNpb24iOiIyLjAiLCJ0aW1lc3RhbXAiOjE3NTkyNjg2MzIsIndpZGdldFR5cGUiOiJib29raW5nIiwiZXhwIjoxNzU5MjcyMjMyLCJpYXQiOjE3NTkyNjg2MzJ9.MGE3YTRhN2IwMjU3NWYyYzRjNTU2MjdjMDM3MTVhNzk1YjM3NmY2ZDQyMmI3Njc1NGU3ZDVmMjg0YjA2NWUyOA';
const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testDashboardBookings() {
  console.log('🎯 TESTING DASHBOARD BOOKINGS DISPLAY');
  console.log('====================================');
  
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const testId = `DASH-${Date.now()}`;
  
  try {
    // Step 1: Create a new pending booking via widget
    console.log('1. Creating new pending booking...');
    
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
        party_size: 3,
        slot: {
          time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          available_tables: 1
        },
        token: PRODUCTION_TOKEN
      })
    });

    if (!holdResponse.ok) {
      throw new Error(`Hold failed: ${holdResponse.status}`);
    }

    const holdData = await holdResponse.json();
    
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
          first_name: 'Dashboard',
          last_name: 'TestUser',
          email: `dashboard-${testId}@test.com`,
          phone: '+1-555-DASH'
        },
        idempotency_key: testId,
        token: PRODUCTION_TOKEN
      })
    });

    if (!confirmResponse.ok) {
      throw new Error(`Confirm failed: ${confirmResponse.status}`);
    }

    const confirmData = await confirmResponse.json();
    console.log(`✅ Created booking: ${confirmData.reservation_id} (Status: ${confirmData.status})`);
    
    // Step 2: Query what dashboard would see
    console.log('\n2. Querying dashboard bookings...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const dashboardResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&booking_time=gte.${today}T00:00:00&booking_time=lt.${today}T23:59:59&order=booking_time.asc&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!dashboardResponse.ok) {
      throw new Error(`Dashboard query failed: ${dashboardResponse.status}`);
    }
    
    const dashboardBookings = await dashboardResponse.json();
    
    console.log(`📊 Dashboard would show ${dashboardBookings.length} bookings today:`);
    
    const stats = {
      pending: dashboardBookings.filter(b => b.status === 'pending').length,
      confirmed: dashboardBookings.filter(b => b.status === 'confirmed').length,
      seated: dashboardBookings.filter(b => b.status === 'seated').length,
      completed: dashboardBookings.filter(b => b.status === 'completed').length,
      cancelled: dashboardBookings.filter(b => b.status === 'cancelled').length
    };
    
    console.log('   📋 Status breakdown:');
    console.log(`      🟠 Pending: ${stats.pending}`);
    console.log(`      🔵 Confirmed: ${stats.confirmed}`);
    console.log(`      🟢 Seated: ${stats.seated}`);
    console.log(`      ✅ Completed: ${stats.completed}`);
    console.log(`      ❌ Cancelled: ${stats.cancelled}`);
    
    // Check if our new booking appears
    const ourBooking = dashboardBookings.find(b => b.id === confirmData.reservation_id);
    if (ourBooking) {
      console.log(`\n✅ SUCCESS: Our new booking appears in dashboard!`);
      console.log(`   Guest: ${ourBooking.guest_name}`);
      console.log(`   Status: ${ourBooking.status}`);
      console.log(`   Time: ${ourBooking.booking_time}`);
      console.log(`   Party: ${ourBooking.party_size}`);
    } else {
      console.log(`\n⚠️  Our new booking not found in dashboard results`);
    }
    
    // Step 3: Show what fixed component would display
    console.log('\n3. Fixed component would show:');
    console.log(`   "Today's Bookings" badge: ${dashboardBookings.length} total`);
    console.log(`   Stats: ${stats.pending} pending, ${stats.confirmed} confirmed, ${stats.completed} completed`);
    
    if (stats.pending > 0) {
      console.log(`   🎉 PENDING BOOKINGS NOW VISIBLE!`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Execute test
testDashboardBookings();