// Restored full implementation (token-based, tenant/search/hold/confirm) with enhanced post-insert retry logic.
// Source copied from apps/client-dashboard/supabase/functions/widget-booking-live/index.ts and augmented:
//  - Added retry loop before final BOOKING_NOT_CREATED error in handleConfirmReservationLocal.
//  - Added optional ping/diag actions for quick health checks.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id, x-idempotency-key",
  "Access-Control-Expose-Headers": "x-request-id, x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; object-src 'none';",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function b64urlDecode(str: string): string { const padded = str.replace(/-/g, '+').replace(/_/g, '/'); const pad = padded.length % 4; const paddedStr = pad ? padded + '='.repeat(4 - pad) : padded; try { return atob(paddedStr); } catch { return ''; } }
function b64urlEncode(str: string): string { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, ''); }
function simpleHMAC(data: string, secret: string): string { let hash = secret; for (let i = 0; i < data.length; i++) { hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash; } return b64urlEncode(hash.substring(0, 64)); }
function getWidgetSecret(): string { return Deno.env.get('WIDGET_JWT_SECRET') || Deno.env.get('VITE_JWT_SECRET') || 'dev-jwt-secret-change-in-production-2025'; }
function validateWidgetToken(token: string): { slug: string; configVersion?: string; widgetType?: string } | null { try { const parts = token.split('.'); if (parts.length !== 3) return null; const [h, p, s] = parts; const header = JSON.parse(b64urlDecode(h)); if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') return null; const payload = JSON.parse(b64urlDecode(p)); if (!payload || !payload.slug) return null; if (payload.exp && Math.floor(Date.now()/1000) > payload.exp) return null; const secret = getWidgetSecret(); const expected = simpleHMAC(`${h}.${p}`, secret); if (expected !== s) return null; return { slug: payload.slug, configVersion: payload.configVersion, widgetType: payload.widgetType }; } catch { return null; } }
function errorResponse(code: string, message: string, status = 400, requestId?: string, issues?: unknown) { return new Response(JSON.stringify({ success: false, error: { code, message, requestId, issues } }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } }); }

serve(async (req) => {
  if (req.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
  const requestId = crypto.randomUUID();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseKey) {
      console.warn('[widget-booking-live] Service role key missing at runtime');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== "POST") return errorResponse('METHOD_NOT_ALLOWED','Method not allowed',405,requestId);

  let requestData: any = {};
  try { const bodyText = await req.text(); requestData = bodyText ? JSON.parse(bodyText) : {}; } catch { return errorResponse('INVALID_JSON','Invalid JSON',400,requestId); }
  console.log('[widget-booking-live] Incoming body', { requestId, keys: Object.keys(requestData||{}), action: requestData.action, raw: requestData });
    const action = requestData.action;
    if (!action) return errorResponse('MISSING_ACTION','Action parameter is required',400,requestId);

    if (action === 'ping') return new Response(JSON.stringify({ success:true, pong:true, requestId }), { status:200, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    if (action === 'diag') return new Response(JSON.stringify({ success:true, requestId, env:{ serviceRolePresent: !!supabaseKey, supabaseHost: (()=>{ try { return new URL(supabaseUrl).host; } catch { return 'invalid'; } })() } }), { status:200, headers: { ...corsHeaders, 'Content-Type':'application/json' } });

    // Resolve tenant via token, tenant_id, or (temporary) slug fallback
    const urlObj = new URL(req.url);
  const token = requestData.token || urlObj.searchParams.get('token');
  const slugRaw = requestData.slug || requestData.tenant_slug || urlObj.searchParams.get('slug') || urlObj.searchParams.get('restaurant') || urlObj.searchParams.get('tenant');
  const slugParam = (typeof slugRaw === 'string' ? slugRaw.trim() : '').toLowerCase() || null;
    const allowSlugFallback = (Deno.env.get('WIDGET_ALLOW_SLUG_FALLBACK') || 'true').toLowerCase() === 'true';
    const tokenPayload = token ? validateWidgetToken(token) : null;
    let resolvedTenantId: string | null = null; let resolvedTenant: any = null; let authMode: string = 'none';

    // AUTH DIAGNOSTICS
    console.log('[widget-booking-live][auth] Incoming auth attempt', {
      requestId,
      hasToken: !!token,
      tokenLength: token?.length,
      tokenValid: !!tokenPayload,
      tokenSlug: tokenPayload?.slug,
      providedTenantId: requestData.tenant_id || null,
      slugParam,
      allowSlugFallback
    });

    if (tokenPayload?.slug) {
      const { data: tenant, error: tErr } = await supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').eq('slug', tokenPayload.slug).maybeSingle();
      console.log('[widget-booking-live][auth] Token slug lookup result', { found: !!tenant, error: tErr?.message });
      if (tenant) { resolvedTenantId = tenant.id; resolvedTenant = tenant; authMode = 'token'; }
    }
    if (!resolvedTenantId && requestData.tenant_id) {
      const { data: tenant, error: tErr } = await supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').eq('id', requestData.tenant_id).maybeSingle();
      console.log('[widget-booking-live][auth] Explicit tenant_id lookup', { id: requestData.tenant_id, found: !!tenant, error: tErr?.message });
      if (tenant) { resolvedTenantId = tenant.id; resolvedTenant = tenant; authMode = 'explicit_tenant_id'; }
    }
    if (!resolvedTenantId && !tokenPayload && slugParam && allowSlugFallback) {
      // multi-step slug resolution
      // 1. direct eq (normalized lowercase assumption)
      let lastError: string | undefined;
      const attempts: Array<{strategy:string; found:boolean; error?:string}> = [];
      const trySelect = async (fn: () => Promise<any>, strategy: string) => {
        try { const { data, error } = await fn(); if (error) { attempts.push({ strategy, found:false, error: error.message }); lastError = error.message; return null; } if (data) { attempts.push({ strategy, found:true }); return data; } attempts.push({ strategy, found:false }); return null; } catch (e:any) { attempts.push({ strategy, found:false, error: String(e?.message||e) }); lastError = String(e?.message||e); return null; }
      };
      const baseSelect = () => supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').eq('slug', slugParam).maybeSingle();
      const ilikeSelect = () => supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').ilike('slug', slugParam);
      const nameSelect = () => supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').ilike('name', slugParam);
      let tenant = await trySelect(baseSelect, 'slug_eq');
      if (!tenant) {
        const { data: list1, error: l1Err } = await supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').ilike('slug', `%${slugParam}%`);
        if (l1Err) { attempts.push({ strategy:'slug_ilike_wild', found:false, error:l1Err.message }); }
        else if (Array.isArray(list1) && list1.length === 1) { tenant = list1[0]; attempts.push({ strategy:'slug_ilike_wild', found:true }); }
        else attempts.push({ strategy:'slug_ilike_wild', found:false });
      }
      if (!tenant) {
        const { data: list2, error: l2Err } = await supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').ilike('name', `%${slugParam}%`);
        if (l2Err) { attempts.push({ strategy:'name_ilike_wild', found:false, error:l2Err.message }); }
        else if (Array.isArray(list2) && list2.length === 1) { tenant = list2[0]; attempts.push({ strategy:'name_ilike_wild', found:true }); }
        else attempts.push({ strategy:'name_ilike_wild', found:false });
      }
      if (!tenant) {
        // single-tenant fallback (dev only) if only one tenant exists
        const { data: allTenants, error: allErr } = await supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours');
        if (!allErr && Array.isArray(allTenants) && allTenants.length === 1) {
          tenant = allTenants[0];
          attempts.push({ strategy:'single_tenant_global_fallback', found:true });
        } else attempts.push({ strategy:'single_tenant_global_fallback', found:false, error: allErr?.message });
      }
      console.log('[widget-booking-live][auth] Slug fallback multi strategy result', { slugParam, found: !!tenant, attempts, lastError });
      if (tenant) { resolvedTenantId = tenant.id; resolvedTenant = tenant; authMode = 'slug_fallback'; }
    }
    if (!resolvedTenantId) {
      // Final attempt: if this is a tenant metadata request and we have a slug, allow open lookup (soft public data)
      if (requestData.action === 'tenant' && slugParam && allowSlugFallback) {
        console.log('[widget-booking-live][auth] Allowing open tenant lookup via slug (public metadata)');
        const { data: tenant, error: tErr } = await supabase.from('tenants').select('id,name,slug,timezone,currency,business_hours').eq('slug', slugParam).maybeSingle();
        if (tenant) {
          resolvedTenantId = tenant.id; resolvedTenant = tenant; authMode = 'slug_public';
        } else {
          console.warn('[widget-booking-live][auth] Public slug lookup failed', { slugParam, error: tErr?.message });
        }
      }
      if (!resolvedTenantId) {
        console.warn('[widget-booking-live][auth] AUTH FAILURE', { requestId, hasToken: !!token, tokenValid: !!tokenPayload, slugParam, allowSlugFallback });
        return errorResponse('INVALID_TOKEN', 'Valid widget token or tenant_id required', 401, requestId, {
          hasToken: !!token,
            tokenValid: !!tokenPayload,
            tokenSlice: token ? token.slice(0,12) : null,
            slugProvided: !!slugParam,
            slugValue: slugParam,
            slugFallbackEnabled: allowSlugFallback,
            action: requestData.action,
            hint: allowSlugFallback ? 'Slug fallback enabled but tenant not found. Verify slug exists in tenants.slug.' : 'Provide a signed widget token or tenant_id.'
        });
      }
    }
    requestData.tenant_id = resolvedTenantId;

    if (action === 'tenant') {
      if (!resolvedTenant) { const { data: tenant } = await supabase.from('tenants').select('id,slug,name,timezone,currency,business_hours').eq('id', resolvedTenantId).maybeSingle(); resolvedTenant = tenant; }
      if (!resolvedTenant) return errorResponse('TENANT_NOT_FOUND','Tenant not found',404,requestId);
  const responseData = { tenant_id: resolvedTenant.id, slug: resolvedTenant.slug, name: resolvedTenant.name, timezone: resolvedTenant.timezone || 'UTC', currency: resolvedTenant.currency || 'USD', business_hours: resolvedTenant.business_hours || [], branding: { primary_color:'#3b82f6', secondary_color:'#1e40af' }, features: { deposit_enabled:false, revenue_optimization:true }, auth_mode: authMode };
  return new Response(JSON.stringify(responseData), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json', 'x-request-id': requestId, 'x-auth-mode': authMode } });
    }
    if (action === 'search') { return await handleAvailabilitySearch(supabase, requestData, resolvedTenant?.timezone, requestId); }
    if (action === 'hold') { return await handleCreateHoldLocal(supabase, requestData, requestId); }
    if (action === 'confirm') { return await handleConfirmReservationLocal(supabase, requestData, requestId, resolvedTenant); }

    return errorResponse('INVALID_ACTION','Invalid action',400,requestId);
  } catch (e) {
    return errorResponse('INTERNAL_ERROR','Unexpected error',500,requestId,{ details: `${e}` });
  }
});

// ---- (Copied helper & handler functions with minor augmentation) ----
async function handleAvailabilitySearch(supabase: any, requestData: any, tenantTimezone?: string, requestId?: string) {
  const { tenant_id, party_size, service_date } = requestData;
  const { data: tenant } = await supabase.from('tenants').select('id').eq('id', tenant_id).maybeSingle();
  if (!tenant) return errorResponse('TENANT_NOT_FOUND','Tenant not found',404,requestId);
  const { data: holiday } = await supabase.from('holidays').select('holiday_date').eq('tenant_id', tenant_id).eq('holiday_date', service_date).maybeSingle();
  if (holiday) return new Response(JSON.stringify({ success:true, slots:[], reason:'HOLIDAY', requestId }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  const windowForDay = await resolveTimeWindowForDate(supabase, tenant_id, service_date, tenantTimezone);
  if (!windowForDay) return new Response(JSON.stringify({ success:true, slots:[], reason:'CLOSED_OR_NO_HOURS', requestId }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  const searchDate = new Date(service_date); const dayStart = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate()); const dayEnd = new Date(dayStart.getTime()+86400000);
  const [tablesRes, bookingsTsRes] = await Promise.all([
    supabase.from('restaurant_tables').select('*').eq('tenant_id', tenant_id).eq('active', true),
    supabase.from('bookings').select('table_id, booking_time, duration_minutes, status').eq('tenant_id', tenant_id).gte('booking_time', dayStart.toISOString()).lt('booking_time', dayEnd.toISOString())
  ]);
  if (tablesRes.error) return errorResponse('SEARCH_FAILED','Unable to load restaurant tables',500,requestId,{ details: tablesRes.error.message });
  let bookings: any[] = bookingsTsRes.data || [];
  if (!bookings.length) { try { const { data: bdData } = await supabase.from('bookings').select('table_id, booking_date, booking_time, duration_minutes, status').eq('tenant_id', tenant_id).eq('booking_date', service_date); bookings = (bdData||[]).map((b:any)=>({ table_id:b.table_id, booking_time:`${b.booking_date}T${b.booking_time||'00:00:00'}`, duration_minutes:b.duration_minutes, status:b.status })); } catch {} }
  const slots = generateTimeSlots(tablesRes.data||[], bookings, Number(party_size), searchDate, windowForDay, tenantTimezone || 'UTC', { preBufferMin:10, postBufferMin:10 });
  return new Response(JSON.stringify({ success:true, slots, requestId }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json', 'x-request-id': requestId || '' } });
}
async function resolveTimeWindowForDate(supabase: any, tenantId: string, serviceDate: string, tenantTimezone?: string) { try { const tz = tenantTimezone || 'UTC'; const dowLocal = (()=>{ const testDate = new Date(`${serviceDate}T12:00:00Z`); const dayStr = new Intl.DateTimeFormat('en-US',{ weekday:'short', timeZone: tz }).format(testDate); const map:Record<string,number>={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}; return map[dayStr] ?? new Date(serviceDate).getUTCDay(); })(); const { data: bhAll } = await supabase.from('business_hours').select('day_of_week,is_open,open_time,close_time').eq('tenant_id', tenantId); if (Array.isArray(bhAll) && bhAll.length){ const rec = bhAll.find((r:any)=>r.day_of_week===dowLocal); if (rec && rec.is_open && rec.open_time && rec.close_time) return { start:`T${rec.open_time}`, end:`T${rec.close_time}` }; return null; } } catch {} return null; }
async function handleCreateHoldLocal(supabase: any, requestData: any, requestId?: string) { try { const { tenant_id, slot, party_size } = requestData; if (!tenant_id || !slot?.time || !party_size) return errorResponse('HOLD_INVALID','Missing tenant_id, slot.time or party_size',400,requestId); const holdData = { tenant_id, booking_time: slot.time, party_size:Number(party_size), duration_minutes:120, session_id: crypto.randomUUID(), expires_at: new Date(Date.now()+10*60*1000).toISOString() } as any; let hold = null; let holdError = null; { const res = await supabase.from('booking_holds').insert(holdData).select().single(); hold = res.data; holdError = res.error; } if (holdError){ const when = new Date(slot.time); const holdDataSplit = { tenant_id, booking_date: when.toISOString().slice(0,10), booking_time: when.toISOString().slice(11,19), party_size:Number(party_size), duration_minutes:120, session_id: crypto.randomUUID(), expires_at: new Date(Date.now()+10*60*1000).toISOString() }; const res2 = await supabase.from('booking_holds').insert(holdDataSplit).select().single(); hold = res2.data; holdError = res2.error; } if (holdError) return errorResponse('HOLD_FAILED','Unable to reserve time slot',500,requestId,{ details: holdError.message }); return new Response(JSON.stringify({ success:true, hold_id: hold.id, expires_at: hold.expires_at, requestId }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json', 'x-request-id': requestId||'' } }); } catch (e) { return errorResponse('HOLD_FAILED','Unable to reserve time slot',500,requestId,{ details:`${e}` }); } }
async function handleConfirmReservationLocal(supabase: any, requestData: any, requestId: string | undefined, tenant: any) { try { const { tenant_id, hold_id, guest_details, idempotency_key } = requestData; if (!tenant_id || !hold_id || !guest_details?.email) return errorResponse('CONFIRMATION_INVALID','Missing tenant_id, hold_id, or guest details',400,requestId); const { data: hold, error: holdError } = await supabase.from('booking_holds').select('*').eq('id', hold_id).maybeSingle(); if (holdError || !hold) return errorResponse('HOLD_NOT_FOUND','Booking hold not found or expired',404,requestId,{ details: holdError?.message }); const holdStart: Date = (hold.booking_time && typeof hold.booking_time === 'string' && hold.booking_time.includes('T')) ? new Date(hold.booking_time) : new Date(`${hold.booking_date}T${(hold.booking_time||'00:00:00')}`); const durationMins: number = hold.duration_minutes || 120; const bookingData = { tenant_id, booking_time: holdStart.toISOString(), party_size: hold.party_size, guest_name: guest_details.name || guest_details.first_name || 'Guest', guest_email: guest_details.email, guest_phone: guest_details.phone || null, special_requests: guest_details.special_requests || null, status:'pending', duration_minutes: durationMins, deposit_required:false, deposit_amount:0, deposit_paid:false } as any; let booking:any=null; let bookingError:any=null; const res = await supabase.from('bookings').insert(bookingData).select().single(); booking = res.data; bookingError = res.error; if (bookingError){ const legacyInsert = { ...bookingData }; const res2 = await supabase.from('bookings').insert(legacyInsert).select().single(); booking = res2.data; bookingError = res2.error; } if (bookingError) return errorResponse('CONFIRMATION_FAILED','Unable to confirm reservation. Database insertion failed.',500,requestId,{ details: bookingError.message }); if (!booking || !booking.id) { // retry loop augmentation
      for (let attempt=1; attempt<=3 && (!booking || !booking.id); attempt++) { await new Promise(r=>setTimeout(r, 150*attempt)); const { data: lookupList } = await supabase.from('bookings').select('*').eq('tenant_id', tenant_id).eq('guest_email', guest_details.email).order('created_at',{ ascending:false }).limit(1); if (Array.isArray(lookupList) && lookupList.length){ booking = lookupList[0]; break; } }
    }
    if (!booking || !booking.id) { return errorResponse('BOOKING_NOT_CREATED','Booking was not created.',500,requestId,{ diagnostics:{ serviceRoleKeyPresent: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), tenant_id, guest_email: guest_details?.email||null } }); }
    const confirmationNumber = `PEND${booking.id.slice(-6).toUpperCase()}`; const body = { success:true, reservation_id: booking.id, confirmation_number: confirmationNumber, status: booking.status || 'pending', summary:{ date: booking.booking_time, time: new Date(booking.booking_time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}), party_size: booking.party_size, table_info: 'Pending approval', deposit_required:false }, _local:true, requestId }; if (idempotency_key) { try { await supabase.from('idempotency_keys').insert({ tenant_id, idempotency_key, request_id: requestId, status_code:200, response_json: body }); } catch {} } return new Response(JSON.stringify(body), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json', 'x-request-id': requestId||'' } }); } catch (e) { return errorResponse('CONFIRMATION_FAILED','Unable to confirm reservation. Please try again.',500,requestId,{ details:`${e}` }); } }
function getTzOffsetMinutes(date: Date, timeZone: string): number { const dtf = new Intl.DateTimeFormat('en-US',{ timeZone, hour12:false, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' }); const parts = dtf.formatToParts(date); const map:Record<string,string>={} as any; for (const p of parts) { if (p.type !== 'literal') map[p.type]=p.value; } const asUTC = Date.UTC(+map.year, +map.month-1, +map.day, +map.hour, +map.minute, +map.second); return (asUTC - date.getTime())/60000; }
function zonedWallTimeToUtcISO(serviceDate: Date, hour: number, minute: number, timeZone: string): string { const guess = new Date(Date.UTC(serviceDate.getUTCFullYear(), serviceDate.getUTCMonth(), serviceDate.getUTCDate(), hour, minute, 0)); const offsetMin = getTzOffsetMinutes(guess, timeZone); const utc = new Date(guess.getTime() - offsetMin * 60000); return utc.toISOString(); }
function generateTimeSlots(tables:any[], bookings:any[], partySize:number, date:Date, timeWindow?:{start:string; end:string}, tenantTimezone='UTC', options?:{ preBufferMin?:number; postBufferMin?:number }) { const slots:any[]=[]; const suitableTables = tables.filter(t=>t.capacity>=partySize); const [startH,startM]=(timeWindow?.start?.replace('T','')||'12:00:00').split(':').map(v=>parseInt(v,10)); const [endH,endM]=(timeWindow?.end?.replace('T','')||'21:00:00').split(':').map(v=>parseInt(v,10)); const endTotalMin = endH*60 + (endM||0); const preBuf = Math.max(0, options?.preBufferMin ?? 0); const postBuf = Math.max(0, options?.postBufferMin ?? 0); for (let hour=startH; hour<=endH; hour++){ for (let minute=0; minute<60; minute+=30){ const iso = zonedWallTimeToUtcISO(date,hour,minute,tenantTimezone); const slotTime = new Date(iso); const totalMin = hour*60+minute; if (totalMin>=endTotalMin) break; if (slotTime <= new Date()) continue; const conflicting = bookings.filter(b=>{ const bookingStart = new Date(b.booking_time); const bookingEnd = new Date(bookingStart.getTime()+b.duration_minutes*60000+postBuf*60000); const slotStartBuffered = new Date(slotTime.getTime()-preBuf*60000); const slotEnd = new Date(slotTime.getTime()+120*60000+postBuf*60000); return slotStartBuffered < bookingEnd && slotEnd > bookingStart; }); let availableTables = suitableTables.length - conflicting.length; if (availableTables>0){ slots.push({ time: iso, available_tables: availableTables, optimal: hour>=18 && hour<=19 }); } } } return slots; }
