#!/usr/bin/env node

// Test with correct format and check if demo tenant exists

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testCorrectFormat() {
  try {
    console.log('🎯 Testing Widget Booking with Correct Format\n');
    
    // Step 1: Check if demo tenant exists
    console.log('🔍 Step 1: Checking if "demo" tenant exists...');
    const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=id,slug,name,status&slug=eq.demo`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (tenantRes.ok) {
      const tenants = await tenantRes.json();
      console.log(`📋 Found ${tenants.length} tenant(s) with slug "demo":`);
      if (tenants.length > 0) {
        console.log(JSON.stringify(tenants[0], null, 2));
      } else {
        console.log('❌ No tenant found with slug "demo"');
        console.log('\n🔍 Let me check what tenants exist...');
        
        const allTenantsRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=id,slug,name,status&limit=5`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (allTenantsRes.ok) {
          const allTenants = await allTenantsRes.json();
          console.log(`📋 Found ${allTenants.length} tenant(s) total:`);
          allTenants.forEach((t, i) => {
            console.log(`${i + 1}. ${t.slug} (${t.name}) - ${t.status || 'no status'}`);
          });
        } else {
          console.log(`❌ Failed to fetch tenants: ${allTenantsRes.status}`);
        }
      }
    } else {
      console.log(`❌ Failed to check tenants: ${tenantRes.status}`);
    }
    
    // Step 2: Create token anyway and test
    console.log('\n📝 Step 2: Creating widget token...');
    const tokenRes = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
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

    if (!tokenRes.ok) {
      throw new Error(`Token creation failed: ${tokenRes.status} ${await tokenRes.text()}`);
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token;
    console.log(`✅ Token created: ${token.substring(0, 30)}...`);
    
    // Step 3: Try hold with correct slot format
    console.log('\n🏠 Step 3: Creating hold with correct format...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0); // 7 PM tomorrow
    
    const holdData = {
      action: "hold",
      token: token,
      party_size: 4,
      slot: {
        time: tomorrow.toISOString()  // Correct format: slot.time instead of just slot
      },
      timestamp: new Date().toISOString()
    };

    console.log('Hold request data:', JSON.stringify(holdData, null, 2));

    const holdRes = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'x-correlation-id': crypto.randomUUID()
      },
      body: JSON.stringify(holdData)
    });

    console.log(`📊 Hold response status: ${holdRes.status}`);
    const holdResponseText = await holdRes.text();
    console.log(`📜 Hold response: ${holdResponseText}`);

    if (holdRes.ok) {
      console.log('\n🎉 HOLD CREATION SUCCESS!');
      const holdResult = JSON.parse(holdResponseText);
      console.log('Hold result:', JSON.stringify(holdResult, null, 2));
    } else {
      console.log('\n❌ Hold creation failed');
      try {
        const errorData = JSON.parse(holdResponseText);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch {
        console.log('Raw error:', holdResponseText);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testCorrectFormat();