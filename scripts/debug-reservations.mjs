#!/usr/bin/env node

// Debug production reservation creation - check what's actually in the database

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function debugReservations() {
  console.log('🔍 DEBUGGING PRODUCTION RESERVATIONS');
  console.log('===================================');
  
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Demo tenant
  
  try {
    // Check recent bookings with different queries
    console.log('📊 Checking bookings table...');
    
    // Query 1: All recent bookings for tenant
    console.log('\n1. All bookings for demo tenant (last 24h):');
    const allBookingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&booking_time=gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (allBookingsResponse.ok) {
      const bookings = await allBookingsResponse.json();
      console.log(`   Found ${bookings.length} recent bookings`);
      bookings.forEach((booking, i) => {
        console.log(`   ${i + 1}. ID: ${booking.id.slice(-8)}, Status: ${booking.status}, Guest: ${booking.guest_name}, Time: ${booking.booking_time}`);
      });
    } else {
      console.log(`   Error: ${allBookingsResponse.status} ${await allBookingsResponse.text()}`);
    }
    
    // Query 2: Specifically pending bookings
    console.log('\n2. Pending bookings:');
    const pendingResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&status=eq.pending&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (pendingResponse.ok) {
      const pending = await pendingResponse.json();
      console.log(`   Found ${pending.length} pending bookings`);
      pending.forEach((booking, i) => {
        console.log(`   ${i + 1}. ID: ${booking.id.slice(-8)}, Guest: ${booking.guest_name}, Email: ${booking.guest_email}`);
      });
    } else {
      console.log(`   Error: ${pendingResponse.status} ${await pendingResponse.text()}`);
    }
    
    // Query 3: Check for our test booking specifically
    console.log('\n3. Looking for our test booking by email pattern:');
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&guest_email=like.*test*@*.com&select=*&order=created_at.desc`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      const tests = await testResponse.json();
      console.log(`   Found ${tests.length} test bookings`);
      tests.forEach((booking, i) => {
        console.log(`   ${i + 1}. ID: ${booking.id.slice(-8)}, Status: ${booking.status}, Email: ${booking.guest_email}, Created: ${booking.created_at}`);
      });
    } else {
      console.log(`   Error: ${testResponse.status} ${await testResponse.text()}`);
    }
    
    // Query 4: Check table schema
    console.log('\n4. Checking bookings table schema...');
    const schemaResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (schemaResponse.ok) {
      const sample = await schemaResponse.json();
      if (sample.length > 0) {
        console.log('   Available columns:', Object.keys(sample[0]).join(', '));
        
        // Check if status column supports 'pending'
        console.log('\n5. Checking status column values...');
        const statusResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=status&limit=20`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statusResponse.ok) {
          const statuses = await statusResponse.json();
          const uniqueStatuses = [...new Set(statuses.map(s => s.status))];
          console.log('   Unique status values found:', uniqueStatuses.join(', '));
        }
      }
    }
    
    // Query 5: Check notification_queue for command center notifications
    console.log('\n6. Checking notification_queue...');
    const notifResponse = await fetch(`${SUPABASE_URL}/rest/v1/notification_queue?tenant_id=eq.${tenantId}&order=created_at.desc&limit=5&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (notifResponse.ok) {
      const notifs = await notifResponse.json();
      console.log(`   Found ${notifs.length} recent notifications`);
      notifs.forEach((notif, i) => {
        console.log(`   ${i + 1}. Type: ${notif.notification_type}, Title: ${notif.title}, Created: ${notif.created_at}`);
      });
    } else {
      console.log(`   Notification queue error: ${notifResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Execute debug
debugReservations();