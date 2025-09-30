#!/usr/bin/env node

// Test what bookings the dashboard should now see with consistent tenant ID

const { createClient } = await import('@supabase/supabase-js');

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testDashboardQuery() {
  console.log('📊 Testing what dashboard should see...\n');

  const DEMO_TENANT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  try {
    // Query bookings exactly like the dashboard would
    console.log('🔍 Querying bookings for demo tenant...');
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Query error:', error.message);
      return;
    }

    console.log(`✅ Found ${bookings.length} bookings for demo tenant:`);
    console.log('');

    // Group by status
    const byStatus = bookings.reduce((acc, booking) => {
      const status = booking.status || 'unknown';
      if (!acc[status]) acc[status] = [];
      acc[status].push(booking);
      return acc;
    }, {});

    Object.entries(byStatus).forEach(([status, list]) => {
      console.log(`📋 ${status.toUpperCase()}: ${list.length} bookings`);
      list.slice(0, 3).forEach((booking, i) => {
        console.log(`   ${i + 1}. ${booking.guest_name} - ${new Date(booking.booking_time).toLocaleString()}`);
        console.log(`      ID: ${booking.id}`);
        console.log(`      Email: ${booking.guest_email}`);
      });
      if (list.length > 3) {
        console.log(`      ... and ${list.length - 3} more`);
      }
      console.log('');
    });

    // Check specifically for pending bookings
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    console.log(`🟡 PENDING BOOKINGS: ${pendingBookings.length}`);
    if (pendingBookings.length > 0) {
      console.log('   These should appear in the dashboard moderation queue!');
      pendingBookings.forEach((booking, i) => {
        console.log(`   ${i + 1}. ${booking.guest_name} - ${booking.id}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to test dashboard query:', error.message);
  }
}

testDashboardQuery();