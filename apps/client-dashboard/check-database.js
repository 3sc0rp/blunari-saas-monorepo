// Simple database check script
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tjabxixonpjpuecvadns.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYWJ4aXhvbnBqcHVlY3ZhZG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ4NTU1MjIsImV4cCI6MjA0MDQzMTUyMn0.RGk5gqFLXXi-k4HjT6nPi5vvfY1jqRAyI7sZ8Qyy5QI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database connection and data...\n');

  try {
    // Check if demo tenant exists
    console.log('1. Checking demo tenant...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo')
      .single();

    if (tenantError) {
      console.log('❌ Demo tenant not found:', tenantError.message);
      return;
    } else {
      console.log('✅ Demo tenant found:', tenant.name, `(ID: ${tenant.id})`);
    }

    // Check tables
    console.log('\n2. Checking restaurant tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('tenant_id', tenant.id);

    if (tablesError) {
      console.log('❌ Tables query failed:', tablesError.message);
    } else {
      console.log(`✅ Found ${tables?.length || 0} restaurant tables`);
      if (tables && tables.length > 0) {
        tables.forEach(table => {
          console.log(`   - ${table.name}: ${table.capacity} seats (${table.table_type})`);
        });
      }
    }

    // Check bookings
    console.log('\n3. Checking bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenant.id);

    if (bookingsError) {
      console.log('❌ Bookings query failed:', bookingsError.message);
    } else {
      console.log(`✅ Found ${bookings?.length || 0} bookings`);
      if (bookings && bookings.length > 0) {
        bookings.forEach(booking => {
          const time = new Date(booking.booking_time).toLocaleTimeString();
          console.log(`   - ${booking.guest_name}: ${booking.party_size} people at ${time} (${booking.status})`);
        });
      }
    }

    // Test RLS function
    console.log('\n4. Testing RLS function...');
    try {
      const { data: rls, error: rlsError } = await supabase.rpc('get_current_user_tenant_id');
      if (rlsError) {
        console.log('❌ RLS function failed:', rlsError.message);
      } else {
        console.log('✅ RLS function works. Current tenant ID:', rls || 'null (unauthenticated)');
      }
    } catch (error) {
      console.log('❌ RLS function not found:', error.message);
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

// If we need to create demo data
async function createDemoData() {
  console.log('\n🌱 Creating demo data...');

  try {
    // First create demo tenant if not exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'demo')
      .single();

    let tenant = existingTenant;

    if (!tenant) {
      console.log('Creating demo tenant...');
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert([{
          name: 'Demo Restaurant',
          slug: 'demo',
          active: true,
          settings: { theme: 'restaurant' }
        }])
        .select()
        .single();

      if (error) {
        console.error('Failed to create tenant:', error);
        return;
      }
      tenant = newTenant;
      console.log('✅ Demo tenant created');
    }

    // Create tables
    const sampleTables = [
      { name: 'Table 1', capacity: 4, table_type: 'standard', active: true, tenant_id: tenant.id },
      { name: 'Table 2', capacity: 2, table_type: 'small', active: true, tenant_id: tenant.id },
      { name: 'Table 3', capacity: 6, table_type: 'large', active: true, tenant_id: tenant.id },
    ];

    const { error: tableError } = await supabase
      .from('restaurant_tables')
      .upsert(sampleTables, { onConflict: 'tenant_id,name' });

    if (tableError) {
      console.error('Failed to create tables:', tableError);
    } else {
      console.log('✅ Sample tables created');
    }

    // Create bookings for today
    const now = new Date();
    const sampleBookings = [
      {
        tenant_id: tenant.id,
        guest_name: 'John Smith',
        guest_email: 'john@demo.com',
        booking_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        party_size: 4,
        status: 'confirmed',
        duration_minutes: 90,
        deposit_required: false,
        deposit_paid: false
      },
      {
        tenant_id: tenant.id,
        guest_name: 'Sarah Johnson',
        guest_email: 'sarah@demo.com',
        booking_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        party_size: 2,
        status: 'confirmed',
        duration_minutes: 60,
        deposit_required: false,
        deposit_paid: false
      }
    ];

    const { error: bookingError } = await supabase
      .from('bookings')
      .insert(sampleBookings);

    if (bookingError) {
      console.error('Failed to create bookings:', bookingError);
    } else {
      console.log('✅ Sample bookings created');
    }

  } catch (error) {
    console.error('❌ Demo data creation failed:', error);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--create-demo')) {
  createDemoData().then(() => checkDatabase());
} else {
  checkDatabase();
}
