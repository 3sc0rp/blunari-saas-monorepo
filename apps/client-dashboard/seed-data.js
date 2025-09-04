import { createClient } from '@supabase/supabase-js';

// Use environment variables from .env file
const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
// Note: This is a test with the anon key since we don't have the service key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function seedData() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Get demo tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'demo')
      .eq('status', 'active')
      .single();

    if (tenantError || !tenant) {
      console.error('Demo tenant not found:', tenantError);
      return;
    }

    console.log('Found demo tenant:', tenant.id);

    // Check if tables already exist
    const { data: existingTables } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('tenant_id', tenant.id)
      .limit(1);

    if (existingTables && existingTables.length > 0) {
      console.log('Tables already exist for demo tenant');
    } else {
      // Insert restaurant tables
      const tables = [
        { tenant_id: tenant.id, name: 'Table 1', capacity: 4, seats: 4, section: 'Main', status: 'AVAILABLE' },
        { tenant_id: tenant.id, name: 'Table 2', capacity: 2, seats: 2, section: 'Main', status: 'AVAILABLE' },
        { tenant_id: tenant.id, name: 'Table 3', capacity: 6, seats: 6, section: 'Main', status: 'AVAILABLE' },
        { tenant_id: tenant.id, name: 'Table 4', capacity: 4, seats: 4, section: 'Bar', status: 'AVAILABLE' },
        { tenant_id: tenant.id, name: 'Table 5', capacity: 2, seats: 2, section: 'Bar', status: 'AVAILABLE' },
        { tenant_id: tenant.id, name: 'Patio 1', capacity: 8, seats: 8, section: 'Patio', status: 'AVAILABLE' }
      ];

      const { data: tablesResult, error: tablesError } = await supabase
        .from('restaurant_tables')
        .insert(tables)
        .select();

      if (tablesError) {
        console.error('Error inserting tables:', tablesError);
        return;
      }

      console.log('Inserted tables:', tablesResult.length);
    }

    // Check if bookings already exist for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenant.id)
      .gte('booking_time', today.toISOString())
      .lt('booking_time', tomorrow.toISOString())
      .limit(1);

    if (existingBookings && existingBookings.length > 0) {
      console.log('Bookings already exist for today');
    } else {
      // Get table IDs for bookings
      const { data: allTables } = await supabase
        .from('restaurant_tables')
        .select('id, name')
        .eq('tenant_id', tenant.id);

      if (allTables && allTables.length > 0) {
        const now = new Date();
        const bookings = [
          {
            tenant_id: tenant.id,
            table_id: allTables[0].id,
            guest_name: 'John Smith',
            guest_email: 'john@example.com',
            guest_phone: '+1234567890',
            booking_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
            party_size: 4,
            status: 'confirmed',
            duration_minutes: 90
          },
          {
            tenant_id: tenant.id,
            table_id: allTables[1].id,
            guest_name: 'Sarah Johnson',
            guest_email: 'sarah@example.com',
            guest_phone: '+1234567891',
            booking_time: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
            party_size: 2,
            status: 'confirmed',
            duration_minutes: 60
          },
          {
            tenant_id: tenant.id,
            table_id: allTables[2].id,
            guest_name: 'Mike Wilson',
            guest_email: 'mike@example.com',
            guest_phone: '+1234567892',
            booking_time: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
            party_size: 6,
            status: 'seated',
            duration_minutes: 120
          }
        ];

        const { data: bookingsResult, error: bookingsError } = await supabase
          .from('bookings')
          .insert(bookings)
          .select();

        if (bookingsError) {
          console.error('Error inserting bookings:', bookingsError);
          return;
        }

        console.log('Inserted bookings:', bookingsResult.length);
      }
    }

    console.log('✅ Seed data complete!');

  } catch (error) {
    console.error('Seed error:', error);
  }
}

seedData();
