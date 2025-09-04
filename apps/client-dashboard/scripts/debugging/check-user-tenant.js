// Check user tenant association in database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function checkUserTenant() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('🔍 Checking User Tenant Association...\n');
  
  try {
    // Sign in first
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
    
    // Check tenant_users table
    console.log('\n🏢 Checking tenant_users table...');
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from('tenant_users')
      .select(`
        *,
        tenant:tenants(*)
      `)
      .eq('user_id', authData.user.id);
    
    if (tenantUsersError) {
      console.error('❌ Error querying tenant_users:', tenantUsersError.message);
    } else {
      console.log('✅ Tenant users data:');
      console.log(JSON.stringify(tenantUsers, null, 2));
    }
    
    // Also check if user exists directly in tenants table as owner
    console.log('\n👑 Checking if user is tenant owner...');
    const { data: ownedTenants, error: ownedError } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', authData.user.id);
    
    if (ownedError) {
      console.error('❌ Error querying owned tenants:', ownedError.message);
    } else {
      console.log('✅ Owned tenants data:');
      console.log(JSON.stringify(ownedTenants, null, 2));
    }
    
  } catch (error) {
    console.error('🚨 Unexpected error:', error.message);
  }
}

// Run the check
checkUserTenant();
