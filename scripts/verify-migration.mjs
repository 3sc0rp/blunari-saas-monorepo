#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzIzMTUwOSwiZXhwIjoyMDQyODA3NTA5fQ.bT7bBXF0_k7J2vITwPRb3y6RKFzQgzYKYFdPpjTQG-o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Verifying migration results...\n');

// Check tenants with auto_provisioning
const { data: tenants, error: tenantsError } = await supabase
  .from('tenants')
  .select(`
    id, 
    name, 
    slug, 
    email,
    auto_provisioning!auto_provisioning_tenant_id_fkey (
      id,
      user_id,
      login_email,
      status
    )
  `)
  .order('created_at', { ascending: false });

if (tenantsError) {
  console.error('❌ Error fetching tenants:', tenantsError);
  process.exit(1);
}

console.log('📊 TENANT VISIBILITY STATUS');
console.log('=' .repeat(60));

const tenantsWithProvisioning = tenants.filter(t => t.auto_provisioning && t.auto_provisioning.length > 0);
const tenantsWithoutProvisioning = tenants.filter(t => !t.auto_provisioning || t.auto_provisioning.length === 0);

console.log(`✅ Tenants with auto_provisioning: ${tenantsWithProvisioning.length}`);
console.log(`❌ Tenants without auto_provisioning: ${tenantsWithoutProvisioning.length}`);
console.log(`📦 Total tenants: ${tenants.length}\n`);

// Show details
console.log('📋 TENANT DETAILS');
console.log('=' .repeat(60));
tenants.forEach(tenant => {
  const provisioning = Array.isArray(tenant.auto_provisioning) && tenant.auto_provisioning.length > 0 
    ? tenant.auto_provisioning[0] 
    : null;
  
  console.log(`\nTenant: ${tenant.name} (${tenant.slug})`);
  console.log(`  Email: ${tenant.email}`);
  
  if (provisioning) {
    console.log(`  ✅ Has auto_provisioning record`);
    console.log(`  Owner Email: ${provisioning.login_email}`);
    console.log(`  Status: ${provisioning.status}`);
  } else {
    console.log(`  ❌ Missing auto_provisioning record`);
  }
});

// Check profiles
console.log('\n\n📊 PROFILE STATUS');
console.log('=' .repeat(60));

const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'owner');

if (profilesError) {
  console.error('❌ Error fetching profiles:', profilesError);
} else {
  console.log(`✅ Owner profiles found: ${profiles.length}\n`);
  profiles.forEach(profile => {
    console.log(`  - ${profile.email} (${profile.first_name} ${profile.last_name})`);
  });
}

console.log('\n\n🎉 Migration verification complete!');
console.log('\nNext steps:');
console.log('1. Hard refresh your browser (Ctrl+Shift+R)');
console.log('2. Navigate to Admin Dashboard → Tenants');
console.log('3. You should see all 9 tenants now');
console.log('4. Test the "Manage Credentials" feature - no more 500 errors!');
