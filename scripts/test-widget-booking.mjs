/*
  Simple end-to-end tester for the widget-booking-live edge function.
  Usage (PowerShell):
    $env:VITE_SUPABASE_ANON_KEY="<anon>"; node scripts/test-widget-booking.mjs
*/

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

function b64urlEncode(str) {
  return Buffer.from(str, 'utf8').toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function simpleHMAC(data, secret) {
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash;
  }
  return b64urlEncode(hash.substring(0, 64));
}

function createDevWidgetToken(slug = 'demo') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { slug, exp: Math.floor(Date.now() / 1000) + 3600 };
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const s = simpleHMAC(`${h}.${p}`, 'dev-jwt-secret-change-in-production-2025');
  return `${h}.${p}.${s}`;
}

async function post(action, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/widget-booking-live`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, data: json };
}

async function main() {
  const token = createDevWidgetToken('demo');
  const slotTime = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  console.log('== HOLD ==');
  const hold = await post('hold', { token, party_size: 2, slot: { time: slotTime } });
  console.log(JSON.stringify(hold, null, 2));
  if (!hold.ok) process.exit(hold.status || 1);
  const holdId = hold?.data?.hold_id;
  if (!holdId) {
    console.error('No hold_id returned');
    process.exit(2);
  }
  console.log('== CONFIRM ==');
  const idem = (globalThis.crypto?.randomUUID?.() || `idem-${Date.now()}-${Math.random()}`);
  const confirm = await post('confirm', {
    token,
    hold_id: holdId,
    idempotency_key: idem,
    guest_details: { first_name: 'Test', last_name: 'User', email: 'example@example.com', phone: '123' },
  });
  console.log(JSON.stringify(confirm, null, 2));
  if (!confirm.ok) process.exit(confirm.status || 1);
}

main().catch((e) => { console.error(e); process.exit(1); });


