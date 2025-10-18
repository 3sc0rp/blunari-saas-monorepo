/**
 * Preview script to show what test bookings would be deleted
 * Run this first to review before running the actual cleanup
 */

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

// Test data patterns to identify test bookings
const TEST_PATTERNS = [
  // Test names
  /test/i,
  /testing/i,
  /demo/i,
  /sample/i,
  /example/i,
  /john.*test/i,
  /test.*mc/i,
  /fake/i,
  /dummy/i,
  
  // Test emails
  /@test\./i,
  /@example\./i,
  /@demo\./i,
  /test@/i,
  /demo@/i,
  /noreply@/i,
  /@localhost/i,
  
  // Test phone numbers (common test patterns)
  /555-?555-?5555/,
  /123-?123-?1234/,
  /000-?000-?0000/,
  /111-?111-?1111/,
];

async function fetchBookings() {
  console.log('🔍 Fetching all bookings...');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

function isTestBooking(booking) {
  const fieldsToCheck = [
    booking.guest_name || '',
    booking.guest_email || '',
    booking.guest_phone || '',
    booking.special_requests || ''
  ];
  
  const matchedPatterns = [];
  fieldsToCheck.forEach((field, fieldIndex) => {
    TEST_PATTERNS.forEach((pattern, patternIndex) => {
      if (pattern.test(field)) {
        const fieldNames = ['name', 'email', 'phone', 'requests'];
        matchedPatterns.push(`${fieldNames[fieldIndex]}: "${field}" matches ${pattern}`);
      }
    });
  });
  
  return { isTest: matchedPatterns.length > 0, reasons: matchedPatterns };
}

function formatBookingDetails(booking, index) {
  const date = new Date(booking.booking_time).toLocaleString();
  return `   ${index + 1}. ID: ${booking.id}
      Name: ${booking.guest_name}
      Email: ${booking.guest_email}
      Phone: ${booking.guest_phone || 'N/A'}
      Date: ${date}
      Status: ${booking.status}
      Party Size: ${booking.party_size}`;
}

async function main() {
  try {
    console.log('🔍 PREVIEW MODE: Test Booking Cleanup Analysis\n');
    console.log('This script will show you what would be deleted without making any changes.\n');
    
    // Fetch all bookings
    const bookings = await fetchBookings();
    console.log(`📊 Found ${bookings.length} total bookings\n`);
    
    if (bookings.length === 0) {
      console.log('✅ No bookings found in the database');
      return;
    }
    
    // Analyze bookings
    const testBookings = [];
    const realBookings = [];
    
    bookings.forEach(booking => {
      const analysis = isTestBooking(booking);
      if (analysis.isTest) {
        testBookings.push({ ...booking, reasons: analysis.reasons });
      } else {
        realBookings.push(booking);
      }
    });
    
    console.log('📋 ANALYSIS RESULTS:');
    console.log(`   • Test bookings to delete: ${testBookings.length}`);
    console.log(`   • Real bookings to preserve: ${realBookings.length}\n`);
    
    if (testBookings.length > 0) {
      console.log('🗑️  TEST BOOKINGS TO BE DELETED:');
      console.log('=' .repeat(50));
      testBookings.forEach((booking, index) => {
        console.log(formatBookingDetails(booking, index));
        console.log(`      Reasons: ${booking.reasons.join(', ')}`);
        console.log();
      });
    }
    
    if (realBookings.length > 0) {
      console.log('✅ REAL BOOKINGS TO BE PRESERVED:');
      console.log('=' .repeat(50));
      realBookings.forEach((booking, index) => {
        console.log(formatBookingDetails(booking, index));
        console.log();
      });
    }
    
    if (testBookings.length > 0) {
      console.log('⚠️  NEXT STEPS:');
      console.log('   1. Review the test bookings listed above');
      console.log('   2. If the identification looks correct, run:');
      console.log('      node scripts/cleanup-test-bookings.js');
      console.log('   3. This will permanently delete the test bookings');
      console.log('\n   If any real bookings are incorrectly identified as test data,');
      console.log('   please review and modify the TEST_PATTERNS in the cleanup script.');
    } else {
      console.log('🎉 No test bookings found - your database is clean!');
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    process.exit(1);
  }
}

// Run the preview
main();