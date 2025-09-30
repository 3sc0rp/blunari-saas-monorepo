#!/usr/bin/env node

// Check what tenant the dashboard user is associated with

const { createClient } = await import('@supabase/supabase-js');

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkUserTenant() {
  console.log('👤 Checking user-tenant associations...\n');

  try {
    // Get all users 
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);

    if (!profilesError && profiles) {
      console.log(`📊 Found ${profiles.length} user profiles:`);
      profiles.forEach((profile, i) => {
        console.log(`${i + 1}. User: ${profile.full_name || profile.email || profile.id}`);
        console.log(`   ID: ${profile.id}`);
        console.log(`   Email: ${profile.email}`);
        console.log('');
      });
    }

    // Check user-tenant associations  
    const { data: userTenants, error: utError } = await supabase
      .from('user_tenant_access')
      .select(`
        user_id,
        tenant_id,
        role,
        active,
        tenants (
          name,
          slug
        )
      `)
      .eq('active', true)
      .limit(10);

    if (!utError && userTenants) {
      console.log(`🔗 User-Tenant associations (${userTenants.length}):`);
      userTenants.forEach((uta, i) => {
        console.log(`${i + 1}. User: ${uta.user_id}`);
        console.log(`   Tenant: ${uta.tenant_id} (${uta.tenants?.name} - ${uta.tenants?.slug})`);
        console.log(`   Role: ${uta.role}`);
        console.log(`   Active: ${uta.active}`);
        console.log('');
      });
    }

    // Check for demo tenant specifically
    const demoTenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    console.log(`🎯 Checking who has access to Demo Restaurant (${demoTenantId}):`);
    
    const { data: demoAccess, error: demoError } = await supabase
      .from('user_tenant_access')
      .select(`
        user_id,
        role,
        active,
        profiles (
          email,
          full_name
        )
      `)
      .eq('tenant_id', demoTenantId)
      .eq('active', true);

    if (!demoError && demoAccess) {
      console.log(`   ${demoAccess.length} users have access:`);
      demoAccess.forEach((access, i) => {
        console.log(`   ${i + 1}. ${access.profiles?.email || access.user_id} (${access.role})`);
      });
    } else {
      console.log(`   ❌ Error or no access found:`, demoError?.message);
    }

  } catch (error) {
    console.error('❌ Failed to check user-tenant data:', error.message);
  }
}

checkUserTenant();