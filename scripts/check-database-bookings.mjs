#!/usr/bin/env node

// Check what bookings are actually in the database

const { createClient } = await import('@supabase/supabase-js');

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkBookings() {
  console.log('🔍 Checking database for bookings...\n');

  try {
    // Check recent bookings
    const { data: recentBookings, error: recentError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent bookings:', recentError.message);
      return;
    }

    console.log(`📊 Found ${recentBookings.length} recent bookings:`);
    console.log('');

    recentBookings.forEach((booking, i) => {
      console.log(`${i + 1}. Booking ID: ${booking.id}`);
      console.log(`   Tenant ID: ${booking.tenant_id}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Guest: ${booking.guest_name} (${booking.guest_email})`);
      console.log(`   Time: ${booking.booking_time}`);
      console.log(`   Created: ${booking.created_at}`);
      console.log('');
    });

    // Check for specific recent bookings (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: veryRecentBookings, error: veryRecentError } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (!veryRecentError) {
      console.log(`⏰ Bookings created in the last hour: ${veryRecentBookings.length}`);
      veryRecentBookings.forEach((booking, i) => {
        console.log(`   ${i + 1}. ${booking.id} - ${booking.status} - ${booking.guest_name}`);
      });
      console.log('');
    }

    // Check tenant data
    console.log('🏢 Checking tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, slug, status')
      .limit(5);

    if (!tenantsError && tenants) {
      tenants.forEach(tenant => {
        console.log(`   - ${tenant.name} (${tenant.slug}): ID ${tenant.id} - ${tenant.status}`);
      });
      console.log('');
    }

    // Check for the specific reservation we created
    console.log('🎯 Looking for our test reservation...');
    const testEmail = 'test@example.com';
    const { data: testBookings, error: testError } = await supabase
      .from('bookings')
      .select('*')
      .eq('guest_email', testEmail)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!testError && testBookings) {
      console.log(`   Found ${testBookings.length} bookings with test email:`);
      testBookings.forEach(booking => {
        console.log(`   - ${booking.id}: ${booking.status} (Tenant: ${booking.tenant_id})`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to check database:', error.message);
  }
}

checkBookings();