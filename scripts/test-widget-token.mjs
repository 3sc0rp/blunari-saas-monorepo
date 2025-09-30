#!/usr/bin/env node

// Test the widget token from browser URL

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

// Token from the URL we just generated
const WIDGET_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiZGVtbyIsImNvbmZpZ1ZlcnNpb24iOiIyLjAiLCJ0aW1lc3RhbXAiOjE3NTkyNjY4OTAsIndpZGdldFR5cGUiOiJib29raW5nIiwiZXhwIjoxNzU5MjcwNDkwLCJpYXQiOjE3NTkyNjY4OTB9.MGE3MjY0NzkwNDY5NWYyYzRjNTk2MjdjMDM3MTVhNzk1YjM3NmY2ZDQyMmI3Njc1NDA1YjcxMmI0NTA2NWUyOA';

async function testWidgetToken() {
  console.log('🧪 Testing widget token from browser URL...\n');

  try {
    // Step 1: Test tenant resolution
    console.log('📋 Step 1: Testing tenant resolution...');
    const tenantResponse = await fetch(`${SUPABASE_URL}/functions/v1/tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        slug: 'demo',
        token: WIDGET_TOKEN
      })
    });

    if (!tenantResponse.ok) {
      const errorText = await tenantResponse.text();
      console.error('❌ Tenant resolution failed:', errorText);
      return;
    }

    const tenantData = await tenantResponse.json();
    console.log('✅ Tenant resolved:', tenantData.tenant?.name || 'Unknown');
    console.log('   Tenant ID:', tenantData.tenant?.id);

    // Step 2: Test availability search (like the widget does)
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
        token: WIDGET_TOKEN,
        timestamp: new Date().toISOString()
      })
    });

    if (!availabilityResponse.ok) {
      const errorText = await availabilityResponse.text();
      console.error('❌ Availability search failed:', errorText);
      return;
    }

    const availabilityData = await availabilityResponse.json();
    console.log('✅ Availability search successful');
    console.log('   Slots found:', availabilityData.slots?.length || 0);

    console.log('\n🎯 Widget token working correctly!');
    console.log('   The issue may be in the frontend React component logic.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWidgetToken();