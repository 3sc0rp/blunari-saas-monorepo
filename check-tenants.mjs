#!/usr/bin/env node
/**
 * Check what tenants exist in the database
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, 'apps/client-dashboard/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Checking Tenants in Database\n');
console.log('Supabase URL:', SUPABASE_URL);
console.log('');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Try to fetch tenants using REST API
fetch(`${SUPABASE_URL}/rest/v1/tenants?select=id,slug,name,status&limit=10`, {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
})
.then(async response => {
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const text = await response.text();
    console.log('❌ Failed to fetch tenants');
    console.log('Error:', text);
    console.log('');
    console.log('💡 This might be due to RLS (Row Level Security) policies.');
    console.log('   You may need to use the service role key to query tenants.');
    return;
  }

  const tenants = await response.json();
  
  if (!tenants || tenants.length === 0) {
    console.log('⚠️  No tenants found in database!\n');
    console.log('📝 You need to create a tenant first. Run this SQL in Supabase:');
    console.log('');
    console.log('INSERT INTO tenants (slug, name, timezone, currency, status)');
    console.log("VALUES ('test-restaurant', 'Test Restaurant', 'UTC', 'USD', 'active');");
    console.log('');
    return;
  }

  console.log(`✅ Found ${tenants.length} tenant(s):\n`);
  
  tenants.forEach((tenant, i) => {
    console.log(`${i + 1}. ${tenant.name || 'Unnamed'}`);
    console.log(`   Slug: ${tenant.slug || 'N/A'}`);
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Status: ${tenant.status || 'N/A'}`);
    console.log('');
  });

  console.log('💡 To test with one of these tenants, update test-widget-simple.mjs');
  console.log('   Change line 63 to use one of the slugs above:');
  console.log(`   const TEST_SLUG = '${tenants[0].slug}';`);
})
.catch(error => {
  console.error('❌ Network error:', error.message);
});
