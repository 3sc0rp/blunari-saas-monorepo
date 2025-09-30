#!/usr/bin/env node

// Direct SQL execution to fix booking status constraint
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function fixBookingStatus() {
  console.log('🔧 Attempting to fix booking status constraint...\n');
  
  // SQL to fix booking status
  const fixSQL = `
    -- Step 1: Check current constraint
    SELECT constraint_name, check_clause 
    FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%booking%status%';
  `;
  
  const dropConstraintSQL = `
    -- Step 2: Drop the existing check constraint
    ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  `;
  
  const addConstraintSQL = `
    -- Step 3: Add new constraint with pending support
    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'));
  `;
  
  const updateDefaultSQL = `
    -- Step 4: Set default to pending
    ALTER TABLE public.bookings 
    ALTER COLUMN status SET DEFAULT 'pending';
  `;
  
  try {
    // Try using the RPC function approach
    console.log('📋 Step 1: Checking current constraint...');
    
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        sql: fixSQL
      })
    });
    
    if (checkResponse.ok) {
      const result = await checkResponse.json();
      console.log('Current constraints:', result);
    } else {
      console.log('Could not check constraints via RPC');
    }
    
    // Try direct SQL execution via Edge Function
    console.log('\n🔧 Step 2: Attempting to fix via Edge Function...');
    
    const fixResponse = await fetch(`${SUPABASE_URL}/functions/v1/run-diagnostics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'fix-booking-status',
        sql: [dropConstraintSQL, addConstraintSQL, updateDefaultSQL].join('\n')
      })
    });
    
    if (fixResponse.ok) {
      const result = await fixResponse.json();
      console.log('✅ Fix applied:', result);
    } else {
      console.log('❌ Could not apply fix via edge function');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    console.log('\n📋 Manual Steps Required:');
    console.log('Please run these SQL commands manually in Supabase SQL Editor:');
    console.log('\n1. Drop existing constraint:');
    console.log(dropConstraintSQL);
    console.log('\n2. Add new constraint:');
    console.log(addConstraintSQL);
    console.log('\n3. Update default:');
    console.log(updateDefaultSQL);
    console.log('\n4. Test widget booking again');
  }
}

fixBookingStatus();