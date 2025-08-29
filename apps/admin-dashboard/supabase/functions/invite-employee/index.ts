import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface InviteEmployeeRequest {
  email: string;
  role: string;
  department_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user has permission to invite employees (ADMIN or SUPER_ADMIN)
    const { data: currentEmployee, error: employeeError } = await supabase
      .from('employees')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .single();

    if (employeeError || !currentEmployee) {
      throw new Error('Employee record not found');
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(currentEmployee.role)) {
      throw new Error('Insufficient permissions');
    }

    const { email, role, department_id }: InviteEmployeeRequest = await req.json();

    // Validate input
    if (!email || !role) {
      throw new Error('Email and role are required');
    }

    const validRoles = ['VIEWER', 'OPS', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
    if (existingUser.user) {
      throw new Error('User with this email already exists');
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Get current employee ID for invited_by
    const { data: inviterEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Create invitation record
    const { error: inviteError } = await supabase
      .from('employee_invitations')
      .insert({
        email,
        role,
        department_id: department_id || null,
        invited_by: inviterEmployee?.id,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString()
      });

    if (inviteError) {
      throw inviteError;
    }

    // Generate employee ID
    const employeeIdPrefix = role.substring(0, 2).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const employeeId = `${employeeIdPrefix}${randomNum}`;

    // Create user account with temporary password
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        invited: true,
        role,
        employee_id: employeeId
      }
    });

    if (createUserError) {
      throw createUserError;
    }

    // Create employee record
    const { error: employeeCreateError } = await supabase
      .from('employees')
      .insert({
        user_id: newUser.user.id,
        employee_id: employeeId,
        role,
        status: 'PENDING',
        department_id: department_id || null,
        hire_date: new Date().toISOString().split('T')[0]
      });

    if (employeeCreateError) {
      // Cleanup: delete the user if employee creation fails
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw employeeCreateError;
    }

    // Send invitation email
    try {
      // Get inviter's profile info
      const { data: inviterProfile } = await supabase.auth.admin.getUserById(user.id)
      const inviterName = inviterProfile.user?.user_metadata?.full_name || 
                         `${inviterProfile.user?.user_metadata?.first_name || 'Team'} ${inviterProfile.user?.user_metadata?.last_name || 'Member'}`

      const emailResult = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: email,
          inviterName: inviterName,
          role: role,
          invitationToken: invitationToken,
          companyName: 'Blunari Admin',
          acceptUrl: `${req.headers.get('origin') || 'http://localhost:5173'}/auth?invitation=${invitationToken}`
        }
      })

      if (emailResult.error) {
        console.warn('Failed to send invitation email:', emailResult.error)
      } else {
        console.log('✅ Invitation email sent successfully')
      }
    } catch (emailError) {
      console.warn('Invitation email error (non-blocking):', emailError)
    }

    // Send password reset email (this will allow them to set their password)
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/auth?invitation=${invitationToken}`
      }
    });

    if (resetError) {
      console.error('Error sending reset email:', resetError);
      // Don't throw here, the user is created successfully
    }

    // Log the activity
    await supabase.rpc('log_employee_activity', {
      p_action: 'employee_invited',
      p_resource_type: 'employee',
      p_resource_id: newUser.user.id,
      p_details: {
        invited_email: email,
        role,
        department_id,
        employee_id: employeeId
      }
    });

    console.log(`Successfully invited employee: ${email} with role: ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Employee invitation sent successfully to ${email}`,
        employee_id: employeeId,
        email: email
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in invite-employee function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);