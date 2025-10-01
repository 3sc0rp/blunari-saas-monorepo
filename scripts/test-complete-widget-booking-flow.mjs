import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from client-dashboard
config({ path: join(__dirname, '../apps/client-dashboard/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 DEEP ANALYSIS: Complete Widget Booking Flow\n');
console.log('Environment:', {
  SUPABASE_URL,
  hasAnonKey: !!SUPABASE_ANON_KEY
});

let token, holdId, tenantId;

try {
  // Step 1: Create widget token
  console.log('\n📝 STEP 1: Creating widget token...');
  const tokenResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      slug: 'demo',
      widget_type: 'booking',
      config_version: '2.0'
    })
  });

  console.log('Token Response Status:', tokenResponse.status);
  const tokenData = await tokenResponse.json();
  console.log('Token Response:', JSON.stringify(tokenData, null, 2));
  
  token = tokenData.token;
  if (!token) {
    throw new Error('No token received!');
  }
  console.log('✅ Token created successfully');

  // Step 2: Get tenant info
  console.log('\n📝 STEP 2: Getting tenant info...');
  const tenantResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'tenant',
      slug: 'demo',
      token: token
    })
  });

  console.log('Tenant Response Status:', tenantResponse.status);
  const tenantData = await tenantResponse.json();
  console.log('Tenant Response:', JSON.stringify(tenantData, null, 2));
  
  tenantId = tenantData.tenant_id || tenantData.id;
  if (!tenantId) {
    throw new Error('No tenant_id received!');
  }
  console.log('✅ Tenant info retrieved:', tenantId);

  // Step 3: Create hold
  console.log('\n📝 STEP 3: Creating booking hold...');
  const futureTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  
  const holdPayload = {
    action: 'hold',
    token: token,
    tenant_id: tenantId,
    party_size: 2,
    slot: {
      time: futureTime
    }
  };
  
  console.log('Hold Request Payload:', JSON.stringify(holdPayload, null, 2));
  
  const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(holdPayload)
  });

  console.log('Hold Response Status:', holdResponse.status);
  console.log('Hold Response Headers:', Object.fromEntries(holdResponse.headers.entries()));
  
  const holdText = await holdResponse.text();
  console.log('Hold Response Text:', holdText);
  
  let holdData;
  try {
    holdData = JSON.parse(holdText);
  } catch (e) {
    console.error('Failed to parse hold response as JSON');
    throw new Error(`Invalid JSON response: ${holdText}`);
  }
  
  console.log('Hold Response Data:', JSON.stringify(holdData, null, 2));
  
  holdId = holdData.hold_id;
  if (!holdId) {
    throw new Error('No hold_id received!');
  }
  console.log('✅ Hold created successfully:', holdId);

  // Step 4: Confirm reservation
  console.log('\n📝 STEP 4: Confirming reservation...');
  
  const confirmPayload = {
    action: 'confirm',
    token: token,
    tenant_id: tenantId,
    hold_id: holdId,
    guest_details: {
      first_name: 'Debug',
      last_name: 'Test',
      email: 'debug-test@example.com',
      phone: '+1-555-DEBUG',
      special_requests: 'Test booking from deep analysis script'
    },
    idempotency_key: crypto.randomUUID()
  };
  
  console.log('Confirm Request Payload:', JSON.stringify(confirmPayload, null, 2));
  
  const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(confirmPayload)
  });

  console.log('Confirm Response Status:', confirmResponse.status);
  console.log('Confirm Response Headers:', Object.fromEntries(confirmResponse.headers.entries()));
  
  const confirmText = await confirmResponse.text();
  console.log('Confirm Response Text:', confirmText);
  
  let confirmData;
  try {
    confirmData = JSON.parse(confirmText);
  } catch (e) {
    console.error('Failed to parse confirm response as JSON');
    throw new Error(`Invalid JSON response: ${confirmText}`);
  }
  
  console.log('\n🔍 DETAILED RESPONSE ANALYSIS:');
  console.log('Full Confirm Response:', JSON.stringify(confirmData, null, 2));
  console.log('\nField-by-field check:');
  console.log('  success:', confirmData.success, '(type:', typeof confirmData.success, ')');
  console.log('  reservation_id:', confirmData.reservation_id, '(type:', typeof confirmData.reservation_id, ')');
  console.log('  confirmation_number:', confirmData.confirmation_number, '(type:', typeof confirmData.confirmation_number, ')');
  console.log('  status:', confirmData.status, '(type:', typeof confirmData.status, ')');
  console.log('  summary:', confirmData.summary, '(type:', typeof confirmData.summary, ')');
  console.log('  requestId:', confirmData.requestId);
  console.log('  _fallback:', confirmData._fallback);
  console.log('  _local:', confirmData._local);

  if (confirmData.summary) {
    console.log('\nSummary breakdown:');
    console.log('  date:', confirmData.summary.date);
    console.log('  time:', confirmData.summary.time);
    console.log('  party_size:', confirmData.summary.party_size);
    console.log('  table_info:', confirmData.summary.table_info);
    console.log('  deposit_required:', confirmData.summary.deposit_required);
  }

  // Validate response structure
  console.log('\n✅ VALIDATION CHECKS:');
  const checks = {
    'Has success field': !!confirmData.success,
    'Has reservation_id': !!confirmData.reservation_id,
    'Has confirmation_number': !!confirmData.confirmation_number,
    'Has status': !!confirmData.status,
    'Has summary': !!confirmData.summary,
    'Status is valid': ['confirmed', 'pending', 'waitlisted'].includes(confirmData.status),
    'Summary has date': !!(confirmData.summary?.date),
    'Summary has party_size': !!(confirmData.summary?.party_size)
  };

  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${check}`);
  });

  const allPassed = Object.values(checks).every(v => v);
  
  if (allPassed) {
    console.log('\n🎉 SUCCESS: All validation checks passed!');
    console.log('Booking created with reservation_id:', confirmData.reservation_id);
  } else {
    console.log('\n❌ FAILURE: Some validation checks failed');
    console.log('This explains why the UI is failing');
  }

} catch (error) {
  console.error('\n💥 ERROR OCCURRED:', error.message);
  console.error('Stack:', error.stack);
  
  if (error.cause) {
    console.error('Cause:', error.cause);
  }
}
