// Quick test script to check tenant data in Supabase
// Run this in browser console to debug tenant issues

import { supabase } from './src/integrations/supabase/client.js';

async function testTenantLookup() {
  console.log('🔍 Testing Supabase Tenant Lookup...');
  
  try {
    // Test 1: Check if we can connect to tenants table
    console.log('\n1️⃣ Testing basic connection...');
    const { data: count, error: countError } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('❌ Connection failed:', countError);
      return;
    }
    
    console.log('✅ Connection successful, tenant count:', count);
    
    // Test 2: Get all tenants
    console.log('\n2️⃣ Fetching all tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, slug, status')
      .limit(10);
      
    if (tenantsError) {
      console.error('❌ Tenant fetch failed:', tenantsError);
      return;
    }
    
    console.log('✅ Found tenants:', tenants);
    
    // Test 3: Try specific tenant lookup
    if (tenants && tenants.length > 0) {
      const firstTenant = tenants[0];
      console.log(`\n3️⃣ Testing specific lookup for: ${firstTenant.slug}`);
      
      const { data: specificTenant, error: specificError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', firstTenant.slug)
        .single();
        
      if (specificError) {
        console.error('❌ Specific lookup failed:', specificError);
      } else {
        console.log('✅ Specific lookup successful:', specificTenant);
      }
    }
    
    // Test 4: Check auth status
    console.log('\n4️⃣ Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth check failed:', authError);
    } else {
      console.log('✅ Auth status:', user ? `Authenticated as ${user.email}` : 'Anonymous');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the test
testTenantLookup();
