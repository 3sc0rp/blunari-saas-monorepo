// Check all bookings and their details
const url = 'https://kbfbbkcaxhzlnbqxwgoz.functions.supabase.co/command-center-bookings';
const payload = {
  tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  date: '2025-10-01'
};

console.log('Fetching ALL bookings...\n');

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2OTEzNTEsImV4cCI6MjAzODI2NzM1MX0.i2aJY6vULSIbKC5lmYJxMOJ3GaNsxaLSOnPxQO4bm0I'
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error('Status:', response.status, response.statusText);
    const text = await response.text();
    console.error('Error:', text);
    process.exit(1);
  }

  const data = await response.json();
  
  console.log(`✅ Found ${data.bookings.length} bookings\n`);
  console.log('Breakdown by status:');
  
  const statusCounts = {};
  data.bookings.forEach(b => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  });
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  console.log('\n📅 Booking Times:');
  data.bookings.forEach((b, i) => {
    const bookingTime = new Date(b.booking_time);
    console.log(`${i + 1}. ${b.guest_name} - ${bookingTime.toLocaleString()} - ${b.status} - Party: ${b.party_size}`);
  });
  
} catch (error) {
  console.error('Request failed:', error);
  process.exit(1);
}
