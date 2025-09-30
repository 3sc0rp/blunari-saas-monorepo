const url = process.env.VITE_SUPABASE_URL || 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'MISSING';

async function run(){
  const endpoint = `${url}/rest/v1/bookings?select=id,tenant_id,booking_time,booking_date,status,created_at&order=created_at.desc.nullslast&limit=10`;
  const res = await fetch(endpoint, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text);
}
run().catch(e=>{ console.error(e); process.exit(1); });
