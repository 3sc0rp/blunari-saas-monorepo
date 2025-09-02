// Create sample tenant data for debugging
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleTenant() {
  console.log('🌱 Creating sample tenant for debugging...');
  
  try {
    // Check if tenant already exists
    const { data: existing } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo-restaurant')
      .single();
    
    if (existing) {
      console.log('✅ Demo tenant already exists:', existing);
      return existing;
    }
    
    // Create new tenant
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name: 'Demo Restaurant',
        slug: 'demo-restaurant',
        status: 'active',
        timezone: 'America/New_York',
        currency: 'USD',
        description: 'Demo restaurant for testing',
        phone: '+1-555-0123',
        email: 'demo@restaurant.com',
        website: 'https://demo.restaurant.com',
        address: {
          street: '123 Main Street',
          city: 'Demo City',
          state: 'NY',
          country: 'United States',
          postal_code: '12345'
        },
        primary_color: '#3b82f6',
        secondary_color: '#1e40af'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create tenant:', error);
      return null;
    }
    
    console.log('✅ Created demo tenant:', data);
    return data;
    
  } catch (error) {
    console.error('💥 Error:', error);
    return null;
  }
}

async function testTenantLookup() {
  console.log('🔍 Testing tenant lookup...');
  
  try {
    // Test getting all tenants
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug, status');
      
    if (error) {
      console.error('❌ Tenant lookup failed:', error);
    } else {
      console.log('✅ Found tenants:', tenants);
    }
    
    // Test auth status
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔐 Auth status:', user ? `Authenticated as ${user.email}` : 'Anonymous');
    
  } catch (error) {
    console.error('💥 Lookup error:', error);
  }
}

// Run both functions
async function main() {
  await createSampleTenant();
  await testTenantLookup();
}

main();
