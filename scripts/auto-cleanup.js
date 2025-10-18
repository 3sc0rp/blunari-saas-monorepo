/**
 * Future Test Data Prevention Script
 * Add this to your development workflow to automatically clean test bookings
 */

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

// Enhanced test patterns for better detection
const TEST_PATTERNS = [
  // Test names (more comprehensive)
  /test/i,
  /testing/i,
  /demo/i,
  /sample/i,
  /example/i,
  /fake/i,
  /dummy/i,
  /john.*test/i,
  /test.*mc/i,
  /jane.*doe/i,
  /john.*doe/i,
  
  // Test emails (comprehensive)
  /@test\./i,
  /@example\./i,
  /@demo\./i,
  /@localhost/i,
  /test@/i,
  /demo@/i,
  /noreply@/i,
  /admin@/i,
  /temp@/i,
  /@tempmail/i,
  /@10minutemail/i,
  
  // Test phone numbers
  /555-?555-?5555/,
  /123-?123-?1234/,
  /000-?000-?0000/,
  /111-?111-?1111/,
  /999-?999-?9999/,
  /\+1234567890/,
  /\+1234567891/,
  /\+1234567892/,
  /\+1234567893/,
  /\+1234567894/,
  /\+1234567895/,
  /\+1234567896/,
  /\+1234567897/,
];

async function autoCleanup() {
  try {
    console.log('🤖 Auto-cleanup: Checking for test bookings...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.status}`);
    }
    
    const bookings = await response.json();
    
    if (bookings.length === 0) {
      console.log('✅ Database is clean - no bookings found');
      return;
    }
    
    const testBookings = bookings.filter(booking => {
      const fieldsToCheck = [
        booking.guest_name || '',
        booking.guest_email || '',
        booking.guest_phone || '',
        booking.special_requests || ''
      ];
      
      return fieldsToCheck.some(field => 
        TEST_PATTERNS.some(pattern => pattern.test(field))
      );
    });
    
    if (testBookings.length > 0) {
      console.log(`🧹 Found ${testBookings.length} test booking(s) to clean up`);
      
      const testIds = testBookings.map(b => b.id);
      const batchSize = 10;
      
      for (let i = 0; i < testIds.length; i += batchSize) {
        const batch = testIds.slice(i, i + batchSize);
        
        const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=in.(${batch.join(',')})`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted ${batch.length} test booking(s)`);
        } else {
          console.error(`❌ Failed to delete batch: ${deleteResponse.status}`);
        }
      }
      
      console.log(`🎉 Cleanup complete - removed ${testBookings.length} test bookings`);
    } else {
      console.log('✅ No test bookings found - database is clean');
    }
    
  } catch (error) {
    console.error('❌ Auto-cleanup error:', error.message);
  }
}

// Export for use in other scripts
module.exports = { autoCleanup, TEST_PATTERNS };

// If run directly
if (require.main === module) {
  autoCleanup();
}