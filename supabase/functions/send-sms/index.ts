import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SMSRequest {
  tenantId: string;
  orderId?: string;
  to: string;
  message: string;
  recipientName?: string;
}

interface TwilioResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  num_segments: string;
  price: string;
  price_unit: string;
  date_sent: string;
}

/**
 * Send SMS Edge Function
 * 
 * Sends SMS messages via Twilio API with:
 * - Phone number validation
 * - Character count and segment calculation
 * - Cost estimation
 * - Delivery status tracking
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Parse request body
    const smsRequest: SMSRequest = await req.json();
    
    // Validate required fields
    if (!smsRequest.tenantId || !smsRequest.to || !smsRequest.message) {
      throw new Error('Missing required fields: tenantId, to, message');
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(smsRequest.to.replace(/[\s()-]/g, ''))) {
      throw new Error('Invalid phone number format. Use E.164 format (e.g., +12345678900)');
    }

    // Calculate message segments (160 characters per segment for GSM-7)
    const segments = Math.ceil(smsRequest.message.length / 160);

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Create SMS history record (pending status)
    const { data: smsHistory, error: insertError } = await supabase
      .from('sms_history')
      .insert({
        tenant_id: smsRequest.tenantId,
        order_id: smsRequest.orderId,
        recipient_phone: smsRequest.to,
        recipient_name: smsRequest.recipientName,
        message: smsRequest.message,
        status: 'pending',
        segments: segments,
        sent_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating SMS history:', insertError);
      throw new Error('Failed to create SMS history record');
    }

    try {
      // Send SMS via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const formData = new URLSearchParams();
      formData.append('To', smsRequest.to);
      formData.append('From', twilioPhoneNumber);
      formData.append('Body', smsRequest.message);
      formData.append('StatusCallback', `${supabaseUrl}/functions/v1/twilio-status-callback`);

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!twilioResponse.ok) {
        const errorData = await twilioResponse.text();
        console.error('Twilio API error:', errorData);
        throw new Error(`Twilio error: ${errorData}`);
      }

      const twilioData: TwilioResponse = await twilioResponse.json();

      // Calculate cost (estimate: $0.0075 per segment for US)
      const costCents = Math.round(parseInt(twilioData.num_segments) * 0.75);

      // Update SMS history with Twilio details
      await supabase
        .from('sms_history')
        .update({
          status: twilioData.status === 'queued' || twilioData.status === 'sent' ? 'sent' : twilioData.status,
          twilio_sid: twilioData.sid,
          twilio_status: twilioData.status,
          sent_at: new Date().toISOString(),
          cost_cents: costCents,
        })
        .eq('id', smsHistory.id);

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          smsId: smsHistory.id,
          twilioSid: twilioData.sid,
          status: twilioData.status,
          segments: parseInt(twilioData.num_segments),
          costCents: costCents,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (twilioError) {
      // Update SMS history with error
      const twilioErrorMessage = twilioError instanceof Error ? twilioError.message : 'Twilio error';
      await supabase
        .from('sms_history')
        .update({
          status: 'failed',
          error_message: twilioErrorMessage,
        })
        .eq('id', smsHistory.id);

      throw twilioError;
    }

  } catch (error) {
    console.error('Error sending SMS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
