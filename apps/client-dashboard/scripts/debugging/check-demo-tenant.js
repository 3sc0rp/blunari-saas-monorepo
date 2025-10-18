// Check if demo tenant exists and user is properly assigned
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function checkDemoTenant() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('🏢 Checking Demo Tenant Setup...\n');
  
  try {
    // Check if demo tenant exists
    console.log('1️⃣ Looking for demo tenant...');
    const { data: demoTenants, error: demoError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo')
      .eq('active', true);
    
    if (demoError) {
      console.error('❌ Error querying demo tenant:', demoError.message);
    } else {
      console.log('✅ Demo tenant search result:');
      console.log(JSON.stringify(demoTenants, null, 2));
    }
    
    // Sign in to test the function
    console.log('\n2️⃣ Signing in user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'deewav3@gmail.com',
      password: 'drood12D'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }
    
    console.log('✅ Authentication successful');
    
    // Test the function directly
    console.log('\n3️⃣ Testing get_current_user_tenant_id function...');
    const { data: tenantIdData, error: tenantIdError } = await supabase
      .rpc('get_current_user_tenant_id');
    
    if (tenantIdError) {
      console.error('❌ Error calling tenant function:', tenantIdError.message);
    } else {
      console.log('✅ Function result:', tenantIdData);
      
      // If we got a tenant ID, fetch the full tenant data
      if (tenantIdData) {
        console.log('\n4️⃣ Fetching full tenant data...');
        const { data: fullTenant, error: fullTenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantIdData)
          .single();
        
        if (fullTenantError) {
          console.error('❌ Error fetching full tenant:', fullTenantError.message);
        } else {
          console.log('✅ Full tenant data:');
          console.log(JSON.stringify(fullTenant, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('🚨 Unexpected error:', error.message);
  }
}

// Run the check
checkDemoTenant();
