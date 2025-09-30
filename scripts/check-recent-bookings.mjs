#!/usr/bin/env node

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function checkRecentBookings() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  console.log('Checking for bookings in last hour...');
  console.log('Time cutoff:', oneHourAgo);
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenantId}&created_at=gte.${oneHourAgo}&select=*`, {
    headers: { 
      'apikey': ANON_KEY, 
      'Authorization': `Bearer ${ANON_KEY}` 
    }
  });
  
  if (response.ok) {
    const bookings = await response.json();
    console.log(`Found ${bookings.length} bookings in last hour:`);
    bookings.forEach(b => {
      console.log(`  - ${b.guest_name} (${b.status}) at ${b.created_at}`);
    });
  } else {
    console.log('Error:', response.status, await response.text());
  }
}

checkRecentBookings();