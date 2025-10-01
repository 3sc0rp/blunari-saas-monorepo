// Quick test script to debug command-center-bookings function
// Run: node test-command-center-function.mjs

const url = 'https://kbfbbkcaxhzlnbqxwgoz.functions.supabase.co/command-center-bookings';
const payload = {
  tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  date: '2025-10-01'
};

console.log('Testing command-center-bookings function...');
console.log('Request:', JSON.stringify(payload, null, 2));
console.log('');

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('Status:', response.status, response.statusText);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  console.log('');

  const text = await response.text();
  console.log('Raw Response Body:');
  console.log(text);
  console.log('');

  try {
    const json = JSON.parse(text);
    console.log('Parsed JSON:');
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('Response is not valid JSON');
  }

} catch (error) {
  console.error('Request failed:', error);
  console.error(error.stack);
}
