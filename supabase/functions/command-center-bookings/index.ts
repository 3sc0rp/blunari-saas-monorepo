import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * command-center-bookings
 * Service-role backed fetch of tables + bookings for a tenant & date window.
 * Use when client-side RLS prevents anon/session user from selecting bookings directly.
 *
 * Request: { tenant_id: string; date?: string (YYYY-MM-DD); hours_window?: { start: number; end: number } }
 * Response: { success: true; requestId; tables: [...]; bookings: [...]; }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: corsHeaders });
    }
    let body: any = {};
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'INVALID_JSON', requestId }), { status: 400, headers: corsHeaders }); }
    const tenantId = body.tenant_id || body.tenantId;
    if (!tenantId) return new Response(JSON.stringify({ error: 'MISSING_TENANT_ID', requestId }), { status: 400, headers: corsHeaders });

    const dateStr: string = body.date || new Date().toISOString().slice(0,10);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'SERVICE_ROLE_MISSING', requestId }), { status: 500, headers: corsHeaders });
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    console.log('[command-center-bookings] Fetching ALL bookings for tenant', { requestId, tenantId, dateStr });
    // Fetch ALL tables + bookings (no time filtering - command center needs to see everything)
    const [tablesRes, bookingsRes] = await Promise.all([
      supabase.from('restaurant_tables').select('id,name,capacity').eq('tenant_id', tenantId).eq('active', true),
      supabase.from('bookings')
        .select('id,tenant_id,table_id,guest_name,guest_email,guest_phone,party_size,booking_time,duration_minutes,status,special_requests,deposit_required,deposit_amount,created_at')
        .eq('tenant_id', tenantId)
        .order('booking_time', { ascending: true })
    ]);
    console.log('[command-center-bookings] Query results', { requestId, tablesError: tablesRes.error?.message, bookingsError: bookingsRes.error?.message, tablesCount: tablesRes.data?.length, bookingsCount: bookingsRes.data?.length });
    if (tablesRes.error) {
      console.error('[command-center-bookings] TABLES_FETCH_FAILED', { requestId, error: tablesRes.error });
      return new Response(JSON.stringify({ error: 'TABLES_FETCH_FAILED', details: tablesRes.error.message, requestId }), { status: 500, headers: corsHeaders });
    }
    let bookingsData = bookingsRes.data;
    let bookingsErr = bookingsRes.error;
    if (bookingsErr) {
      console.error('[command-center-bookings] Bookings fetch failed', { requestId, error: bookingsErr.message });
      return new Response(JSON.stringify({ error: 'BOOKINGS_FETCH_FAILED', details: bookingsErr.message, requestId }), { status: 500, headers: corsHeaders });
    }

    const tables = (tablesRes.data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      status: 'available' // Default status since column doesn't exist in production
    }));
  const bookings = (bookingsData || []).map((b: any) => ({
      id: b.id,
      tenant_id: b.tenant_id,
      table_id: b.table_id,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      guest_phone: b.guest_phone,
      party_size: b.party_size,
      booking_time: b.booking_time,
      duration_minutes: b.duration_minutes || 120,
      status: (b.status || 'pending'),
      special_requests: b.special_requests,
      deposit_required: b.deposit_required,
      deposit_amount: b.deposit_amount,
      created_at: b.created_at
    }));

    return new Response(JSON.stringify({ success: true, requestId, tenant_id: tenantId, date: dateStr, tables, bookings, count: { tables: tables.length, bookings: bookings.length } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } });
  } catch (e: any) {
    console.error('[command-center-bookings] INTERNAL_ERROR', { requestId, error: e, stack: e?.stack });
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: String(e?.message || e), stack: e?.stack, requestId }), { status: 500, headers: corsHeaders });
  }
});
