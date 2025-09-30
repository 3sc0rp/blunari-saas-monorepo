#!/usr/bin/env node

// Check the actual schema of the bookings table

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function checkBookingsSchema() {
  try {
    console.log('🔍 Checking bookings table schema...\n');

    // Get a sample booking to see what columns exist
    const sampleRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Sample query status: ${sampleRes.status}`);

    if (sampleRes.ok) {
      const sample = await sampleRes.json();
      if (sample.length > 0) {
        console.log('✅ Available columns in bookings table:');
        const columns = Object.keys(sample[0]).sort();
        columns.forEach((col, index) => {
          console.log(`${index + 1}. ${col}: ${typeof sample[0][col]} = ${sample[0][col]}`);
        });
        
        console.log('\n📋 Sample booking record:');
        console.log(JSON.stringify(sample[0], null, 2));
      } else {
        console.log('📭 No bookings found in table');
      }
    } else {
      const error = await sampleRes.text();
      console.log(`❌ Failed to query bookings table: ${error}`);
    }

    // Also try to get recent bookings without the problematic confirmation_number column
    console.log('\n🔍 Testing simplified query without confirmation_number...');
    
    const simpleRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id,status,booking_time,guest_email,created_at&limit=3&order=created_at.desc`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Simple query status: ${simpleRes.status}`);
    
    if (simpleRes.ok) {
      const simple = await simpleRes.json();
      console.log(`✅ Found ${simple.length} bookings with simplified query`);
      if (simple.length > 0) {
        console.log('Most recent:', simple[0]);
      }
    } else {
      const simpleError = await simpleRes.text();
      console.log(`❌ Simple query failed: ${simpleError}`);
    }

  } catch (error) {
    console.error('💥 Schema check failed:', error.message);
  }
}

checkBookingsSchema();