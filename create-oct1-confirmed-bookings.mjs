#!/usr/bin/env node

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function createConfirmedBookingsForToday() {
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  // Create bookings for October 1, 2025 using ISO strings
  const bookings = [
    {
      tenant_id: tenantId,
      guest_name: 'Sarah Johnson',
      guest_email: 'sarah@example.com',
      guest_phone: '+1-555-0101',
      party_size: 4,
      booking_time: '2025-10-01T18:00:00Z', // 6:00 PM UTC = 2:00 PM EDT (shows as Oct 1 evening)
      duration_minutes: 120,
      status: 'confirmed',
      special_requests: 'Window seat preferred'
    },
    {
      tenant_id: tenantId,
      guest_name: 'Michael Chen',
      guest_email: 'michael@example.com',
      guest_phone: '+1-555-0102',
      party_size: 2,
      booking_time: '2025-10-01T19:30:00Z', // 7:30 PM UTC
      duration_minutes: 90,
      status: 'confirmed',
      special_requests: 'Anniversary dinner'
    },
    {
      tenant_id: tenantId,
      guest_name: 'Emily Rodriguez',
      guest_email: 'emily@example.com',
      guest_phone: '+1-555-0103',
      party_size: 6,
      booking_time: '2025-10-01T20:00:00Z', // 8:00 PM UTC
      duration_minutes: 150,
      status: 'confirmed',
      special_requests: 'Birthday celebration'
    },
    {
      tenant_id: tenantId,
      guest_name: 'David Park',
      guest_email: 'david@example.com',
      guest_phone: '+1-555-0104',
      party_size: 3,
      booking_time: '2025-10-01T18:45:00Z', // 6:45 PM UTC
      duration_minutes: 120,
      status: 'confirmed',
      special_requests: null
    },
    {
      tenant_id: tenantId,
      guest_name: 'Amanda Wilson',
      guest_email: 'amanda@example.com',
      guest_phone: '+1-555-0105',
      party_size: 8,
      booking_time: '2025-10-01T19:00:00Z', // 7:00 PM UTC
      duration_minutes: 180,
      status: 'confirmed',
      special_requests: 'Corporate dinner - needs private area'
    },
    {
      tenant_id: tenantId,
      guest_name: 'Lisa Anderson',
      guest_email: 'lisa@example.com',
      guest_phone: '+1-555-0106',
      party_size: 2,
      booking_time: '2025-10-01T21:00:00Z', // 9:00 PM UTC
      duration_minutes: 90,
      status: 'confirmed',
      special_requests: 'Quiet table please'
    },
    {
      tenant_id: tenantId,
      guest_name: 'Robert Martinez',
      guest_email: 'robert@example.com',
      guest_phone: '+1-555-0107',
      party_size: 4,
      booking_time: '2025-10-01T20:30:00Z', // 8:30 PM UTC
      duration_minutes: 120,
      status: 'confirmed',
      special_requests: null
    }
  ];

  console.log('Creating 7 confirmed bookings for October 1, 2025 (UTC times)...\n');

  for (const booking of bookings) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(booking)
    });

    if (response.ok) {
      const created = await response.json();
      const bookingTime = new Date(booking.booking_time);
      console.log(`✅ Created: ${booking.guest_name} at ${booking.booking_time} - Party of ${booking.party_size}`);
    } else {
      const error = await response.text();
      console.error(`❌ Failed to create ${booking.guest_name}:`, error);
    }
  }

  console.log('\n✅ Done! Created confirmed bookings for October 1, 2025.');
  console.log('Refresh the command center to see them on the timeline.');
}

createConfirmedBookingsForToday();
