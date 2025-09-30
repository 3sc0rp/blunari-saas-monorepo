import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MVkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDashboardQuery() {
  console.log('Testing the exact same query as useAdvancedBookings...')
  
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  console.log('Using tenant ID:', tenantId)
  
  // Replicate the exact query from useAdvancedBookings (without source filter)
  console.log('Building query without source filter...')
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('tenant_id', tenantId)
  
  console.log('Executing query...')
  const { data, error } = await query.order('booking_time', { ascending: true })
  
  if (error) {
    console.error('Query failed:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
  } else {
    console.log('Query successful!')
    console.log('Found', data?.length || 0, 'bookings')
    if (data && data.length > 0) {
      console.log('Bookings:')
      data.forEach((booking, index) => {
        console.log(`${index + 1}.`, {
          id: booking.id,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          booking_time: booking.booking_time,
          status: booking.status,
          source: booking.source || 'NO SOURCE FIELD'
        })
      })
    }
  }
  
  // Also test the table lookup
  console.log('Testing table lookup...')
  const { data: tables, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('id,name')
    .eq('tenant_id', tenantId)
    
  if (tableError) {
    console.error('Table lookup failed:', tableError)
  } else {
    console.log('Table lookup successful, found', tables?.length || 0, 'tables')
  }
}

testDashboardQuery().catch(console.error)