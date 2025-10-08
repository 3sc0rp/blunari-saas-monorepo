import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testTenantProvisioning() {
  console.log('🧪 Testing Tenant Provisioning Edge Function\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Sign in as admin
    console.log('\n📋 Step 1: Authenticating as admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@blunari.ai',
      password: 'admin123'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('\n💡 Tip: Make sure the admin credentials are correct.');
      console.log('   Email: admin@blunari.ai');
      console.log('   Password: admin123');
      return;
    }

    console.log('✅ Authenticated successfully');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);

    // Step 2: Check employee record
    console.log('\n📋 Step 2: Checking employee authorization...');
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, email, role, status, first_name, last_name')
      .eq('user_id', authData.user.id)
      .single();

    if (empError) {
      console.error('❌ Failed to fetch employee record:', empError.message);
      console.log('\n💡 The user may not be registered as an employee.');
      return;
    }

    console.log('✅ Employee record found');
    console.log('   Name:', employee.first_name, employee.last_name);
    console.log('   Email:', employee.email);
    console.log('   Role:', employee.role);
    console.log('   Status:', employee.status);

    // Check authorization
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(employee.role);
    const isActive = employee.status === 'ACTIVE';

    console.log('\n🔐 Authorization Check:');
    console.log('   Is Admin?', isAdmin ? '✅ YES' : '❌ NO');
    console.log('   Is Active?', isActive ? '✅ YES' : '❌ NO');

    if (!isAdmin || !isActive) {
      console.error('\n❌ User does not have sufficient permissions');
      console.log('   Required: SUPER_ADMIN or ADMIN role, ACTIVE status');
      return;
    }

    // Step 3: Prepare test data
    console.log('\n📋 Step 3: Preparing test tenant data...');
    const testSlug = `test-${Date.now()}`;
    const testEmail = `owner-${testSlug}@example.com`;
    
    const requestBody = {
      basics: {
        name: 'Test Restaurant ' + Date.now(),
        slug: testSlug,
        timezone: 'America/New_York',
        currency: 'USD',
        description: 'Automated test restaurant for edge function validation',
        email: 'contact@test-restaurant.com',
        phone: '+1-555-0123',
        website: 'https://test-restaurant.com',
        address: {
          street: '123 Test Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      owner: {
        email: testEmail
      },
      idempotencyKey: crypto.randomUUID()
    };

    console.log('✅ Test data prepared');
    console.log('   Restaurant Name:', requestBody.basics.name);
    console.log('   Slug:', requestBody.basics.slug);
    console.log('   Owner Email:', requestBody.owner.email);
    console.log('   Idempotency Key:', requestBody.idempotencyKey);

    // Step 4: Call edge function
    console.log('\n📋 Step 4: Calling tenant-provisioning edge function...');
    console.log('   Endpoint: /functions/v1/tenant-provisioning');
    console.log('   Method: POST');
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('tenant-provisioning', {
      body: requestBody
    });
    const duration = Date.now() - startTime;

    if (error) {
      console.error('\n❌ Edge function returned an error:');
      console.error('   Status:', error.status || 'Unknown');
      console.error('   Message:', error.message || 'No message');
      console.error('   Context:', error.context || 'No context');
      console.log('\n📋 Response Data:', JSON.stringify(data, null, 2));
      
      // Check if it's a 500 error
      if (error.status === 500) {
        console.log('\n🔍 500 Error Detected!');
        console.log('   This could mean:');
        console.log('   1. Database function error (provision_tenant)');
        console.log('   2. Authorization logic error (uppercase enum mismatch)');
        console.log('   3. User creation failed');
        console.log('   4. RPC call failed');
      }
      
      return;
    }

    console.log(`✅ Edge function executed successfully (${duration}ms)`);

    // Step 5: Parse response
    console.log('\n📋 Step 5: Parsing response...');
    
    if (data.success) {
      console.log('✅ Tenant provisioned successfully! 🎉\n');
      console.log('📊 Provisioning Result:');
      console.log('   Tenant ID:', data.data?.tenantId || data.tenantId || 'N/A');
      console.log('   Slug:', data.data?.slug || data.slug || 'N/A');
      console.log('   Primary URL:', data.data?.primaryUrl || data.primaryUrl || 'N/A');
      console.log('   Run ID:', data.data?.runId || data.runId || 'N/A');
      console.log('   Request ID:', data.requestId || 'N/A');
      console.log('   Message:', data.data?.message || data.message || 'N/A');
      
      // Verify tenant was created
      console.log('\n📋 Step 6: Verifying tenant in database...');
      const tenantId = data.data?.tenantId || data.tenantId;
      
      if (tenantId) {
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name, slug, status, email, created_at')
          .eq('id', tenantId)
          .single();

        if (tenantError) {
          console.error('⚠️  Could not verify tenant:', tenantError.message);
        } else {
          console.log('✅ Tenant verified in database:');
          console.log('   ID:', tenant.id);
          console.log('   Name:', tenant.name);
          console.log('   Slug:', tenant.slug);
          console.log('   Status:', tenant.status);
          console.log('   Email:', tenant.email);
          console.log('   Created:', new Date(tenant.created_at).toLocaleString());
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ TEST PASSED - Tenant provisioning is working! 🎉');
      console.log('='.repeat(60));
      
    } else {
      console.error('❌ Provisioning failed:');
      console.error('   Error:', data.error?.message || 'Unknown error');
      console.error('   Code:', data.error?.code || 'No code');
      console.log('\n📋 Full Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Unexpected error during test:');
    console.error('   Type:', error.constructor.name);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    // Sign out
    console.log('\n📋 Cleaning up...');
    await supabase.auth.signOut();
    console.log('✅ Signed out');
  }
}

// Run the test
testTenantProvisioning().catch(err => {
  console.error('Fatal error:', err);
  Deno.exit(1);
});
