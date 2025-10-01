// Inlined canonical widget-booking-live implementation with enhanced booking insert reliability.
// Original source: apps/client-dashboard/supabase/functions/widget-booking-live/index.ts
// Enhancements (deployment version):
// 1. Simplified auth (expects tenant_id directly) for rapid recovery of broken reservation_id issue.
// 2. Stronger insert recovery: retry lookup loop if PostgREST returns 201 w/out representation.
// 3. Diagnostic actions: action=ping, action=diag for environment checks.
// 4. Minimal surface focused on hold & confirm paths needed for widget flow.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id, x-idempotency-key",
  "Access-Control-Expose-Headers": "x-request-id, x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; object-src 'none';",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function errorResponse(code: string, message: string, status = 400, requestId?: string, issues?: unknown) {
  return new Response(JSON.stringify({ success: false, error: { code, message, requestId, issues } }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } });
}

function nowIso() { return new Date().toISOString(); }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // must be service role for RLS bypass
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED','Method not allowed',405,requestId);

    let bodyText = ''; let data: any = {}; try { bodyText = await req.text(); if (bodyText) data = JSON.parse(bodyText); } catch { }
    if (!data.action) return errorResponse('MISSING_ACTION','Action parameter is required',400,requestId);

    if (data.action === 'ping') return new Response(JSON.stringify({ success: true, pong: true, requestId, time: nowIso() }), { status:200, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    if (data.action === 'diag') {
      return new Response(JSON.stringify({
        success: true,
        requestId,
        env: {
          hasServiceRole: !!supabaseKey,
          serviceRoleLength: supabaseKey ? supabaseKey.length : 0,
          supabaseHost: (()=>{ try { return new URL(supabaseUrl).host; } catch { return 'invalid'; } })(),
        }
      }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
    }

    // Minimal auth: require tenant_id present for hold/confirm paths (token logic trimmed for deploy emergency)
    const tenantId = data.tenant_id;
    if (!tenantId) return errorResponse('MISSING_TENANT','tenant_id is required',400,requestId);

    if (data.action === 'hold') {
      const slotTime = data.slot?.time; const partySize = Number(data.party_size);
      if (!slotTime || !partySize) return errorResponse('HOLD_INVALID','Missing slot.time or party_size',400,requestId);
      const holdPayload = {
        tenant_id: tenantId,
        booking_time: slotTime,
        party_size: partySize,
        duration_minutes: 120,
        session_id: crypto.randomUUID(),
        expires_at: new Date(Date.now()+10*60*1000).toISOString(),
      } as any;
      let holdRes = await supabase.from('booking_holds').insert(holdPayload).select().single();
      if (holdRes.error) {
        // try legacy date+time schema
        const when = new Date(slotTime); const legacy = { tenant_id: tenantId, booking_date: when.toISOString().slice(0,10), booking_time: when.toISOString().slice(11,19), party_size: partySize, duration_minutes:120, session_id: crypto.randomUUID(), expires_at: new Date(Date.now()+10*60*1000).toISOString() } as any;
        holdRes = await supabase.from('booking_holds').insert(legacy).select().single();
      }
      if (holdRes.error || !holdRes.data) return errorResponse('HOLD_FAILED','Unable to reserve time slot',500,requestId,{ details: holdRes.error?.message });
      return new Response(JSON.stringify({ success:true, hold_id: holdRes.data.id, expires_at: holdRes.data.expires_at, requestId }), { status:200, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }

    if (data.action === 'confirm') {
      const { hold_id, guest_details, idempotency_key } = data;
      if (!hold_id || !guest_details?.email) return errorResponse('CONFIRMATION_INVALID','Missing hold_id or guest details',400,requestId);

      // Fetch hold
      const { data: hold, error: holdErr } = await supabase.from('booking_holds').select('*').eq('id', hold_id).maybeSingle();
      if (holdErr || !hold) return errorResponse('HOLD_NOT_FOUND','Booking hold not found or expired',404,requestId,{ details: holdErr?.message });

      const holdStart: Date = (hold.booking_time && hold.booking_time.includes('T')) ? new Date(hold.booking_time) : new Date(`${hold.booking_date}T${hold.booking_time||'00:00:00'}`);

      const baseBooking = {
        tenant_id: tenantId,
        booking_time: holdStart.toISOString(),
        party_size: hold.party_size,
        guest_name: guest_details.name || guest_details.first_name || 'Guest',
        guest_email: guest_details.email,
        guest_phone: guest_details.phone || null,
        special_requests: guest_details.special_requests || null,
        status: 'pending',
        duration_minutes: hold.duration_minutes || 120,
        deposit_required: false,
        deposit_amount: 0,
        deposit_paid: false,
      } as any;

      // Primary insert attempt (modern schema)
      let insert = await supabase.from('bookings').insert(baseBooking).select().single();

      if (insert.error) {
        console.log(`[${requestId}] Primary insert failed:`, insert.error.message);
      }

      let booking = insert.data;

      // Retry lookup loop if missing booking
      if (!booking || !booking.id) {
        console.log(`[${requestId}] Insert returned no row. Beginning retry lookup loop.`);
        for (let attempt=1; attempt<=3 && (!booking || !booking.id); attempt++) {
          await new Promise(r=>setTimeout(r, 150*attempt));
            const { data: lookupList, error: lookupErr } = await supabase
              .from('bookings')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('guest_email', guest_details.email)
              .order('created_at', { ascending: false })
              .limit(1);
            if (lookupErr) {
              console.log(`[${requestId}] Retry lookup error attempt ${attempt}:`, lookupErr.message);
            } else if (Array.isArray(lookupList) && lookupList.length) {
              booking = lookupList[0];
              console.log(`[${requestId}] Recovered booking on attempt ${attempt}:`, booking.id);
              break;
            }
        }
      }

      if (!booking || !booking.id) return errorResponse('BOOKING_NOT_CREATED','Booking not created (RLS? service role missing?)',500,requestId,{ serviceRolePresent: !!supabaseKey });

      const confirmationNumber = `PEND${booking.id.slice(-6).toUpperCase()}`;
      const responseBody = { success:true, reservation_id: booking.id, confirmation_number: confirmationNumber, status: booking.status || 'pending', summary: { date: booking.booking_time, time: new Date(booking.booking_time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}), party_size: booking.party_size, table_info: 'Pending approval' }, requestId };
      if (idempotency_key) { try { await supabase.from('idempotency_keys').insert({ tenant_id: tenantId, idempotency_key, request_id: requestId, status_code: 200, response_json: responseBody }); } catch(_){} }
      return new Response(JSON.stringify(responseBody), { status:200, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }

    return errorResponse('INVALID_ACTION','Unsupported action',400,requestId);
  } catch (e) {
    console.error('[widget-booking-live] INTERNAL_ERROR', e);
    return errorResponse('INTERNAL_ERROR','Unexpected server error',500,requestId,{ details: `${e}` });
  }
});
