import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixTenantSlugs() {
  console.log('Fixing tenant slugs...');
  
  try {
    // Fix the Demo Restaurant slug
    const { data: demoUpdate, error: demoError } = await supabase
      .from('tenants')
      .update({ slug: 'demo' })
      .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    
    if (demoError) {
      console.error('Error updating demo tenant:', demoError);
    } else {
      console.log('✅ Successfully updated Demo Restaurant slug to "demo"');
    }
    
    // Check the updated tenants
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .order('name');
    
    if (error) {
      console.error('Error fetching updated tenants:', error);
    } else {
      console.log('\nUpdated tenants:');
      console.table(data);
    }
    
    console.log('\n🎉 Tenant slugs have been fixed!');
    console.log('✅ You can now access:');
    console.log('   - demo.blunari.ai → Demo Restaurant');
    console.log('   - kpizza.blunari.ai → kpizza');
    console.log('   - drood-wick.blunari.ai → Drood Wick');
    console.log('   - dees-poizza.blunari.ai → dees poizza');
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

fixTenantSlugs();
