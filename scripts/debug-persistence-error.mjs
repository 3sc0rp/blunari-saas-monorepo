#!/usr/bin/env node

// Debug the reservation persistence error

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function debugPersistenceError() {
  console.log('🔍 DEBUGGING RESERVATION PERSISTENCE ERROR');
  console.log('==========================================');
  
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  try {
    // Check recent bookings including the one that may have failed
    console.log('1. Checking recent bookings...');
    
    const recentResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&order=created_at.desc&limit=10&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (recentResponse.ok) {
      const bookings = await recentResponse.json();
      console.log(`   Found ${bookings.length} recent bookings:`);
      
      bookings.forEach((booking, i) => {
        console.log(`   ${i + 1}. ${booking.guest_name} - ${booking.status} - ${booking.created_at}`);
      });
      
      // Look for "drood wick" booking specifically
      const droodBooking = bookings.find(b => b.guest_name.toLowerCase().includes('drood'));
      if (droodBooking) {
        console.log(`\n✅ Found drood wick booking:`);
        console.log(`   ID: ${droodBooking.id}`);
        console.log(`   Status: ${droodBooking.status}`);
        console.log(`   Party Size: ${droodBooking.party_size}`);
        console.log(`   Time: ${droodBooking.booking_time}`);
        console.log(`   Created: ${droodBooking.created_at}`);
      } else {
        console.log(`\n❌ No booking found for "drood wick"`);
      }
    }
    
    // Check booking holds table for stuck holds
    console.log('\n2. Checking booking holds...');
    
    const holdsResponse = await fetch(`${SUPABASE_URL}/rest/v1/booking_holds?tenant_id=eq.${tenantId}&order=created_at.desc&limit=10&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (holdsResponse.ok) {
      const holds = await holdsResponse.json();
      console.log(`   Found ${holds.length} recent holds:`);
      
      holds.forEach((hold, i) => {
        const expiry = new Date(hold.expires_at);
        const isExpired = expiry < new Date();
        console.log(`   ${i + 1}. Hold ${hold.id.slice(-8)} - Party: ${hold.party_size} - Expired: ${isExpired ? 'YES' : 'NO'}`);
      });
    }
    
    // Check edge function logs by making a test call
    console.log('\n3. Testing edge function directly...');
    
    const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
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
        time_window: { start: '18:00', end: '21:00' },
        token: 'test-token' // This will fail but show us if function is responsive
      })
    });
    
    console.log(`   Edge function response: ${testResponse.status}`);
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log(`   Error details: ${errorText.substring(0, 200)}...`);
    }
    
    // Check notification queue for any failed notifications
    console.log('\n4. Checking notification queue...');
    
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
        console.log(`   ${i + 1}. ${notif.notification_type} - ${notif.title}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Execute debug
debugPersistenceError();