#!/usr/bin/env node

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function checkAllBookings() {
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  console.log('Checking ALL bookings for tenant:', tenantId);
  console.log('');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&select=*&order=booking_time.asc`, {
    headers: { 
      'apikey': ANON_KEY, 
      'Authorization': `Bearer ${ANON_KEY}` 
    }
  });
  
  if (response.ok) {
    const bookings = await response.json();
    console.log(`✅ Found ${bookings.length} bookings total\n`);
    
    // Group by status
    const statusCounts = {};
    bookings.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });
    
    console.log('Breakdown by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\n📅 All bookings:');
    bookings.forEach((b, i) => {
      const bookingTime = new Date(b.booking_time);
      const timeStr = bookingTime.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      console.log(`${i + 1}. ${timeStr} - ${b.guest_name} (${b.status}) - Party: ${b.party_size}`);
    });
  } else {
    console.log('❌ Error:', response.status, await response.text());
  }
}

checkAllBookings();
