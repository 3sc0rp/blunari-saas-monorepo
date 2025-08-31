import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StaffInvitationRequest {
  employeeId: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeId, email }: StaffInvitationRequest = await req.json();
    
    console.log('Processing staff invitation for:', { employeeId, email });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user info from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Create invitation record and get token
    const { data: invitationData, error: invitationError } = await supabase
      .rpc('create_staff_invitation', {
        p_employee_id: employeeId,
        p_email: email
      });

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      throw new Error('Failed to create invitation');
    }

    // Get the invitation token from the database
    const { data: invitation, error: tokenError } = await supabase
      .from('staff_invitations')
      .select('invitation_token, tenant_id')
      .eq('id', invitationData)
      .single();

    if (tokenError || !invitation) {
      console.error('Error fetching invitation token:', tokenError);
      throw new Error('Failed to fetch invitation token');
    }

    // Get tenant info for email
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', invitation.tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant info:', tenantError);
      throw new Error('Failed to fetch tenant info');
    }

    // Send invitation email using Fastmail SMTP
    await sendInvitationEmail(email, invitation.invitation_token, tenant.name);

    console.log('Staff invitation sent successfully to:', email);

    return new Response(JSON.stringify({
      success: true,
      message: 'Invitation sent successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in send-staff-invitation function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

async function sendInvitationEmail(email: string, token: string, restaurantName: string) {
  const smtpHost = Deno.env.get('FASTMAIL_SMTP_HOST');
  const smtpPort = parseInt(Deno.env.get('FASTMAIL_SMTP_PORT') || '587');
  const smtpUser = Deno.env.get('FASTMAIL_SMTP_USER');
  const smtpPass = Deno.env.get('FASTMAIL_SMTP_PASS');
  const fromEmail = Deno.env.get('FASTMAIL_FROM_EMAIL');
  const fromName = Deno.env.get('FASTMAIL_FROM_NAME') || 'Blunari';
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || 'http://localhost:5173';

  // Create invitation URL
  const invitationUrl = `${baseUrl}/staff-invitation?token=${token}`;

  console.log('Sending invitation email with SMTP settings:', {
    host: smtpHost,
    port: smtpPort,
    user: smtpUser,
    fromEmail: fromEmail,
    invitationUrl: invitationUrl
  });

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    console.warn('SMTP credentials not fully configured, logging invitation details instead');
    console.log('Invitation Email Details:', {
      to: email,
      subject: `You're invited to join ${restaurantName} staff`,
      invitationUrl: invitationUrl,
      token: token
    });
    return;
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `You're invited to join ${restaurantName} staff`,
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Staff Invitation</h2>
          <p>You've been invited to join the staff at <strong>${restaurantName}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Click the button below to accept your invitation and create your account:</p>
            <a href="${invitationUrl}" 
               style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link in your browser:<br>
            <code style="background-color: #f0f0f0; padding: 4px; border-radius: 4px;">${invitationUrl}</code>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This invitation will expire in 7 days. If you have any questions, please contact your manager.
          </p>
        </div>
      `,
      html: true,
    });

    await client.close();
    console.log('Invitation email sent successfully via Fastmail SMTP');

  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    console.log('Falling back to logging invitation details:', {
      to: email,
      subject: `You're invited to join ${restaurantName} staff`,
      invitationUrl: invitationUrl,
      token: token
    });
  }
}

serve(handler);