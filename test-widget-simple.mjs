#!/usr/bin/env node
/**
 * Simplified Booking Widget Test
 * Tests tenant lookup with widget token using only anon key
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, 'apps/client-dashboard/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.VITE_JWT_SECRET || process.env.WIDGET_JWT_SECRET || 'dev-jwt-secret-change-in-production-2025';

console.log('🧪 Simplified Booking Widget Test\n');
console.log('Testing: Tenant lookup with widget token');
console.log('Environment:', SUPABASE_URL ? '✅' : '❌', SUPABASE_URL);
console.log('Anon Key:', SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

function generateWidgetToken(slug) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    slug,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    configVersion: '1.0',
    widgetType: 'booking'
  };

  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const signature = simpleHMAC(`${h}.${p}`, JWT_SECRET);

  return `${h}.${p}.${signature}`;
}

// Test with a known slug - you should replace this with your actual slug
const TEST_SLUG = 'test-restaurant'; // Change this to your actual restaurant slug

console.log(`📝 Test Parameters:`);
console.log(`   Slug: ${TEST_SLUG}`);
console.log(`   JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);
console.log('');

// Generate token
const token = generateWidgetToken(TEST_SLUG);
console.log('🔐 Generated Token:');
console.log(`   ${token.substring(0, 80)}...`);
console.log('');

// Test 1: Tenant Lookup
console.log('📋 Test 1: Tenant Lookup with Token');
console.log('─'.repeat(50));

const requestBody = {
  action: 'tenant',
  slug: TEST_SLUG,
  token: token,
  timestamp: new Date().toISOString()
};

console.log('Request details:');
console.log('  Action:', requestBody.action);
console.log('  Slug:', requestBody.slug);
console.log('  Has token:', !!requestBody.token);
console.log('');

fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY
  },
  body: JSON.stringify(requestBody)
})
.then(async response => {
  console.log('Response received:');
  console.log('  Status:', response.status, response.statusText);
  console.log('  Headers:', Object.fromEntries(response.headers.entries()));
  console.log('');

  const responseText = await response.text();
  console.log('Response body:');
  console.log(responseText);
  console.log('');

  if (!response.ok) {
    console.log('❌ TEST FAILED: Non-OK status');
    console.log('');
    console.log('🔍 Diagnosis:');
    
    if (response.status === 401) {
      console.log('  - Token validation failed');
      console.log('  - Check JWT_SECRET matches edge function');
      console.log('  - Verify tenant slug exists in database');
    } else if (response.status === 404) {
      console.log('  - Edge function not found or not deployed');
      console.log('  - Function may need to be deployed');
    } else if (response.status === 403) {
      console.log('  - Permission denied');
      console.log('  - Edge function may not be properly configured');
    }
    
    process.exit(1);
  }

  try {
    const data = JSON.parse(responseText);
    
    console.log('✅ TEST PASSED: Tenant lookup successful');
    console.log('');
    console.log('📦 Tenant Data:');
    console.log('  ID:', data.tenant_id);
    console.log('  Name:', data.name);
    console.log('  Slug:', data.slug);
    console.log('  Timezone:', data.timezone);
    console.log('  Currency:', data.currency);
    console.log('');
    
    // Verify required fields
    if (!data.tenant_id || !data.name || !data.slug) {
      console.log('⚠️  Warning: Response missing required fields');
      process.exit(1);
    }
    
    console.log('🎉 All checks passed!');
    console.log('');
    console.log('✅ The tenant lookup fix is working correctly.');
    console.log('✅ Widget token authentication is functional.');
    console.log('✅ Ready for full booking flow testing.');
    
    process.exit(0);
  } catch (error) {
    console.log('❌ TEST FAILED: Invalid JSON response');
    console.log('Parse error:', error.message);
    process.exit(1);
  }
})
.catch(error => {
  console.log('❌ TEST FAILED: Network or fetch error');
  console.log('Error:', error.message);
  console.log('');
  console.log('🔍 Possible causes:');
  console.log('  - Network connectivity issues');
  console.log('  - SUPABASE_URL incorrect');
  console.log('  - Edge function not deployed');
  process.exit(1);
});
