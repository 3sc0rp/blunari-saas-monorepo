import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTenants() {
  console.log('Checking current tenants in database...');
  
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, status')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tenants:', error);
      return;
    }
    
    console.log('\nCurrent tenants:');
    console.table(data);
    
    // Check specifically for demo-related tenants
    const demoTenants = data.filter(t => 
      t.slug.includes('demo') || 
      t.name.toLowerCase().includes('demo')
    );
    
    if (demoTenants.length > 0) {
      console.log('\nDemo-related tenants:');
      console.table(demoTenants);
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

checkTenants();
