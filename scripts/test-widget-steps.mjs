#!/usr/bin/env node

// Test widget booking step by step to identify where it breaks

const { createClient } = await import('@supabase/supabase-js');

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Generate a proper widget token using the create-widget-token edge function
async function createWidgetToken() {
  console.log('🔑 Creating proper widget token...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        slug: 'demo',
        widget_type: 'booking',
        config_version: '2.0',
        ttl_seconds: 3600
      })
    });

    if (!response.ok) {
      throw new Error(`Token creation failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('✅ Widget token created successfully');
    
    return data.token;
  } catch (error) {
    console.error('❌ Failed to create widget token:', error.message);
    throw error;
  }
}

async function testBookingSteps() {
  console.log('🧪 Testing widget booking step by step...\n');

  try {
    // Step 1: Test tenant lookup (widget load)
    console.log('📋 Step 1: Testing tenant lookup...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo')
      .single();

    if (tenantError) {
      console.error('❌ Tenant lookup failed:', tenantError.message);
      return;
    }
    console.log('✅ Tenant found:', tenant.name);

    // Step 2: Test availability search
    console.log('\n📅 Step 2: Testing availability search...');
    const availabilityResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'search',
        party_size: 2,
        service_date: new Date().toISOString().split('T')[0],
        time_window: { start: '17:00', end: '21:00' },
        token: await createWidgetToken()
      })
    });

    if (!availabilityResponse.ok) {
      const errorText = await availabilityResponse.text();
      console.error('❌ Availability search failed:', errorText);
      return;
    }

    const availabilityData = await availabilityResponse.json();
    console.log('✅ Availability search successful');
    console.log('   Available slots:', availabilityData.slots?.length || 0);

    // Step 3: Test creating hold  
    console.log('\n🎯 Step 3: Testing hold creation...');
    const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'hold',
        tenant_id: tenant.id,
        party_size: 2,
        slot: {
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          available_tables: 1
        },
        token: await createWidgetToken()
      })
    });

    if (!holdResponse.ok) {
      const errorText = await holdResponse.text();
      console.error('❌ Hold creation failed:', errorText);
      return;
    }

    const holdData = await holdResponse.json();
    console.log('✅ Hold creation successful');
    console.log('   Hold ID:', holdData.hold_id);

    // Step 4: Test confirmation
    console.log('\n🎉 Step 4: Testing booking confirmation...');
    const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'confirm',
        tenant_id: tenant.id,
        hold_id: holdData.hold_id,
        guest_details: {
          first_name: 'Debug',
          last_name: 'Tester',
          email: 'debug@widgettest.com',
          phone: '+1234567890'
        },
        idempotency_key: crypto.randomUUID(),
        token: await createWidgetToken()
      })
    });

    if (!confirmResponse.ok) {
      const errorText = await confirmResponse.text();
      console.error('❌ Booking confirmation failed:', errorText);
      return;
    }

    const confirmData = await confirmResponse.json();
    console.log('✅ Booking confirmation successful');
    console.log('   Reservation ID:', confirmData.reservation_id);
    console.log('   Status:', confirmData.status);
    console.log('   Confirmation:', confirmData.confirmation_number);

    console.log('\n🎯 All widget booking steps working correctly!');

  } catch (error) {
    console.error('❌ Widget booking test failed:', error.message);
  }
}

testBookingSteps();