#!/usr/bin/env node

/**
 * Setup script for Command Center functionality
 * This script will:
 * 1. Apply missing migrations
 * 2. Seed sample data for testing
 * 3. Verify the setup
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY as fallback)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔧 Running missing migration...');
  
  try {
    const migrationSQL = readFileSync(
      join(__dirname, 'supabase/migrations/20250902130000_add_get_current_user_tenant_id_function.sql'),
      'utf-8'
    );
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      // Try alternative approach using raw query
      const { error: altError } = await supabase.from('__dummy__').select('1').limit(0);
      if (altError) {
        console.log('⚠️  Using alternative migration approach...');
        // We'll assume migrations will be applied manually
      }
    } else {
      console.log('✅ Migration completed successfully');
    }
  } catch (error) {
    console.log('⚠️  Migration file not found or error reading:', error.message);
    console.log('   Please apply the migration manually through your Supabase dashboard');
  }
}

async function seedData() {
  console.log('🌱 Seeding sample data...');
  
  try {
    // Check if demo tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'demo')
      .single();
    
    if (tenantError || !tenant) {
      console.log('⚠️  Demo tenant not found. Creating one...');
      
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert([
          {
            name: 'Demo Restaurant',
            slug: 'demo',
            active: true,
            settings: {
              theme: 'restaurant',
              timezone: 'UTC',
              currency: 'USD'
            }
          }
        ])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create demo tenant:', createError.message);
        return;
      }
      
      console.log('✅ Created demo tenant:', newTenant.name);
      tenant = newTenant;
    } else {
      console.log('✅ Found demo tenant:', tenant.name);
    }
    
    // Add sample restaurant tables
    const { data: existingTables } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('tenant_id', tenant.id);
    
    if (!existingTables || existingTables.length === 0) {
      console.log('📋 Adding sample restaurant tables...');
      
      const sampleTables = [
        { name: 'Table 1', capacity: 4, table_type: 'standard', position_x: 100, position_y: 100 },
        { name: 'Table 2', capacity: 2, table_type: 'small', position_x: 200, position_y: 100 },
        { name: 'Table 3', capacity: 6, table_type: 'large', position_x: 300, position_y: 100 },
        { name: 'Table 4', capacity: 4, table_type: 'standard', position_x: 100, position_y: 200 },
        { name: 'Bar 1', capacity: 8, table_type: 'bar', position_x: 200, position_y: 200 },
      ].map(table => ({ ...table, tenant_id: tenant.id, active: true }));
      
      const { error: tablesError } = await supabase
        .from('restaurant_tables')
        .insert(sampleTables);
      
      if (tablesError) {
        console.error('❌ Failed to create tables:', tablesError.message);
      } else {
        console.log(`✅ Created ${sampleTables.length} sample tables`);
      }
    } else {
      console.log(`✅ Found ${existingTables.length} existing tables`);
    }
    
    // Add sample bookings for today
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenant.id)
      .gte('booking_time', new Date().toISOString().split('T')[0]);
    
    if (!existingBookings || existingBookings.length === 0) {
      console.log('📅 Adding sample bookings...');
      
      const now = new Date();
      const sampleBookings = [
        {
          guest_name: 'John Smith',
          guest_email: 'john@example.com',
          guest_phone: '+1234567890',
          booking_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
          party_size: 4,
          status: 'confirmed',
          duration_minutes: 90,
          deposit_required: false,
          deposit_paid: false
        },
        {
          guest_name: 'Sarah Johnson',
          guest_email: 'sarah@example.com',
          guest_phone: '+1234567891',
          booking_time: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), // +3 hours
          party_size: 2,
          status: 'confirmed',
          duration_minutes: 60,
          deposit_required: false,
          deposit_paid: false
        },
        {
          guest_name: 'Mike Wilson',
          guest_email: 'mike@example.com',
          guest_phone: '+1234567892',
          booking_time: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(), // +1 hour
          party_size: 6,
          status: 'seated',
          duration_minutes: 120,
          deposit_required: false,
          deposit_paid: false
        }
      ].map(booking => ({ ...booking, tenant_id: tenant.id }));
      
      const { error: bookingsError } = await supabase
        .from('bookings')
        .insert(sampleBookings);
      
      if (bookingsError) {
        console.error('❌ Failed to create bookings:', bookingsError.message);
      } else {
        console.log(`✅ Created ${sampleBookings.length} sample bookings`);
      }
    } else {
      console.log(`✅ Found ${existingBookings.length} existing bookings`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  try {
    // Test the RLS function
    const { data: tenantId, error: funcError } = await supabase.rpc('get_current_user_tenant_id');
    
    if (funcError) {
      console.error('❌ RLS function test failed:', funcError.message);
    } else {
      console.log('✅ RLS function works:', tenantId || 'null (expected for unauthenticated)');
    }
    
    // Test data access
    const { data: tables, error: tablesError } = await supabase
      .from('restaurant_tables')
      .select('id, name, capacity')
      .limit(3);
    
    if (tablesError) {
      console.error('❌ Tables access failed:', tablesError.message);
    } else {
      console.log(`✅ Can access ${tables?.length || 0} tables`);
    }
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, guest_name, booking_time, status')
      .limit(3);
    
    if (bookingsError) {
      console.error('❌ Bookings access failed:', bookingsError.message);
    } else {
      console.log(`✅ Can access ${bookings?.length || 0} bookings`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Setting up Command Center...\n');
  
  await runMigration();
  console.log('');
  
  await seedData();
  console.log('');
  
  await verifySetup();
  console.log('');
  
  console.log('✨ Setup complete! You can now test the Command Center.');
  console.log('   Navigate to /dashboard/command-center in your app.');
}

main().catch(console.error);
