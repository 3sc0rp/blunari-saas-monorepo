import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function executeSQL() {
  console.log('Executing SQL to fix tenant slugs...');
  
  try {
    // Execute raw SQL to fix the slug
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE public.tenants 
        SET slug = 'demo' 
        WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid;
      `
    });
    
    if (error) {
      console.error('SQL execution error:', error);
      
      // Try direct update with different approach
      console.log('Trying direct update approach...');
      
      const { data: directUpdate, error: directError } = await supabase
        .from('tenants')
        .upsert({
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          name: 'Demo Restaurant',
          slug: 'demo',
          status: 'active'
        }, {
          onConflict: 'id'
        });
        
      if (directError) {
        console.error('Direct update error:', directError);
      } else {
        console.log('✅ Direct update successful');
      }
    } else {
      console.log('✅ SQL execution successful');
    }
    
    // Verify the change
    const { data: verification, error: verifyError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .single();
    
    if (verifyError) {
      console.error('Verification error:', verifyError);
    } else {
      console.log('Verification result:', verification);
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

executeSQL();
