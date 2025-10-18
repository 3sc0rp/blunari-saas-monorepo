#!/usr/bin/env node

/**
 * Script to create missing auto_provisioning records
 * This bypasses RLS policies by using the service role key
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';

// We need the service role key to bypass RLS
// Let's try to find it from environment or config
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('\n💡 You need to set the service role key first:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/settings/api');
  console.log('   2. Copy the "service_role" key (not the anon key)');
  console.log('   3. Set it as an environment variable:');
  console.log('      $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('   4. Run this script again\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 Creating missing auto_provisioning records...\n');

// Step 1: Get an admin user to use as provisioner
console.log('📋 Step 1: Finding admin user...');
const { data: employees, error: empError } = await supabase
  .from('employees')
  .select('user_id, role')
  .eq('role', 'SUPER_ADMIN')
  .eq('status', 'ACTIVE')
  .limit(1);

if (empError) {
  console.error('❌ Error fetching employees:', empError);
  process.exit(1);
}

if (!employees || employees.length === 0) {
  console.error('❌ No SUPER_ADMIN employee found');
  console.log('   Need at least one admin user to use as provisioner');
  process.exit(1);
}

const adminUserId = employees[0].user_id;
console.log(`✅ Found admin user: ${adminUserId}\n`);

// Step 2: Get all tenants
console.log('📋 Step 2: Fetching tenants...');
const { data: tenants, error: tenantsError } = await supabase
  .from('tenants')
  .select('id, name, slug, email, timezone, currency, created_at')
  .order('created_at', { ascending: false });

if (tenantsError) {
  console.error('❌ Error fetching tenants:', tenantsError);
  process.exit(1);
}

console.log(`✅ Found ${tenants.length} tenants\n`);

// Step 3: Check which ones need provisioning records
console.log('📋 Step 3: Checking for missing auto_provisioning records...');
let created = 0;
let skipped = 0;

for (const tenant of tenants) {
  // Check if already has provisioning
  const { data: existing } = await supabase
    .from('auto_provisioning')
    .select('id')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (existing) {
    console.log(`⏭️  ${tenant.name} - Already has provisioning record`);
    skipped++;
    continue;
  }

  console.log(`📝 Creating provisioning for: ${tenant.name} (${tenant.slug})`);

  // Create auto_provisioning record
  const { data: newProvisioning, error: insertError } = await supabase
    .from('auto_provisioning')
    .insert({
      user_id: adminUserId,
      tenant_id: tenant.id,
      restaurant_name: tenant.name,
      restaurant_slug: tenant.slug,
      timezone: tenant.timezone || 'America/New_York',
      currency: tenant.currency || 'USD',
      status: 'completed',
      login_email: tenant.email || 'admin@blunari.ai',
      business_email: tenant.email || 'admin@blunari.ai',
      created_at: tenant.created_at,
      completed_at: tenant.created_at
    })
    .select()
    .single();

  if (insertError) {
    console.error(`   ❌ Error creating provisioning:`, insertError);
    continue;
  }

  console.log(`   ✅ Created provisioning record: ${newProvisioning.id}`);
  created++;

  // Also ensure profile exists for admin user
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: adminUserId,
      email: tenant.email || 'admin@blunari.ai',
      first_name: 'Restaurant',
      last_name: 'Owner',
      role: 'owner',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (profileError) {
    console.warn(`   ⚠️  Profile upsert warning:`, profileError);
  } else {
    console.log(`   ✅ Profile ensured for user`);
  }

  console.log('');
}

console.log('='.repeat(60));
console.log('📊 SUMMARY:');
console.log('='.repeat(60));
console.log(`✅ Created: ${created}`);
console.log(`⏭️  Skipped (already exists): ${skipped}`);
console.log(`📦 Total tenants: ${tenants.length}\n`);

if (created > 0) {
  console.log('🎉 Success! Missing auto_provisioning records created.');
  console.log('\n📝 Next steps:');
  console.log('1. Hard refresh your browser (Ctrl+Shift+R)');
  console.log('2. Try the credential management again');
  console.log('3. Should work without 500 errors now!\n');
} else {
  console.log('ℹ️  All tenants already have provisioning records.');
  console.log('   The 500 error might be caused by something else.');
  console.log('   Check the Edge Function logs in Supabase Dashboard.\n');
}
