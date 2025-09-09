import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createCorsHeaders } from "../_shared/cors";

interface TenantWelcomeEmailRequest {
  ownerName: string;
  ownerEmail: string;
  restaurantName: string;
  loginUrl?: string;
  includeCredentials?: boolean;
  temporaryPassword?: string;
  restaurantType?: string;
  adminName?: string;
  customMessage?: string;
  locale?: string;
}

interface EmailTemplateData {
  ownerName: string;
  restaurantName: string;
  loginUrl: string;
  credentialsSection: string;
  restaurantType: string;
  brandLogoUrl: string;
  currentYear: number;
  customMessage?: string;
  locale: string;
}

// Enhanced validation schemas
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push("Password must be at least 8 characters long");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
  if (!/\d/.test(password)) errors.push("Password must contain at least one number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("Password must contain at least one special character");
  
  return { valid: errors.length === 0, errors };
};

const sanitizeInput = (input: string): string => {
  return input.replace(/[<>'"&]/g, (match) => {
    const entities: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#x27;',
      '"': '&quot;',
      '&': '&amp;'
    };
    return entities[match];
  });
};

// Internationalization support
const getLocalizedContent = (locale: string = 'en') => {
  const content: { [key: string]: any } = {
    en: {
      subject: "🎉 Welcome to Blunari - {{restaurantName}} is Ready!",
      welcome: "Welcome to Blunari!",
      subtitle: "Your restaurant management platform",
      greeting: "Hello {{ownerName}}! 👋",
      congratulations: "Congratulations! Your {{restaurantType}} <strong>{{restaurantName}}</strong> has been successfully set up on Blunari. You're all ready to start managing your restaurant operations with our powerful platform.",
      credentialsTitle: "🔐 Your Login Credentials",
      credentialsWarning: "⚠️ Please change your password after your first login for security.",
      getStartedTitle: "🚀 Ready to Get Started?",
      getStartedText: "Access your dashboard and start configuring your restaurant",
      dashboardButton: "Open Dashboard →",
      nextStepsTitle: "🎯 What's Next?",
      nextSteps: [
        "✅ Set up your restaurant profile and settings",
        "🍽️ Configure your dining tables and seating",
        "📅 Customize your booking preferences",
        "🎨 Brand your booking widget",
        "📊 Explore analytics and reports",
        "🔔 Set up notifications and alerts"
      ],
      helpTitle: "💬 Need Help?",
      helpText: "Our support team is here to help you every step of the way. Contact us anytime at <a href=\"mailto:support@blunari.ai\" style=\"color: #2563eb;\">support@blunari.ai</a> or through the help center in your dashboard.",
      thankYou: "Thank you for choosing Blunari! 🙏",
      copyright: "© {{year}} Blunari. All rights reserved.",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service"
    },
    es: {
      subject: "🎉 Bienvenido a Blunari - ¡{{restaurantName}} está listo!",
      welcome: "¡Bienvenido a Blunari!",
      subtitle: "Tu plataforma de gestión de restaurantes",
      greeting: "¡Hola {{ownerName}}! 👋",
      congratulations: "¡Felicidades! Tu {{restaurantType}} <strong>{{restaurantName}}</strong> ha sido configurado exitosamente en Blunari. Estás listo para comenzar a gestionar las operaciones de tu restaurante con nuestra poderosa plataforma.",
      // ... add more Spanish translations
    }
    // Add more locales as needed
  };
  
  return content[locale] || content['en'];
};

const generateEmailTemplate = (data: EmailTemplateData): string => {
  const localizedContent = getLocalizedContent(data.locale);
  
  const template = `
    <!DOCTYPE html>
    <html lang="${data.locale}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Welcome to Blunari</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; padding: 10px !important; }
          .header { padding: 20px 0 !important; }
          .content { padding: 20px 0 !important; }
          .button { padding: 10px 24px !important; font-size: 14px !important; }
          .credentials-box { margin: 16px 0 !important; padding: 16px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f7fafc;">
      <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div class="header" style="text-align: center; padding: 40px 0; border-bottom: 2px solid #e2e8f0;">
          ${data.brandLogoUrl ? `<img src="${data.brandLogoUrl}" alt="Blunari" style="height: 50px; margin-bottom: 16px; max-width: 200px;" />` : ``}
          <h1 style="color: #1a365d; margin: 0; font-size: 32px; font-weight: 700;">${localizedContent.welcome}</h1>
          <p style="color: #4a5568; margin: 12px 0 0 0; font-size: 18px;">${localizedContent.subtitle}</p>
        </div>

        <!-- Main Content -->
        <div class="content" style="padding: 40px 0;">
          <h2 style="color: #2d3748; font-size: 24px; margin-bottom: 20px;">
            ${localizedContent.greeting.replace('{{ownerName}}', data.ownerName)}
          </h2>
          
          <p style="font-size: 16px; margin-bottom: 20px; color: #4a5568;">
            ${localizedContent.congratulations
              .replace('{{restaurantType}}', data.restaurantType)
              .replace('{{restaurantName}}', data.restaurantName)}
          </p>

          ${data.customMessage ? `
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #0369a1; margin: 0 0 12px 0; font-size: 16px;">📝 Personal Message</h3>
              <p style="margin: 0; color: #4a5568; font-style: italic;">"${data.customMessage}"</p>
            </div>
          ` : ''}

          ${data.credentialsSection}

          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin: 32px 0; color: white; text-align: center;">
            <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">${localizedContent.getStartedTitle}</h3>
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px 0;">
              ${localizedContent.getStartedText}
            </p>
            <a href="${data.loginUrl}" class="button" style="display: inline-block; background-color: white; color: #667eea; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 8px; transition: all 0.3s ease;">
              ${localizedContent.dashboardButton}
            </a>
          </div>

          <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #2b6cb0; margin: 0 0 15px 0; font-size: 18px;">${localizedContent.nextStepsTitle}</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
              ${localizedContent.nextSteps.map((step: string) => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
            </ul>
          </div>

          <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">${localizedContent.helpTitle}</h3>
            <p style="margin: 0; color: #4a5568; font-size: 14px;">
              ${localizedContent.helpText}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
          <p style="margin: 0 0 10px 0;">${localizedContent.thankYou}</p>
          <p style="margin: 0;">${localizedContent.copyright.replace('{{year}}', data.currentYear.toString())}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            <a href="https://blunari.ai/privacy" style="color: #718096; text-decoration: none;">${localizedContent.privacyPolicy}</a> | 
            <a href="https://blunari.ai/terms" style="color: #718096; text-decoration: none;">${localizedContent.termsOfService}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return template;
};

const createCredentialsSection = (email: string, password: string, locale: string = 'en'): string => {
  const localizedContent = getLocalizedContent(locale);
  
  return `
    <div class="credentials-box" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #2b6cb0; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center;">
        ${localizedContent.credentialsTitle}
      </h3>
      <div style="background: white; border-radius: 6px; padding: 16px; margin: 12px 0;">
        <p style="margin: 0 0 12px 0; color: #4a5568;">
          <strong>Email:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${email}</span><br>
          <strong>Temporary Password:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; letter-spacing: 1px;">${password}</span>
        </p>
      </div>
      <p style="margin: 0; color: #dc3545; font-size: 14px;">
        ${localizedContent.credentialsWarning}
      </p>
    </div>
  `;
};

const logEmailActivity = (type: 'success' | 'error' | 'warning', data: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    function: 'send-tenant-welcome-email',
    ...data
  };
  
  console.log(JSON.stringify(logEntry));
};

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: createCorsHeaders(req.headers.get("Origin")) 
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed. Only POST requests are accepted.",
        success: false,
      }),
      {
        status: 405,
        headers: { 
          "Content-Type": "application/json", 
          "Allow": "POST",
          ...createCorsHeaders(req.headers.get("Origin")) 
        },
      },
    );
  }

  try {
    let requestData: TenantWelcomeEmailRequest;

    // Enhanced request parsing with size limit
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024) { // 10KB limit
      return new Response(
        JSON.stringify({
          error: "Request too large. Maximum size is 10KB.",
          success: false,
        }),
        {
          status: 413,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    try {
      const rawBody = await req.text();
      requestData = JSON.parse(rawBody);
    } catch (parseError) {
      logEmailActivity('error', { requestId, error: 'Invalid JSON in request body', details: parseError });
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    const { 
      ownerName, 
      ownerEmail, 
      restaurantName, 
      loginUrl, 
      includeCredentials, 
      temporaryPassword,
      restaurantType = 'restaurant',
      adminName,
      customMessage,
      locale = 'en'
    } = requestData;

    // Enhanced validation
    const validationErrors: string[] = [];
    
    if (!ownerName?.trim() || ownerName.length > 100) {
      validationErrors.push("Owner name is required and must be less than 100 characters");
    }
    
    if (!ownerEmail?.trim() || !validateEmail(ownerEmail)) {
      validationErrors.push("Valid email address is required");
    }
    
    if (!restaurantName?.trim() || restaurantName.length > 100) {
      validationErrors.push("Restaurant name is required and must be less than 100 characters");
    }

    if (includeCredentials && temporaryPassword) {
      const passwordValidation = validatePassword(temporaryPassword);
      if (!passwordValidation.valid) {
        validationErrors.push(...passwordValidation.errors);
      }
    }

    if (loginUrl && !loginUrl.match(/^https?:\/\/.+/)) {
      validationErrors.push("Login URL must be a valid HTTP/HTTPS URL");
    }

    if (validationErrors.length > 0) {
      logEmailActivity('error', { 
        requestId, 
        error: 'Validation failed', 
        details: validationErrors,
        ownerEmail: ownerEmail || 'not provided'
      });
      
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationErrors,
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      ownerName: sanitizeInput(ownerName.trim()),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      restaurantName: sanitizeInput(restaurantName.trim()),
      restaurantType: sanitizeInput(restaurantType.trim()),
      adminName: adminName ? sanitizeInput(adminName.trim()) : undefined,
      customMessage: customMessage ? sanitizeInput(customMessage.trim()) : undefined,
      locale: locale.toLowerCase()
    };

    logEmailActivity('info', {
      requestId,
      message: 'Processing welcome email request',
      ownerEmail: sanitizedData.ownerEmail,
      restaurantName: sanitizedData.restaurantName,
      includeCredentials: !!includeCredentials,
      locale: sanitizedData.locale
    });

    // Environment configuration with fallbacks
    const config = {
      brandLogoUrl: Deno.env.get("BRAND_LOGO_URL") || Deno.env.get("ADMIN_LOGO_URL"),
      defaultLoginUrl: "https://app.blunari.ai/auth",
      smtpHost: Deno.env.get("FASTMAIL_SMTP_HOST") || "smtp.fastmail.com",
      smtpPort: parseInt(Deno.env.get("FASTMAIL_SMTP_PORT") || "587"),
      smtpUsername: Deno.env.get("FASTMAIL_SMTP_USERNAME"),
      smtpPassword: Deno.env.get("FASTMAIL_SMTP_PASSWORD"),
      fromEmail: Deno.env.get("FROM_EMAIL") || "Blunari Team <no-reply@blunari.ai>",
      isDevelopment: Deno.env.get("ENVIRONMENT") === "development"
    };

    const finalLoginUrl = loginUrl || config.defaultLoginUrl;

    // Check SMTP configuration
    if (!config.smtpUsername || !config.smtpPassword) {
      logEmailActivity('warning', {
        requestId,
        warning: 'SMTP credentials not configured',
        isDevelopment: config.isDevelopment
      });

      return new Response(
        JSON.stringify({
          success: !config.isDevelopment,
          error: config.isDevelopment ? "SMTP credentials missing in development" : undefined,
          warning: "Email sending skipped - SMTP not configured",
        }),
        {
          status: config.isDevelopment ? 500 : 200,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    // Initialize SMTP client with connection pooling
    const smtp = new SMTPClient({
      connection: {
        hostname: config.smtpHost,
        port: config.smtpPort,
        tls: true,
        auth: {
          username: config.smtpUsername,
          password: config.smtpPassword,
        },
      },
    });

    // Generate email content
    const credentialsSection = (includeCredentials && temporaryPassword) 
      ? createCredentialsSection(sanitizedData.ownerEmail, temporaryPassword, sanitizedData.locale)
      : '';

    const emailTemplateData: EmailTemplateData = {
      ownerName: sanitizedData.ownerName,
      restaurantName: sanitizedData.restaurantName,
      loginUrl: finalLoginUrl,
      credentialsSection,
      restaurantType: sanitizedData.restaurantType,
      brandLogoUrl: config.brandLogoUrl || '',
      currentYear: new Date().getFullYear(),
      customMessage: sanitizedData.customMessage,
      locale: sanitizedData.locale
    };

    const localizedContent = getLocalizedContent(sanitizedData.locale);
    const emailHtml = generateEmailTemplate(emailTemplateData);
    const subject = localizedContent.subject.replace('{{restaurantName}}', sanitizedData.restaurantName);

    // Send email with timeout
    const emailPromise = smtp.send({
      from: config.fromEmail,
      to: sanitizedData.ownerEmail,
      subject: subject,
      html: emailHtml,
    });

    // Set timeout for email sending (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timed out')), 30000);
    });

    const emailResponse = await Promise.race([emailPromise, timeoutPromise]);

    logEmailActivity('success', {
      requestId,
      message: 'Welcome email sent successfully',
      ownerEmail: sanitizedData.ownerEmail,
      restaurantName: sanitizedData.restaurantName,
      locale: sanitizedData.locale
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tenant welcome email sent successfully",
        requestId,
        data: {
          emailSent: true,
          recipient: sanitizedData.ownerEmail,
          locale: sanitizedData.locale
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...createCorsHeaders(req.headers.get("Origin")),
        },
      },
    );

  } catch (error: any) {
    logEmailActivity('error', {
      requestId,
      error: 'Function execution failed',
      details: error.message,
      stack: error.stack
    });

    // Enhanced error handling with specific error types
    let status = 500;
    let errorMessage = "Failed to send tenant welcome email";

    if (error.name === "SMTPError" || error.message?.includes("SMTP")) {
      errorMessage = "Email service temporarily unavailable";
      status = 503;
    } else if (error.message?.includes("timeout") || error.message?.includes("timed out")) {
      errorMessage = "Email sending timed out - please try again";
      status = 408;
    } else if (error.message?.includes("DNS") || error.message?.includes("network")) {
      errorMessage = "Network connectivity issue";
      status = 503;
    } else if (error.message?.includes("authentication")) {
      errorMessage = "Email service authentication failed";
      status = 503;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        requestId,
        details: Deno.env.get("ENVIRONMENT") === "development" ? error.message : undefined,
      }),
      {
        status,
        headers: { 
          "Content-Type": "application/json", 
          ...createCorsHeaders(req.headers.get("Origin")) 
        },
      },
    );
  }
};

serve(handler);