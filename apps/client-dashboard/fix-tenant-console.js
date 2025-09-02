/**
 * Browser Console Debug Script for Tenant Issues
 * Copy and paste this into the browser console at http://localhost:8080
 */

async function fixTenantIssues() {
  console.log('🔧 Fixing tenant lookup issues...');
  
  // Get the supabase client from the app
  const { supabase } = await import('./src/integrations/supabase/client.js');
  
  try {
    // 1. Check current tenants
    console.log('\n1️⃣ Checking existing tenants...');
    const { data: existing, error: existingError } = await supabase
      .from('tenants')
      .select('id, name, slug, status');
    
    if (existingError) {
      console.error('❌ Failed to fetch tenants:', existingError);
      return;
    }
    
    console.log('✅ Existing tenants:', existing);
    
    // 2. Update the demo tenant slug if needed
    console.log('\n2️⃣ Ensuring demo tenant has correct slug...');
    const { data: updated, error: updateError } = await supabase
      .from('tenants')
      .update({ slug: 'demo' })
      .eq('name', 'Demo Restaurant')
      .select();
    
    if (updateError) {
      console.error('❌ Failed to update demo tenant:', updateError);
    } else {
      console.log('✅ Updated demo tenant:', updated);
    }
    
    // 3. Create kpizza tenant if not exists
    console.log('\n3️⃣ Creating kpizza tenant...');
    const kpizzaTenant = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'K Pizza Restaurant',
      slug: 'kpizza',
      status: 'active',
      timezone: 'America/New_York',
      currency: 'USD',
      description: 'K Pizza - Premium pizza restaurant',
      email: 'hello@kpizza.com',
      primary_color: '#dc2626',
      secondary_color: '#fbbf24'
    };
    
    const { data: kpizza, error: kpizzaError } = await supabase
      .from('tenants')
      .upsert(kpizzaTenant, { onConflict: 'id' })
      .select();
    
    if (kpizzaError) {
      console.error('❌ Failed to create kpizza tenant:', kpizzaError);
    } else {
      console.log('✅ Created kpizza tenant:', kpizza);
    }
    
    // 4. Test tenant lookup
    console.log('\n4️⃣ Testing tenant lookups...');
    const testSlugs = ['demo', 'kpizza'];
    
    for (const slug of testSlugs) {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, status')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) {
        console.error(`❌ Lookup failed for ${slug}:`, error);
      } else if (data) {
        console.log(`✅ Found tenant: ${data.name} (${data.slug})`);
      } else {
        console.log(`⚠️ No tenant found for slug: ${slug}`);
      }
    }
    
    // 5. Check if the issue is with the hook
    console.log('\n5️⃣ Testing the tenant hook directly...');
    const { getTenantBySlug } = await import('./src/lib/api-helpers.js');
    
    const { data: hookResult, error: hookError } = await getTenantBySlug('demo');
    if (hookError) {
      console.error('❌ Hook failed:', hookError);
    } else {
      console.log('✅ Hook result:', hookResult);
    }
    
    console.log('\n🎉 Debug complete! Try refreshing the page.');
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

// Auto-run the fix
fixTenantIssues();

// Also make it available globally for manual execution
window.fixTenantIssues = fixTenantIssues;

console.log(`
🧪 Tenant Debug Script Loaded!

The script is running automatically, but you can also run:
  fixTenantIssues()

If it works, try these URLs:
  - http://localhost:8080/demo
  - http://localhost:8080/kpizza
`);
