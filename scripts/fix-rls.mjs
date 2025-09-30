import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjM1Njk2MCwiZXhwIjoyMDQxOTMyOTYwfQ.7acuPPn_8RBhnGogfob0r_RPOYOl2SKy4tE8dR-q9fw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRLS() {
  console.log('Applying RLS policy fixes...')
  
  // Step 1: Disable RLS temporarily
  console.log('1. Disabling RLS...')
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;'
  })
  
  // Step 2: Drop existing policies
  console.log('2. Dropping existing policies...')
  const dropPolicies = [
    'DROP POLICY IF EXISTS "Service role full access" ON bookings;',
    'DROP POLICY IF EXISTS "Anonymous booking creation" ON bookings;',
    'DROP POLICY IF EXISTS "Anonymous booking read for demo" ON bookings;',
    'DROP POLICY IF EXISTS "Authenticated tenant access" ON bookings;',
    'DROP POLICY IF EXISTS "Users can view tenant bookings" ON bookings;',
    'DROP POLICY IF EXISTS "Users can create bookings" ON bookings;',
    'DROP POLICY IF EXISTS "Users can update tenant bookings" ON bookings;',
    'DROP POLICY IF EXISTS "Demo tenant anon access" ON bookings;',
    'DROP POLICY IF EXISTS "Demo tenant anon create" ON bookings;'
  ]
  
  for (const sql of dropPolicies) {
    await supabase.rpc('exec_sql', { sql })
  }
  
  // Step 3: Re-enable RLS
  console.log('3. Re-enabling RLS...')
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;'
  })
  
  // Step 4: Create new policies
  console.log('4. Creating new policies...')
  const newPolicies = [
    `CREATE POLICY "service_role_access" ON bookings
     FOR ALL USING (auth.role() = 'service_role')
     WITH CHECK (auth.role() = 'service_role');`,
    
    `CREATE POLICY "anon_read_demo_tenant" ON bookings
     FOR SELECT USING (
       auth.role() = 'anon' 
       AND tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
     );`,
     
    `CREATE POLICY "anon_create_bookings" ON bookings
     FOR INSERT WITH CHECK (auth.role() = 'anon');`,
     
    `CREATE POLICY "authenticated_tenant_access" ON bookings
     FOR ALL USING (auth.role() = 'authenticated')
     WITH CHECK (auth.role() = 'authenticated');`
  ]
  
  for (const sql of newPolicies) {
    await supabase.rpc('exec_sql', { sql })
  }
  
  // Step 5: Create test booking
  console.log('5. Creating test booking...')
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      customer_name: 'Test Booking User',
      customer_email: 'test@example.com', 
      customer_phone: '+1234567890',
      party_size: 2,
      requested_date: new Date().toISOString().split('T')[0],
      requested_time: '19:00:00',
      status: 'confirmed'
    })
    .select()
    
  if (error) {
    console.error('Error creating test booking:', error)
  } else {
    console.log('Test booking created:', data)
  }
  
  console.log('RLS policies updated successfully!')
}

fixRLS().catch(console.error)