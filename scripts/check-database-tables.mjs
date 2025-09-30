#!/usr/bin/env node

// Check what tables exist in the database for tenant management

const { createClient } = await import('@supabase/supabase-js');

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkTables() {
  console.log('🔍 Checking available tables...\n');

  try {
    // Try to query different possible tenant relationship tables
    const possibleTables = [
      'user_tenant_access',
      'tenant_users', 
      'tenant_memberships',
      'user_tenants',
      'profiles',
      'tenants'
    ];

    for (const table of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table '${table}' exists`);
          if (data && data.length > 0) {
            console.log(`   Sample columns:`, Object.keys(data[0]).join(', '));
          }
        } else {
          console.log(`❌ Table '${table}' error:`, error.message);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' not accessible`);
      }
      console.log('');
    }

    // Check if profiles table has tenant info
    console.log('👤 Checking profiles table for tenant info...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (!profilesError && profiles && profiles.length > 0) {
      console.log('Sample profile:', profiles[0]);
    }

    console.log('\n🏢 Checking tenants table structure...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);

    if (!tenantsError && tenants && tenants.length > 0) {
      console.log('Sample tenant:', tenants[0]);
    }

  } catch (error) {
    console.error('❌ Failed to check tables:', error.message);
  }
}

checkTables();