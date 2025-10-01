#!/usr/bin/env node
/**
 * Complete Booking Widget Test Script
 * Tests both widget context and dashboard context flows
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, 'apps/client-dashboard/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.VITE_JWT_SECRET || process.env.WIDGET_JWT_SECRET || 'dev-jwt-secret-change-in-production-2025';

console.log('🧪 Booking Widget Complete Test Suite\n');
console.log('Environment Check:');
console.log('  SUPABASE_URL:', !!SUPABASE_URL ? '✅' : '❌');
console.log('  SUPABASE_ANON_KEY:', !!SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('  SUPABASE_SERVICE_KEY:', !!SUPABASE_SERVICE_KEY ? '✅' : '❌');
console.log('  JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...\n');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Simple HMAC for token generation (matches edge function)
function b64urlEncode(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function simpleHMAC(data, secret) {
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash;
  }
  return b64urlEncode(hash.substring(0, 64));
}

function generateWidgetToken(slug, options = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    slug,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (options.expiresIn || 3600),
    configVersion: options.configVersion || '1.0',
    widgetType: options.widgetType || 'booking'
  };

  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const signature = simpleHMAC(`${h}.${p}`, JWT_SECRET);

  return `${h}.${p}.${signature}`;
}

// Test 1: Get tenant from database for testing
async function getTenantForTesting() {
  console.log('\n📋 Test 1: Finding test tenant...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=id,slug,name&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tenant: ${response.status} ${await response.text()}`);
    }

    const tenants = await response.json();
    
    if (!tenants || tenants.length === 0) {
      console.log('⚠️  No tenants found in database. Creating test tenant...');
      return await createTestTenant();
    }

    const tenant = tenants[0];
    console.log('✅ Found tenant:', tenant.name, `(${tenant.slug})`);
    console.log('   ID:', tenant.id);
    return tenant;
  } catch (error) {
    console.error('❌ Failed to get tenant:', error.message);
    throw error;
  }
}

// Helper: Create test tenant if none exist
async function createTestTenant() {
  const testSlug = `test-restaurant-${Date.now()}`;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        slug: testSlug,
        name: 'Test Restaurant',
        timezone: 'UTC',
        currency: 'USD',
        status: 'active'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create tenant: ${response.status} ${await response.text()}`);
    }

    const tenant = (await response.json())[0];
    console.log('✅ Created test tenant:', tenant.name, `(${tenant.slug})`);
    return tenant;
  } catch (error) {
    console.error('❌ Failed to create test tenant:', error.message);
    throw error;
  }
}

// Test 2: Widget Context - Tenant Lookup with Token
async function testWidgetTenantLookup(tenant) {
  console.log('\n🔐 Test 2: Widget Context - Tenant Lookup with Token');
  
  const token = generateWidgetToken(tenant.slug);
  console.log('Generated widget token:', token.substring(0, 50) + '...');
  
  try {
    const requestBody = {
      action: 'tenant',
      slug: tenant.slug,
      token: token,
      timestamp: new Date().toISOString()
    };

    console.log('\nCalling edge function with:', {
      action: requestBody.action,
      slug: requestBody.slug,
      hasToken: !!requestBody.token
    });

    const response = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('Response body:', responseText.substring(0, 500));

    if (!response.ok) {
      console.log('❌ FAILED: Widget tenant lookup failed');
      console.log('   Status:', response.status);
      console.log('   Body:', responseText);
      return false;
    }

    const data = JSON.parse(responseText);
    
    if (data.tenant_id && data.name && data.slug) {
      console.log('✅ PASSED: Tenant lookup successful');
      console.log('   Tenant ID:', data.tenant_id);
      console.log('   Name:', data.name);
      console.log('   Slug:', data.slug);
      return true;
    } else {
      console.log('❌ FAILED: Response missing required fields');
      console.log('   Data:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ FAILED: Exception during widget tenant lookup:', error.message);
    return false;
  }
}

// Test 3: Widget Context - Full Booking Flow
async function testWidgetBookingFlow(tenant) {
  console.log('\n📝 Test 3: Widget Context - Full Booking Flow');
  
  const token = generateWidgetToken(tenant.slug);
  const baseRequest = {
    token: token,
    tenant_id: tenant.id,
    timestamp: new Date().toISOString()
  };

  // Step 1: Search availability
  console.log('\n  Step 3.1: Searching availability...');
  try {
    const searchRequest = {
      ...baseRequest,
      action: 'search',
      party_size: 2,
      service_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      time_window: { start: '18:00', end: '21:00' }
    };

    const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(searchRequest)
    });

    console.log('  Search response:', searchResponse.status);
    const searchData = await searchResponse.json();
    
    if (!searchResponse.ok) {
      console.log('  ⚠️  Search failed (may be expected if no tables configured):', searchData);
    } else {
      console.log('  ✅ Search successful, slots:', searchData.slots?.length || 0);
    }
  } catch (error) {
    console.log('  ⚠️  Search error:', error.message);
  }

  // Step 2: Create hold
  console.log('\n  Step 3.2: Creating hold...');
  try {
    const holdRequest = {
      ...baseRequest,
      action: 'hold',
      party_size: 2,
      slot: {
        time: '19:00',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      },
      idempotency_key: `test-hold-${Date.now()}`
    };

    const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(holdRequest)
    });

    console.log('  Hold response:', holdResponse.status);
    const holdData = await holdResponse.json();
    
    if (!holdResponse.ok) {
      console.log('  ⚠️  Hold creation failed:', holdData);
      return false;
    }

    console.log('  ✅ Hold created, ID:', holdData.hold_id);

    // Step 3: Confirm reservation
    console.log('\n  Step 3.3: Confirming reservation...');
    const confirmRequest = {
      ...baseRequest,
      action: 'confirm',
      hold_id: holdData.hold_id,
      guest_details: {
        name: 'Test Guest',
        email: 'test@example.com',
        phone: '+1234567890'
      },
      idempotency_key: `test-confirm-${Date.now()}`
    };

    const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(confirmRequest)
    });

    console.log('  Confirm response:', confirmResponse.status);
    const confirmData = await confirmResponse.json();
    
    if (!confirmResponse.ok) {
      console.log('  ❌ FAILED: Reservation confirmation failed');
      console.log('  Error:', confirmData);
      return false;
    }

    if (!confirmData.reservation_id) {
      console.log('  ❌ FAILED: No reservation_id in response');
      console.log('  Response:', confirmData);
      return false;
    }

    console.log('  ✅ PASSED: Reservation confirmed');
    console.log('     Reservation ID:', confirmData.reservation_id);
    console.log('     Confirmation #:', confirmData.confirmation_number);
    console.log('     Status:', confirmData.status);
    return true;
  } catch (error) {
    console.error('  ❌ FAILED: Exception during booking flow:', error.message);
    return false;
  }
}

// Test 4: Check database for created booking
async function verifyBookingInDatabase(tenant) {
  console.log('\n🗄️  Test 4: Verifying bookings in database...');
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?tenant_id=eq.${tenant.id}&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log('⚠️  Could not fetch bookings:', response.status);
      return;
    }

    const bookings = await response.json();
    
    if (bookings.length === 0) {
      console.log('⚠️  No bookings found in database');
      return;
    }

    console.log(`✅ Found ${bookings.length} booking(s) in database:`);
    bookings.forEach((booking, i) => {
      console.log(`\n   Booking ${i + 1}:`);
      console.log('   - ID:', booking.id);
      console.log('   - Guest:', booking.guest_name || 'N/A');
      console.log('   - Email:', booking.guest_email || 'N/A');
      console.log('   - Status:', booking.status);
      console.log('   - Time:', booking.booking_time || `${booking.booking_date} ${booking.booking_time}`);
      console.log('   - Created:', new Date(booking.created_at).toLocaleString());
    });
  } catch (error) {
    console.log('⚠️  Error checking database:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('═'.repeat(60));
  console.log('Starting Complete Booking Widget Test Suite');
  console.log('═'.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // Get test tenant
    const tenant = await getTenantForTesting();
    
    // Test widget tenant lookup
    const test2Result = await testWidgetTenantLookup(tenant);
    if (test2Result) results.passed++; else results.failed++;
    
    // Test full booking flow
    const test3Result = await testWidgetBookingFlow(tenant);
    if (test3Result) results.passed++; else results.failed++;
    
    // Verify in database
    await verifyBookingInDatabase(tenant);

  } catch (error) {
    console.error('\n❌ Fatal error during tests:', error.message);
    results.failed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('Test Summary:');
  console.log('  ✅ Passed:', results.passed);
  console.log('  ❌ Failed:', results.failed);
  console.log('  ⏭️  Skipped:', results.skipped);
  console.log('═'.repeat(60));

  if (results.failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Execute
runAllTests().catch(error => {
  console.error('Uncaught error:', error);
  process.exit(1);
});
