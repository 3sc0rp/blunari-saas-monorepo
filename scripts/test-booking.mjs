import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTestBooking() {
  console.log('Creating test booking...')
  
  const now = new Date()
  const bookingDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
  
  const testBooking = {
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    guest_name: 'John Doe (Test Booking)',
    guest_email: 'john.doe@testbooking.com',
    guest_phone: '+1-555-0123',
    party_size: 4,
    booking_time: bookingDateTime.toISOString(),
    status: 'confirmed',
    special_requests: 'Test booking created to verify dashboard integration'
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(testBooking)
    .select()

  if (error) {
    console.error('Failed to create test booking:', error)
    
    // Try with minimal data in case there are column issues
    console.log('Trying minimal booking...')
    const minimalDateTime = new Date(now.getTime() + 3 * 60 * 60 * 1000) // 3 hours from now
    const minimalBooking = {
      tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      guest_name: 'Test User',
      guest_email: 'test@example.com',
      party_size: 2,
      booking_time: minimalDateTime.toISOString(),
      status: 'confirmed'
    }
    
    const { data: minData, error: minError } = await supabase
      .from('bookings')
      .insert(minimalBooking)
      .select()
      
    if (minError) {
      console.error('Minimal booking also failed:', minError)
    } else {
      console.log('Minimal booking created:', minData)
    }
  } else {
    console.log('Test booking created successfully:', data)
  }
  
  // Now test if we can read bookings
  console.log('Testing booking read access...')
  const { data: allBookings, error: readError } = await supabase
    .from('bookings')
    .select('*')
    .eq('tenant_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
    .limit(5)
    
  if (readError) {
    console.error('Cannot read bookings:', readError)
  } else {
    console.log(`Successfully read ${allBookings?.length || 0} bookings:`)
    if (allBookings && allBookings.length > 0) {
      console.log('Latest booking:', allBookings[0])
    }
  }
}

createTestBooking().catch(console.error)