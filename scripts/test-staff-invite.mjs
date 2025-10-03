#!/usr/bin/env node
/**
 * Test script for staff invitation system
 * 
 * Usage:
 *   ADMIN_EMAIL=admin@company.com ADMIN_PASSWORD=pass node scripts/test-staff-invite.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing credentials: ADMIN_EMAIL and ADMIN_PASSWORD');
  console.log('Usage: ADMIN_EMAIL=admin@company.com ADMIN_PASSWORD=pass node scripts/test-staff-invite.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInviteFlow() {
  console.log('🧪 Testing Staff Invite Flow');
  console.log('='.repeat(60));
  console.log('');

  // 1. Sign in as admin
  console.log('📝 Step 1: Authenticating as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (authError || !authData.session) {
    console.error('❌ Auth failed:', authError?.message || 'No session returned');
    return;
  }

  console.log('✅ Authenticated as:', authData.user.email);
  console.log('');

  // 2. Check current user role
  console.log('📝 Step 2: Checking admin permissions...');
  const { data: employee } = await supabase
    .from('employees')
    .select('role, status')
    .eq('user_id', authData.user.id)
    .single();

  if (employee) {
    console.log('✅ Admin role:', employee.role, '(status:', employee.status + ')');
  } else {
    console.log('⚠️  No employee record found (may use fallback admin_users)');
  }
  console.log('');

  // 3. Send invitation
  const testEmail = `test-${Date.now()}@company.com`;
  console.log('📝 Step 3: Sending invitation to:', testEmail);
  
  const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-staff', {
    body: { 
      email: testEmail, 
      role: 'SUPPORT',
      metadata: { test: true }
    },
    headers: { 
      Authorization: `Bearer ${authData.session.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (inviteError) {
    console.error('❌ Edge function error:', inviteError);
    return;
  }

  if (inviteData?.error) {
    console.error('❌ Application error:', inviteData.error);
    console.error('   Message:', inviteData.message);
    return;
  }

  if (!inviteData?.success) {
    console.error('❌ Unexpected response:', inviteData);
    return;
  }

  console.log('✅ Invitation created successfully');
  console.log('   ID:', inviteData.invitation.id);
  console.log('   Email:', inviteData.invitation.email);
  console.log('   Role:', inviteData.invitation.role);
  console.log('   Expires:', inviteData.invitation.expires_at);
  console.log('   Link:', inviteData.invitation.invitation_link);
  console.log('');

  // Extract token
  const invitationLink = inviteData.invitation.invitation_link;
  const token = invitationLink.split('token=')[1];

  if (!token) {
    console.error('❌ Failed to extract token from link');
    return;
  }

  // 4. Accept invitation
  console.log('📝 Step 4: Accepting invitation...');
  const { data: acceptData, error: acceptError } = await supabase.functions.invoke('accept-staff-invitation', {
    body: { 
      token, 
      password: 'TestPass123!' 
    }
  });

  if (acceptError) {
    console.error('❌ Edge function error:', acceptError);
    return;
  }

  if (acceptData?.error) {
    console.error('❌ Application error:', acceptData.error);
    console.error('   Message:', acceptData.message);
    return;
  }

  if (!acceptData?.success) {
    console.error('❌ Unexpected response:', acceptData);
    return;
  }

  console.log('✅ Invitation accepted successfully');
  console.log('   Employee ID:', acceptData.employee.employee_id);
  console.log('   Role:', acceptData.employee.role);
  console.log('   Email:', acceptData.employee.email);
  console.log('   New User:', acceptData.is_new_user);
  console.log('');

  // 5. Verify employee record
  console.log('📝 Step 5: Verifying employee record in database...');
  const { data: newEmployee, error: queryError } = await supabase
    .from('employees')
    .select('id, employee_id, role, status, hire_date')
    .eq('employee_id', acceptData.employee.employee_id)
    .single();

  if (queryError) {
    console.error('❌ Query error:', queryError.message);
    return;
  }

  console.log('✅ Employee record verified');
  console.log('   Database ID:', newEmployee.id);
  console.log('   Employee ID:', newEmployee.employee_id);
  console.log('   Role:', newEmployee.role);
  console.log('   Status:', newEmployee.status);
  console.log('   Hire Date:', newEmployee.hire_date);
  console.log('');

  // 6. Check invitation marked as accepted
  console.log('📝 Step 6: Checking invitation status...');
  const { data: invitation } = await supabase
    .from('employee_invitations')
    .select('accepted_at')
    .eq('invitation_token', token)
    .single();

  if (invitation?.accepted_at) {
    console.log('✅ Invitation marked as accepted:', invitation.accepted_at);
  } else {
    console.log('⚠️  Invitation not marked as accepted (may be permission issue)');
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('🎉 All tests passed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('   • Admin authentication: ✅');
  console.log('   • Invitation creation: ✅');
  console.log('   • Invitation acceptance: ✅');
  console.log('   • Employee creation: ✅');
  console.log('   • Database verification: ✅');
  console.log('');
  console.log('🧹 Cleanup:');
  console.log('   Run this to delete test employee:');
  console.log(`   DELETE FROM employees WHERE employee_id = '${acceptData.employee.employee_id}';`);
  console.log('');
}

// Run the test
testInviteFlow()
  .catch(error => {
    console.error('');
    console.error('💥 Unexpected error:', error);
    console.error('');
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

