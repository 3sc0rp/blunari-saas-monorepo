/**
 * Email Service Module
 * 
 * Provides email sending capabilities using multiple providers:
 * - SendGrid
 * - Resend
 * - Mailgun
 * - SMTP fallback
 * 
 * Configure via environment variables:
 * - EMAIL_PROVIDER: 'sendgrid' | 'resend' | 'mailgun' | 'smtp'
 * - SENDGRID_API_KEY
 * - RESEND_API_KEY
 * - MAILGUN_API_KEY / MAILGUN_DOMAIN
 * - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
 * - EMAIL_FROM: Default sender email
 * - EMAIL_FROM_NAME: Default sender name
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using SendGrid
 */
async function sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'SendGrid API key not configured' };
  }

  const from = options.from || Deno.env.get('EMAIL_FROM') || 'noreply@blunari.ai';
  const fromName = options.fromName || Deno.env.get('EMAIL_FROM_NAME') || 'Blunari';

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: Array.isArray(options.to) 
            ? options.to.map(email => ({ email }))
            : [{ email: options.to }],
          cc: options.cc?.map(email => ({ email })),
          bcc: options.bcc?.map(email => ({ email })),
        }],
        from: {
          email: from,
          name: fromName,
        },
        reply_to: options.replyTo ? { email: options.replyTo } : undefined,
        subject: options.subject,
        content: [
          options.html ? { type: 'text/html', value: options.html } : undefined,
          options.text ? { type: 'text/plain', value: options.text } : undefined,
        ].filter(Boolean),
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType || 'application/octet-stream',
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SendGrid] Error:', errorText);
      return { success: false, error: `SendGrid API error: ${response.status}` };
    }

    const messageId = response.headers.get('X-Message-Id');
    return { success: true, messageId: messageId || undefined };
  } catch (error) {
    console.error('[SendGrid] Exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send email using Resend
 */
async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'Resend API key not configured' };
  }

  const from = options.from || Deno.env.get('EMAIL_FROM') || 'noreply@blunari.ai';
  const fromName = options.fromName || Deno.env.get('EMAIL_FROM_NAME') || 'Blunari';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromName ? `${fromName} <${from}>` : from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Resend] Error:', data);
      return { success: false, error: data.message || `Resend API error: ${response.status}` };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[Resend] Exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send email using Mailgun
 */
async function sendWithMailgun(options: EmailOptions): Promise<EmailResult> {
  const apiKey = Deno.env.get('MAILGUN_API_KEY');
  const domain = Deno.env.get('MAILGUN_DOMAIN');
  
  if (!apiKey || !domain) {
    return { success: false, error: 'Mailgun API key or domain not configured' };
  }

  const from = options.from || Deno.env.get('EMAIL_FROM') || 'noreply@blunari.ai';
  const fromName = options.fromName || Deno.env.get('EMAIL_FROM_NAME') || 'Blunari';

  try {
    const formData = new FormData();
    formData.append('from', fromName ? `${fromName} <${from}>` : from);
    formData.append('to', Array.isArray(options.to) ? options.to.join(',') : options.to);
    formData.append('subject', options.subject);
    if (options.html) formData.append('html', options.html);
    if (options.text) formData.append('text', options.text);
    if (options.replyTo) formData.append('h:Reply-To', options.replyTo);
    if (options.cc) formData.append('cc', options.cc.join(','));
    if (options.bcc) formData.append('bcc', options.bcc.join(','));

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Mailgun] Error:', data);
      return { success: false, error: data.message || `Mailgun API error: ${response.status}` };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[Mailgun] Exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Main email sending function
 * Automatically selects provider based on EMAIL_PROVIDER env var
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Validate required fields
  if (!options.to || !options.subject || (!options.html && !options.text)) {
    return {
      success: false,
      error: 'Missing required fields: to, subject, and html or text',
    };
  }

  const provider = Deno.env.get('EMAIL_PROVIDER')?.toLowerCase() || 'resend';

  console.log(`[EmailService] Sending email via ${provider} to ${options.to}`);

  let result: EmailResult;

  switch (provider) {
    case 'sendgrid':
      result = await sendWithSendGrid(options);
      break;
    case 'resend':
      result = await sendWithResend(options);
      break;
    case 'mailgun':
      result = await sendWithMailgun(options);
      break;
    default:
      result = { success: false, error: `Unknown email provider: ${provider}` };
  }

  if (result.success) {
    console.log(`[EmailService] Email sent successfully. Message ID: ${result.messageId}`);
  } else {
    console.error(`[EmailService] Email failed:`, result.error);
  }

  return result;
}

/**
 * Email template for staff invitation
 */
export function createStaffInvitationEmail(
  email: string,
  role: string,
  invitationLink: string,
  inviterName?: string
): { subject: string; html: string; text: string } {
  const subject = `You're invited to join Blunari as ${role}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .role-badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 600;
      margin: 10px 0;
    }
    .cta-button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      background: #f7f7f7;
      padding: 20px;
      border-radius: 0 0 8px 8px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .link-fallback {
      margin-top: 20px;
      padding: 15px;
      background: #f0f0f0;
      border-radius: 4px;
      word-break: break-all;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">🎉 You're Invited!</h1>
  </div>
  <div class="content">
    <p>Hello!</p>
    
    <p>${inviterName ? `<strong>${inviterName}</strong> has` : 'You have been'} invited you to join the Blunari team as:</p>
    
    <div style="text-align: center;">
      <span class="role-badge">${role}</span>
    </div>
    
    <p>Blunari is a multi-tenant restaurant booking SaaS platform. As a staff member, you'll have access to internal tools and dashboards to manage the platform.</p>
    
    <p><strong>What's next?</strong></p>
    <ol>
      <li>Click the button below to accept your invitation</li>
      <li>Set up your password and complete your profile</li>
      <li>Start using the admin dashboard</li>
    </ol>
    
    <div style="text-align: center;">
      <a href="${invitationLink}" class="cta-button">
        Accept Invitation
      </a>
    </div>
    
    <div class="link-fallback">
      <strong>Link not working?</strong> Copy and paste this URL into your browser:<br>
      <span style="color: #667eea;">${invitationLink}</span>
    </div>
    
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      <strong>Note:</strong> This invitation will expire in 7 days. If you have any questions, please contact your administrator.
    </p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} Blunari. All rights reserved.</p>
    <p>This is an automated email. Please do not reply to this message.</p>
  </div>
</body>
</html>
  `;

  const text = `
You're invited to join Blunari!

${inviterName ? `${inviterName} has` : 'You have been'} invited you to join the Blunari team as ${role}.

Blunari is a multi-tenant restaurant booking SaaS platform. As a staff member, you'll have access to internal tools and dashboards to manage the platform.

What's next?
1. Click the link below to accept your invitation
2. Set up your password and complete your profile
3. Start using the admin dashboard

Accept your invitation:
${invitationLink}

Note: This invitation will expire in 7 days. If you have any questions, please contact your administrator.

---
© ${new Date().getFullYear()} Blunari. All rights reserved.
This is an automated email. Please do not reply to this message.
  `.trim();

  return { subject, html, text };
}

/**
 * Send staff invitation email
 */
export async function sendStaffInvitationEmail(
  email: string,
  role: string,
  invitationLink: string,
  inviterName?: string
): Promise<EmailResult> {
  const { subject, html, text } = createStaffInvitationEmail(email, role, invitationLink, inviterName);

  return await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

