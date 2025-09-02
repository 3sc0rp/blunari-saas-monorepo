import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function forceFix() {
  console.log('Force-fixing tenant slug issues...');
  
  try {
    // First, let's see if 'demo' slug is already taken by another tenant
    const { data: existing, error: checkError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'demo');
    
    if (checkError) {
      console.error('Error checking for existing demo slug:', checkError);
      return;
    }
    
    console.log('Tenants with "demo" slug:', existing);
    
    // If there's already a 'demo' slug, we need to handle it differently
    if (existing && existing.length > 0) {
      console.log('Found existing tenant(s) with "demo" slug. Removing duplicates...');
      
      // Keep only the first one and update others
      for (let i = 1; i < existing.length; i++) {
        const tenant = existing[i];
        const newSlug = `demo-${i}`;
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ slug: newSlug })
          .eq('id', tenant.id);
          
        if (updateError) {
          console.error(`Error updating tenant ${tenant.id}:`, updateError);
        } else {
          console.log(`✅ Updated ${tenant.name} to slug: ${newSlug}`);
        }
      }
    }
    
    // Now update the Demo Restaurant to use 'demo' slug
    const { data: updateResult, error: updateError } = await supabase
      .from('tenants')
      .update({ slug: 'demo' })
      .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .select();
    
    if (updateError) {
      console.error('Error updating Demo Restaurant:', updateError);
      
      // If it fails, try with a temporary slug first
      console.log('Trying with temporary slug approach...');
      
      // Step 1: Update to temp slug
      await supabase
        .from('tenants')
        .update({ slug: 'demo-temp-' + Date.now() })
        .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
      
      // Step 2: Update to final slug
      const { error: finalError } = await supabase
        .from('tenants')
        .update({ slug: 'demo' })
        .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
        
      if (finalError) {
        console.error('Final update also failed:', finalError);
      } else {
        console.log('✅ Successfully updated with temporary slug approach');
      }
    } else {
      console.log('✅ Successfully updated Demo Restaurant to "demo"');
    }
    
    // Check final result
    const { data: finalData, error: finalError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .order('name');
    
    if (finalError) {
      console.error('Error fetching final results:', finalError);
    } else {
      console.log('\nFinal tenant list:');
      console.table(finalData);
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

forceFix();
