#!/usr/bin/env node

// Test the widget booking flow to see what status is returned

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

// Create a simple widget token for demo restaurant (mimics the real token format)
function createWidgetToken() {
  const payload = {
    slug: 'demo',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    iat: Math.floor(Date.now() / 1000)
  };
  // Simple base64 encoding (not secure, but matches the validation pattern)
  const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  // Fake signature (edge function will validate this, but for demo it might work)
  const signature = Buffer.from('fake-signature-for-demo').toString('base64url');
  return `${header}.${payloadB64}.${signature}`;
}

async function testBookingFlow() {
  console.log('🧪 Testing widget booking flow...\n');
  
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  try {
    // Step 1: Create hold
    console.log('📅 Step 1: Creating hold...');
    const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': requestId,
      },
      body: JSON.stringify({
        action: 'hold',
        tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // demo tenant
        party_size: 2,
        slot: { 
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          available_tables: 1 
        },
        token: createWidgetToken(),
        timestamp
      })
    });
    
    if (!holdResponse.ok) {
      throw new Error(`Hold failed: ${holdResponse.status} ${await holdResponse.text()}`);
    }
    
    const holdData = await holdResponse.json();
    console.log('✅ Hold created:', { hold_id: holdData.hold_id });
    
    // Step 2: Confirm reservation
    console.log('\n🎯 Step 2: Confirming reservation...');
    const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': requestId,
      },
      body: JSON.stringify({
        action: 'confirm',
        tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        hold_id: holdData.hold_id,
        guest_details: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          phone: '+1234567890',
          special_requests: 'Test booking from script'
        },
        token: createWidgetToken(),
        idempotency_key: crypto.randomUUID(),
        timestamp
      })
    });
    
    if (!confirmResponse.ok) {
      throw new Error(`Confirm failed: ${confirmResponse.status} ${await confirmResponse.text()}`);
    }
    
    const confirmData = await confirmResponse.json();
    console.log('✅ Reservation response received');
    console.log('📋 Full response:', JSON.stringify(confirmData, null, 2));
    
    // Extract key info
    console.log('\n🔍 Key Details:');
    console.log(`   Status: ${confirmData.status}`);
    console.log(`   Confirmation: ${confirmData.confirmation_number}`);
    console.log(`   Reservation ID: ${confirmData.reservation_id}`);
    console.log(`   Local booking: ${confirmData._local ? 'Yes' : 'No'}`);
    
    if (confirmData.status === 'pending') {
      console.log('✅ SUCCESS: Booking correctly created as PENDING');
    } else {
      console.log(`❌ ISSUE: Expected 'pending' status but got '${confirmData.status}'`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBookingFlow();