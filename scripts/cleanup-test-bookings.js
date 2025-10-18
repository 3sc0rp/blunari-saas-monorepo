/**
 * Script to clean up test booking data from the database
 * This will remove bookings that appear to be test data while preserving real customer bookings
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
  
  return fieldsToCheck.some(field => 
    TEST_PATTERNS.some(pattern => pattern.test(field))
  );
}

async function deleteBookings(bookingIds) {
  if (bookingIds.length === 0) {
    console.log('✅ No test bookings to delete');
    return;
  }
  
  console.log(`🗑️  Deleting ${bookingIds.length} test bookings...`);
  
  // Delete in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < bookingIds.length; i += batchSize) {
    const batch = bookingIds.slice(i, i + batchSize);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=in.(${batch.join(',')})`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to delete batch ${i / batchSize + 1}: ${response.status} ${response.statusText}`);
    } else {
      console.log(`✅ Deleted batch ${i / batchSize + 1} (${batch.length} bookings)`);
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function main() {
  try {
    console.log('🚀 Starting test booking cleanup...\n');
    
    // Fetch all bookings
    const bookings = await fetchBookings();
    console.log(`📊 Found ${bookings.length} total bookings\n`);
    
    if (bookings.length === 0) {
      console.log('✅ No bookings found in the database');
      return;
    }
    
    // Identify test bookings
    const testBookings = bookings.filter(isTestBooking);
    const realBookings = bookings.filter(booking => !isTestBooking(booking));
    
    console.log('📋 Analysis Results:');
    console.log(`   • Test bookings identified: ${testBookings.length}`);
    console.log(`   • Real bookings to preserve: ${realBookings.length}\n`);
    
    if (testBookings.length > 0) {
      console.log('🔍 Test bookings to be deleted:');
      testBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.guest_name} (${booking.guest_email}) - ${booking.id}`);
      });
      console.log();
      
      // Show real bookings that will be preserved
      if (realBookings.length > 0) {
        console.log('✅ Real bookings to be preserved:');
        realBookings.forEach((booking, index) => {
          console.log(`   ${index + 1}. ${booking.guest_name} (${booking.guest_email}) - ${new Date(booking.booking_time).toLocaleDateString()}`);
        });
        console.log();
      }
      
      // Extract IDs for deletion
      const testBookingIds = testBookings.map(b => b.id);
      
      // Perform deletion
      await deleteBookings(testBookingIds);
      
      console.log('\n🎉 Cleanup completed successfully!');
      console.log(`   • Deleted: ${testBookings.length} test bookings`);
      console.log(`   • Preserved: ${realBookings.length} real bookings`);
    } else {
      console.log('✅ No test bookings found - database is clean!');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the script
main();