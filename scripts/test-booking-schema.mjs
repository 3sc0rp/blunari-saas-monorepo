#!/usr/bin/env node

// Check database schema constraints and triggers for bookings table

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testStatusCreation() {
  console.log('🔍 TESTING BOOKING STATUS CONSTRAINTS');
  console.log('====================================');
  
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Demo tenant
  
  try {
    // Test 1: Try to create a booking with 'pending' status
    console.log('\n1. Testing direct insert with pending status...');
    
    const testBooking = {
      tenant_id: tenantId,
      guest_name: 'Schema Test User',
      guest_email: `schema-test-${Date.now()}@test.com`,
      party_size: 2,
      booking_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 120,
      status: 'pending'
    };
    
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testBooking)
    });
    
    if (insertResponse.ok) {
      const result = await insertResponse.json();
      console.log('✅ Successfully created booking with pending status');
      console.log(`   Created ID: ${result[0].id.slice(-8)}, Status: ${result[0].status}`);
      
      // Check if status was changed
      if (result[0].status !== 'pending') {
        console.log(`⚠️  Status was changed from 'pending' to '${result[0].status}'!`);
      }
      
      // Clean up test booking
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${result[0].id}`, {
        method: 'DELETE',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });
      
    } else {
      const error = await insertResponse.text();
      console.log('❌ Failed to create booking with pending status');
      console.log(`   Error: ${insertResponse.status} ${error}`);
    }
    
    // Test 2: Try with 'confirmed' status
    console.log('\n2. Testing direct insert with confirmed status...');
    
    const testBooking2 = {
      ...testBooking,
      guest_email: `schema-test-confirmed-${Date.now()}@test.com`,
      status: 'confirmed'
    };
    
    const insertResponse2 = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testBooking2)
    });
    
    if (insertResponse2.ok) {
      const result2 = await insertResponse2.json();
      console.log('✅ Successfully created booking with confirmed status');
      console.log(`   Created ID: ${result2[0].id.slice(-8)}, Status: ${result2[0].status}`);
      
      // Clean up
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${result2[0].id}`, {
        method: 'DELETE',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });
      
    } else {
      const error2 = await insertResponse2.text();
      console.log('❌ Failed to create booking with confirmed status');
      console.log(`   Error: ${insertResponse2.status} ${error2}`);
    }
    
    // Test 3: Check what admin dashboard queries for "pending" bookings
    console.log('\n3. Checking what admin dashboard should see...');
    
    // Create a test booking that should show as pending
    const adminTestBooking = {
      tenant_id: tenantId,
      guest_name: 'Admin Dashboard Test',
      guest_email: `admin-test-${Date.now()}@test.com`,
      party_size: 4,
      booking_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 120,
      status: 'confirmed' // Try confirmed first since pending might not work
    };
    
    const adminInsert = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(adminTestBooking)
    });
    
    if (adminInsert.ok) {
      const adminResult = await adminInsert.json();
      console.log('✅ Created admin test booking');
      console.log(`   ID: ${adminResult[0].id.slice(-8)}, Status: ${adminResult[0].status}`);
      
      // Now query like admin dashboard would
      const dashboardQuery = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&status=neq.cancelled&order=booking_time.asc&select=*`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (dashboardQuery.ok) {
        const dashboardResults = await dashboardQuery.json();
        console.log(`   Admin dashboard would see ${dashboardResults.length} non-cancelled bookings`);
        dashboardResults.forEach((booking, i) => {
          console.log(`   ${i + 1}. ${booking.guest_name} - Status: ${booking.status}`);
        });
      }
      
      // Clean up
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${adminResult[0].id}`, {
        method: 'DELETE',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
  }
}

// Execute schema test
testStatusCreation();