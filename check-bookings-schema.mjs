#!/usr/bin/env node
/**
 * Check bookings table schema and RLS policies
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, 'apps/client-dashboard/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Checking Bookings Table Schema\n');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Try to insert a test booking (will fail due to RLS, but we'll see the schema error)
const testBooking = {
  tenant_id: 'e26b8b83-f7e1-47b9-9dbd-a527cf3f0107', // mpizza tenant
  booking_time: new Date().toISOString(),
  party_size: 2,
  guest_name: 'Test Guest',
  guest_email: 'test@example.com',
  status: 'pending',
  duration_minutes: 120
};

console.log('Attempting test insert to check schema...\n');

fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(testBooking)
})
.then(async response => {
  const text = await response.text();
  
  if (!response.ok) {
    console.log('Response status:', response.status);
    console.log('Response body:', text);
    console.log('');
    
    try {
      const error = JSON.parse(text);
      
      if (error.message?.includes('permission denied') || error.code === '42501') {
        console.log('✅ Schema appears OK - RLS is blocking (expected)');
        console.log('');
        console.log('📋 To fix, the edge function needs to use SERVICE_ROLE_KEY');
        console.log('   (which it should already be doing)');
        console.log('');
        console.log('🔍 Check edge function logs for the actual database error');
      } else if (error.message?.includes('column') || error.code === '42703') {
        console.log('❌ Schema mismatch detected!');
        console.log('Error:', error.message);
        console.log('');
        console.log('The bookings table is missing expected columns.');
      } else {
        console.log('ℹ️  Database error:', error.message);
        console.log('Code:', error.code);
      }
    } catch (e) {
      console.log('Could not parse error response');
    }
  } else {
    console.log('✅ Booking inserted successfully (unexpected with anon key!)');
    console.log('Response:', text);
  }
})
.catch(error => {
  console.error('❌ Network error:', error.message);
});
