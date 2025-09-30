#!/usr/bin/env node

// Test the exact same API call that tokenUtils.ts makes

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testExactTokenCall() {
  try {
    console.log('🔄 Making EXACT same API call as tokenUtils.ts...\n');
    
    // This is the exact call from tokenUtils.ts line 37-43
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ 
        slug: 'demo', 
        widget_type: 'booking', 
        config_version: '2.0', 
        ttl_seconds: 3600 
      })
    });

    console.log(`📡 Response status: ${res.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(res.headers.entries()));
    
    const responseText = await res.text();
    console.log(`📜 Raw response: ${responseText}`);

    if (res.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Success! Token data:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data?.token) {
          console.log('\n🎫 Token extracted successfully!');
          console.log(`Token length: ${data.token.length}`);
          console.log(`Token starts with: ${data.token.substring(0, 20)}...`);
        }
      } catch (parseError) {
        console.log('\n⚠️  Response OK but not valid JSON:', parseError.message);
      }
    } else {
      console.log(`\n❌ Request failed with status ${res.status}`);
      console.log(`Error response: ${responseText}`);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('\n🔍 Parsed error details:');
        console.log(JSON.stringify(errorData, null, 2));
      } catch {
        console.log('Raw error text:', responseText);
      }
    }
    
  } catch (error) {
    console.error('💥 Request failed completely:', error.message);
  }
}

testExactTokenCall();