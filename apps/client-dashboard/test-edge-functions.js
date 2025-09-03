// Test script to verify Edge Function authentication fixes
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testEdgeFunctions() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('🧪 Testing Edge Function Authentication Fixes...\n');
  
  try {
    // Test 1: Sign in with provided credentials
    console.log('1️⃣ Testing authentication with provided credentials...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'deewav3@gmail.com',
      password: 'drood12D'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }
    
    console.log('✅ Authentication successful');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    
    // Test 2: Test tenant Edge Function with session token
    console.log('\n2️⃣ Testing tenant Edge Function...');
    const { data: tenantData, error: tenantError } = await supabase.functions.invoke('tenant');
    
    if (tenantError) {
      console.error('❌ Tenant function failed:', tenantError.message);
      console.error('   Error details:', JSON.stringify(tenantError, null, 2));
    } else {
      console.log('✅ Tenant function successful');
      console.log('   Tenant data:', JSON.stringify(tenantData, null, 2));
    }
    
    // Test 3: Test get-kpis Edge Function
    console.log('\n3️⃣ Testing get-kpis Edge Function...');
    const { data: kpisData, error: kpisError } = await supabase.functions.invoke('get-kpis', {
      body: { startDate: '2025-09-01', endDate: '2025-09-03' }
    });
    
    if (kpisError) {
      console.error('❌ KPIs function failed:', kpisError.message);
      console.error('   Error details:', JSON.stringify(kpisError, null, 2));
    } else {
      console.log('✅ KPIs function successful');
      console.log('   KPIs data:', JSON.stringify(kpisData, null, 2));
    }
    
    // Test 4: Test list-tables Edge Function  
    console.log('\n4️⃣ Testing list-tables Edge Function...');
    const { data: tablesData, error: tablesError } = await supabase.functions.invoke('list-tables');
    
    if (tablesError) {
      console.error('❌ Tables function failed:', tablesError.message);
      console.error('   Error details:', JSON.stringify(tablesError, null, 2));
    } else {
      console.log('✅ Tables function successful');
      console.log('   Tables data:', JSON.stringify(tablesData, null, 2));
    }
    
  } catch (error) {
    console.error('🚨 Unexpected error:', error.message);
  }
  
  console.log('\n🏁 Test complete!');
}

// Run the test
testEdgeFunctions();
