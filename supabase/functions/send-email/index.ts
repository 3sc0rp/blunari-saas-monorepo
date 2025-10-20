import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

/**
 * Send Email Edge Function
 * 
 * Sends emails via Resend API with support for:
 * - Direct email sending
 * - Template-based emails with variable replacement
 * - Multiple recipients
 * - Reply-to configuration
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
    const emailRequest: EmailRequest = await req.json();
    
    // Validate required fields
    if (!emailRequest.to || !emailRequest.subject) {
      throw new Error('Missing required fields: to, subject');
    }

    if (!emailRequest.html && !emailRequest.templateId) {
      throw new Error('Either html content or templateId is required');
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    let emailHtml = emailRequest.html;
    let emailText = emailRequest.text;

    // If using a template, fetch and process it
    if (emailRequest.templateId) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', emailRequest.templateId)
        .single();

      if (templateError || !template) {
        throw new Error('Email template not found');
      }

      // Replace placeholders in template
      emailHtml = replacePlaceholders(template.body_html, emailRequest.templateData || {});
      emailText = template.body_text 
        ? replacePlaceholders(template.body_text, emailRequest.templateData || {})
        : undefined;
    }

    // Prepare Resend request
    const resendPayload = {
      from: emailRequest.from || Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@blunari.ai',
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: emailRequest.subject,
      html: emailHtml,
      text: emailText,
      reply_to: emailRequest.replyTo,
    };

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const resendData: ResendResponse = await resendResponse.json();

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
        sentAt: resendData.created_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Replace placeholders in template string
 * Supports {{placeholder}} syntax
 */
function replacePlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}
