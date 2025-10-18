import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reservation_id, action, tenant_id } = await req.json();

    if (!reservation_id || !action || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate action
    if (!['approve', 'decline'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action. Must be approve or decline' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', reservation_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (fetchError || !reservation) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if reservation is in pending status
    if (reservation.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Reservation is not in pending status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tenant info for email notifications
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();

    const newStatus = action === 'approve' ? 'confirmed' : 'cancelled';
    
    // Update reservation status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        ...(action === 'approve' ? { confirmation_code: `CONF${reservation.id.slice(-6).toUpperCase()}` } : {})
      })
      .eq('id', reservation_id)
      .eq('tenant_id', tenant_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update reservation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email notification to customer
    await sendStatusUpdateEmail({
      toEmail: reservation.guest_email,
      tenantName: tenant?.name || 'Restaurant',
      guestName: reservation.guest_name,
      bookingTime: reservation.booking_time,
      partySize: reservation.party_size,
      action: action,
      confirmationCode: action === 'approve' ? `CONF${reservation.id.slice(-6).toUpperCase()}` : null,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      status: newStatus,
      confirmation_code: action === 'approve' ? `CONF${reservation.id.slice(-6).toUpperCase()}` : null
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendStatusUpdateEmail(params: {
  toEmail: string;
  tenantName: string;
  guestName: string;
  bookingTime: string;
  partySize: number;
  action: 'approve' | 'decline';
  confirmationCode?: string | null;
}) {
  const { toEmail, tenantName, guestName, bookingTime, partySize, action, confirmationCode } = params;
  const when = new Date(bookingTime);
  const dateStr = when.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const isApproved = action === 'approve';
  const subject = isApproved 
    ? `✅ Reservation Confirmed at ${tenantName}` 
    : `❌ Reservation Declined at ${tenantName}`;
  
  const text = isApproved
    ? `Hi ${guestName}, great news! Your reservation at ${tenantName} has been confirmed for ${dateStr} at ${timeStr}. Party size: ${partySize}. Confirmation: ${confirmationCode}. We look forward to seeing you!`
    : `Hi ${guestName}, we're sorry but your reservation request at ${tenantName} for ${dateStr} at ${timeStr} (party of ${partySize}) could not be accommodated. Please try a different time or contact us directly.`;
    
  const html = isApproved
    ? `<h2>🎉 Reservation Confirmed!</h2><p>Hi ${guestName},</p><p>Great news! Your reservation at <strong>${tenantName}</strong> has been confirmed.</p><div style="background: #f0f9f0; padding: 20px; border-radius: 8px; margin: 20px 0;"><p><strong>📅 ${dateStr} at ${timeStr}</strong></p><p><strong>👥 Party size:</strong> ${partySize}</p><p><strong>🎫 Confirmation:</strong> ${confirmationCode}</p></div><p>We look forward to seeing you!</p>`
    : `<h2>Reservation Update</h2><p>Hi ${guestName},</p><p>We're sorry, but your reservation request at <strong>${tenantName}</strong> could not be accommodated.</p><div style="background: #fef7f7; padding: 20px; border-radius: 8px; margin: 20px 0;"><p><strong>📅 Requested:</strong> ${dateStr} at ${timeStr}</p><p><strong>👥 Party size:</strong> ${partySize}</p></div><p>Please try selecting a different time, or feel free to contact us directly to discuss alternatives.</p>`;

  // Try Fastmail first
  try {
    const FASTMAIL_API_TOKEN = Deno.env.get('FASTMAIL_API_TOKEN');
    const FASTMAIL_FROM = Deno.env.get('FASTMAIL_FROM');
    if (FASTMAIL_API_TOKEN && FASTMAIL_FROM) {
      await sendEmailViaFastmail({
        apiToken: FASTMAIL_API_TOKEN,
        from: FASTMAIL_FROM,
        to: toEmail,
        subject,
        text,
        html
      });
      return;
    }
  } catch {}

  // Fallback to Resend
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM = Deno.env.get('RESEND_FROM');
    if (RESEND_API_KEY && RESEND_FROM) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: toEmail,
          subject,
          text,
          html
        }),
      });
    }
  } catch {}
}

async function sendEmailViaFastmail(params: { apiToken: string; from: string; to: string; subject: string; text: string; html?: string }) {
  const sessionUrl = 'https://api.fastmail.com/jmap/session';
  const sessionResp = await fetch(sessionUrl, { headers: { 'Authorization': `Bearer ${params.apiToken}` } });
  const session = await sessionResp.json();
  const apiUrl = session.apiUrl;
  const accountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];

  let identityId = null;
  try {
    const identityCall = {
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: [['Identity/get', { accountId }, 'c1']]
    };
    const identityResp = await fetch(apiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${params.apiToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(identityCall) });
    const identityResult = await identityResp.json();
    const resp = (identityResult.methodResponses || []).find((r: any[]) => r[0] === 'Identity/get');
    const list = resp?.[1]?.list || [];
    const match = list.find((i: any) => (i.email || '').toLowerCase() === params.from.split('<').pop()?.replace('>','').trim().toLowerCase());
    identityId = (match || list[0])?.id;
  } catch {}

  const body = {
    using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission'],
    methodCalls: [
      ['Email/set', {
        accountId,
        create: {
          e1: {
            from: [{ email: params.from.split('<').pop()?.replace('>','').trim() }],
            to: [{ email: params.to }],
            subject: params.subject,
            textBody: [{ partId: 't1' }],
            htmlBody: params.html ? [{ partId: 'h1' }] : undefined,
            bodyValues: {
              t1: { value: params.text },
              ...(params.html ? { h1: { value: params.html } } : {})
            },
          }
        }
      }, 'c1'],
      ['EmailSubmission/set', {
        accountId,
        create: {
          s1: {
            emailId: '#e1',
            ...(identityId ? { identityId } : { envelope: { mailFrom: { email: params.from.split('<').pop()?.replace('>','').trim() }, rcptTo: [{ email: params.to }] } })
          }
        }
      }, 'c2']
    ]
  } as any;
  await fetch(apiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${params.apiToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}