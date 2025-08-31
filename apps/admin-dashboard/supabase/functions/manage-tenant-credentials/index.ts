import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CredentialUpdateRequest {
  tenantId: string;
  action: 'update_email' | 'update_password' | 'generate_password' | 'reset_password';
  newEmail?: string;
  newPassword?: string;
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const generateSecurePassword = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, action, newEmail, newPassword }: CredentialUpdateRequest = await req.json();

    console.log(`[CREDENTIALS] Starting ${action} for tenant ${tenantId}`);

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log(`[CREDENTIALS] User ${user.email} attempting ${action}`);

    // Check if user has admin privileges - check both employee role and profile role
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    // Also check profiles table for role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = employee?.role || profile?.role;
    const hasAdminAccess = employee && ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(employee.role) ||
                          profile && ['owner', 'admin'].includes(profile.role);

    if (!hasAdminAccess) {
      console.error('Insufficient privileges. Employee role:', employee?.role, 'Profile role:', profile?.role);
      throw new Error('Insufficient privileges');
    }

    console.log(`[CREDENTIALS] User has access. Employee role: ${employee?.role}, Profile role: ${profile?.role}`);

    // Get tenant owner user ID - try auto_provisioning first, then fallback to tenant email
    let tenantOwnerId: string | null = null;
    let ownerEmail: string | null = null;

    // First try to get from auto_provisioning
    const { data: provisioning } = await supabaseAdmin
      .from('auto_provisioning')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .maybeSingle();

    if (provisioning) {
      tenantOwnerId = provisioning.user_id;
      console.log(`[CREDENTIALS] Found provisioning record for user ${tenantOwnerId}`);
    } else {
      // Fallback: look for tenant email and find matching user
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('email')
        .eq('id', tenantId)
        .single();

      if (!tenant?.email) {
        throw new Error('No tenant owner found. Tenant has no email and no provisioning record.');
      }

      // Find user by email
      const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) throw userError;

      const matchingUser = authUser.users.find(u => u.email === tenant.email);
      if (!matchingUser) {
        throw new Error(`No user found with email ${tenant.email}`);
      }

      tenantOwnerId = matchingUser.id;
      ownerEmail = tenant.email;
      console.log(`[CREDENTIALS] Found tenant owner via email lookup: ${ownerEmail}`);
    }

    if (!tenantOwnerId) {
      throw new Error('Could not determine tenant owner');
    }

    let result: any = {};

    switch (action) {
      case 'update_email':
        if (!newEmail) throw new Error('New email required');
        
        // Update user email in Supabase Auth
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
          tenantOwnerId,
          { email: newEmail }
        );

        if (emailError) throw emailError;

        // Update profiles table
        await supabaseAdmin
          .from('profiles')
          .update({ email: newEmail })
          .eq('id', tenantOwnerId);

        result = { message: 'Email updated successfully', newEmail };
        break;

      case 'update_password':
        if (!newPassword) throw new Error('New password required');
        
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          tenantOwnerId,
          { password: newPassword }
        );

        if (passwordError) throw passwordError;

        result = { message: 'Password updated successfully' };
        break;

      case 'generate_password':
        const generatedPassword = generateSecurePassword();
        
        const { error: genError } = await supabaseAdmin.auth.admin.updateUserById(
          tenantOwnerId,
          { password: generatedPassword }
        );

        if (genError) throw genError;

        result = { 
          message: 'New password generated successfully', 
          newPassword: generatedPassword 
        };
        break;

      case 'reset_password':
        // Get user email first
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', tenantOwnerId)
          .single();

        if (!userProfile?.email) throw new Error('User email not found');

        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: userProfile.email,
        });

        if (resetError) throw resetError;

        result = { message: 'Password reset email sent successfully' };
        break;

      default:
        throw new Error('Invalid action');
    }

    // Log the action for audit purposes
    await supabaseAdmin.from('security_events').insert({
      event_type: 'credential_change',
      severity: 'high',
      user_id: tenantOwnerId,
      event_data: {
        action,
        tenant_id: tenantId,
        changed_by: user.id,
        changed_by_email: user.email,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Credential action completed: ${action} for tenant ${tenantId} by ${user.email}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in manage-tenant-credentials:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);