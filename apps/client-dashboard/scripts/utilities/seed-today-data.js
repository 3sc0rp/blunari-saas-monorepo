import { createClient } from '@supabase/supabase-js';

// Use environment variables from .env file
const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function seedTodayData() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    
    console.log('Adding sample bookings for today:', tenantId);

    // Get table IDs for bookings
    const { data: allTables } = await supabase
      .from('restaurant_tables')
      .select('id, name')
      .eq('tenant_id', tenantId);

    if (!allTables || allTables.length === 0) {
      console.log('No tables found, creating sample tables first...');
      
      // Create sample tables
      const tables = [
        { 
          tenant_id: tenantId, 
          name: 'Table 1', 
          capacity: 4, 
          section: 'Main Dining', 
          status: 'AVAILABLE',
          active: true,
          position_x: 100,
          position_y: 100,
          table_type: 'standard'
        },
        { 
          tenant_id: tenantId, 
          name: 'Table 2', 
          capacity: 2, 
          section: 'Main Dining', 
          status: 'AVAILABLE',
          active: true,
          position_x: 200,
          position_y: 100,
          table_type: 'standard'
        },
        { 
          tenant_id: tenantId, 
          name: 'Table 3', 
          capacity: 6, 
          section: 'Main Dining', 
          status: 'AVAILABLE',
          active: true,
          position_x: 300,
          position_y: 100,
          table_type: 'standard'
        },
        { 
          tenant_id: tenantId, 
          name: 'Table 4', 
          capacity: 8, 
          section: 'Main Dining', 
          status: 'AVAILABLE',
          active: true,
          position_x: 100,
          position_y: 200,
          table_type: 'large'
        }
      ];

      const { data: tablesResult, error: tablesError } = await supabase
        .from('restaurant_tables')
        .insert(tables)
        .select();

      if (tablesError) {
        console.error('Error inserting tables:', tablesError);
        return;
      }
      
      console.log('Created tables:', tablesResult.length);
      allTables.push(...tablesResult);
    }

    console.log('Found tables:', allTables.length);

    // Delete ALL existing bookings for this tenant to reset
    await supabase
      .from('bookings')
      .delete()
      .eq('tenant_id', tenantId);

    console.log('Cleared all existing bookings for tenant');

    // Create realistic bookings for today with no overlaps
    const now = new Date();
    const bookings = [
      {
        tenant_id: tenantId,
        table_id: allTables[0].id,
        guest_name: 'John Smith',
        guest_email: 'john@example.com',
        guest_phone: '+1234567890',
        booking_time: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        party_size: 4,
        status: 'confirmed',
        duration_minutes: 90,
        special_requests: 'Window seat preferred'
      },
      {
        tenant_id: tenantId,
        table_id: allTables[1].id,
        guest_name: 'Sarah Johnson',
        guest_email: 'sarah@example.com',
        guest_phone: '+1234567891',
        booking_time: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
        party_size: 2,
        status: 'confirmed',
        duration_minutes: 60
      },
      {
        tenant_id: tenantId,
        table_id: allTables[2].id,
        guest_name: 'Mike Wilson',
        guest_email: 'mike@example.com',
        guest_phone: '+1234567892',
        booking_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago (currently seated)
        party_size: 6,
        status: 'seated',
        duration_minutes: 90
      },
      {
        tenant_id: tenantId,
        table_id: allTables[3].id,
        guest_name: 'Emily Davis',
        guest_email: 'emily@example.com',
        guest_phone: '+1234567893',
        booking_time: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
        party_size: 8,
        status: 'confirmed',
        duration_minutes: 120,
        special_requests: 'Birthday celebration - cake required'
      },
      {
        tenant_id: tenantId,
        table_id: allTables[0].id,
        guest_name: 'Robert Brown',
        guest_email: 'robert@example.com',
        guest_phone: '+1234567894',
        booking_time: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now (no overlap)
        party_size: 3,
        status: 'confirmed',
        duration_minutes: 75
      },
      {
        tenant_id: tenantId,
        table_id: allTables[1].id,
        guest_name: 'Lisa Chen',
        guest_email: 'lisa@example.com',
        guest_phone: '+1234567895',
        booking_time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago (completed)
        party_size: 2,
        status: 'completed',
        duration_minutes: 60
      },
      {
        tenant_id: tenantId,
        table_id: allTables[2].id,
        guest_name: 'Alex Turner',
        guest_email: 'alex@example.com',
        guest_phone: '+1234567896',
        booking_time: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours from now
        party_size: 4,
        status: 'confirmed',
        duration_minutes: 90
      },
      {
        tenant_id: tenantId,
        table_id: allTables[1].id,
        guest_name: 'Maria Garcia',
        guest_email: 'maria@example.com',
        guest_phone: '+1234567897',
        booking_time: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now (no overlap)
        party_size: 2,
        status: 'confirmed',
        duration_minutes: 60
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

    console.log('✅ Created', bookingsResult.length, 'sample bookings for today!');
    
    // Print summary
    console.log('\n📊 Booking Summary:');
    bookingsResult.forEach(booking => {
      const time = new Date(booking.booking_time).toLocaleTimeString();
      console.log(`  ${booking.guest_name} - ${booking.party_size} guests at ${time} (${booking.status})`);
    });

  } catch (error) {
    console.error('Seed error:', error);
  }
}

seedTodayData();