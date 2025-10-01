import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from client-dashboard
config({ path: join(__dirname, '../apps/client-dashboard/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 Testing widget-booking-live edge function response format...\n');

// Step 1: Create token
console.log('📝 Step 1: Creating widget token...');
const tokenResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    slug: 'demo',
    widget_type: 'booking',
    config_version: '2.0'
  })
});

const tokenData = await tokenResponse.json();
const token = tokenData.token;
console.log('✅ Token created\n');

// Step 2: Create hold
console.log('📝 Step 2: Creating hold...');
const holdResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'hold',
    token: token,
    party_size: 2,
    slot: {
      time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  })
});

const holdData = await holdResponse.json();
console.log('✅ Hold response:', JSON.stringify(holdData, null, 2));

if (!holdData.hold_id) {
  console.log('❌ No hold_id in response!');
  process.exit(1);
}

// Step 3: Confirm reservation
console.log('\n📝 Step 3: Confirming reservation...');
const confirmResponse = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'confirm',
    token: token,
    hold_id: holdData.hold_id,
    guest_details: {
      name: 'Debug Test',
      email: 'debug-test@example.com',
      phone: '+1-555-DEBUG'
    }
  })
});

const confirmData = await confirmResponse.json();
console.log('✅ Confirm response:', JSON.stringify(confirmData, null, 2));

console.log('\n🔍 Analyzing response structure...');
console.log('Response keys:', Object.keys(confirmData));
console.log('\n📊 Field mapping:');
console.log('  reservation_id:', confirmData.reservation_id);
console.log('  reservationId:', confirmData.reservationId);
console.log('  id:', confirmData.id);
console.log('  booking_id:', confirmData.booking_id);

if (confirmData.reservation) {
  console.log('  reservation.id:', confirmData.reservation.id);
  console.log('  reservation.reservation_id:', confirmData.reservation.reservation_id);
}

if (confirmData.data) {
  console.log('  data.id:', confirmData.data.id);
  console.log('  data.reservation_id:', confirmData.data.reservation_id);
}
