// Direct HTTP test to get detailed error information
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testWithFetch() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('🧪 Testing with Direct HTTP Requests...\n');
  
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
    const accessToken = authData.session.access_token;
    
    // Test tenant function with direct fetch
    console.log('\n🔍 Testing tenant function with fetch...');
    const tenantResponse = await fetch(`${supabaseUrl}/functions/v1/tenant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('Tenant Response Status:', tenantResponse.status);
    console.log('Tenant Response Headers:', Object.fromEntries(tenantResponse.headers));
    
    const tenantText = await tenantResponse.text();
    console.log('Tenant Response Body:', tenantText);
    
    try {
      const tenantJson = JSON.parse(tenantText);
      console.log('Tenant Response JSON:', JSON.stringify(tenantJson, null, 2));
    } catch (e) {
      console.log('Tenant response is not valid JSON');
    }
    
  } catch (error) {
    console.error('🚨 Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testWithFetch();
