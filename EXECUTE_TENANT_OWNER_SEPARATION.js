/**
 * TENANT OWNER SEPARATION - PRODUCTION FIX
 * 
 * This script separates production tenants that currently share the same owner_id.
 * Each tenant will get its own dedicated owner account with unique credentials.
 * 
 * INSTRUCTIONS:
 * 1. Open https://admin.blunari.ai in your browser
 * 2. Login with admin credentials
 * 3. Press F12 to open Developer Console
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to execute
 * 6. SAVE ALL GENERATED PASSWORDS SECURELY!
 * 
 * SAFETY:
 * - Creates NEW auth users (doesn't modify existing ones)
 * - Preserves all tenant data (bookings, tables, menus, etc.)
 * - Low risk operation
 * - Can be re-run if it fails (idempotent for already-fixed tenants)
 */

(async function fixTenantOwners() {
  console.log('🚀 TENANT OWNER SEPARATION - Starting...\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Check current state
  console.log('📊 Step 1: Checking current tenant state...\n');
  
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, slug, owner_id, email')
    .order('created_at');

  if (tenantsError) {
    console.error('❌ Failed to fetch tenants:', tenantsError);
    return;
  }

  console.table(tenants);

  // Check for shared owners
  const ownerCounts = {};
  tenants.forEach(t => {
    if (t.owner_id) {
      ownerCounts[t.owner_id] = (ownerCounts[t.owner_id] || 0) + 1;
    }
  });

  const sharedOwners = Object.entries(ownerCounts).filter(([_, count]) => count > 1);
  
  if (sharedOwners.length === 0) {
    console.log('✅ All tenants already have unique owners! No fix needed.\n');
    return;
  }

  console.log(`⚠️  Found ${sharedOwners.length} shared owner(s):\n`);
  sharedOwners.forEach(([ownerId, count]) => {
    console.log(`   Owner ID: ${ownerId} is shared by ${count} tenants`);
  });
  console.log('\n');

  // Step 2: Confirm execution
  console.log('⏳ Step 2: Proceeding with fix in 3 seconds...\n');
  console.log('   (Close console now if you want to abort)\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Fix each tenant
  console.log('🔧 Step 3: Creating unique owners for each tenant...\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = [];

  for (const tenant of tenants) {
    // Generate unique email based on slug
    const uniqueEmail = `${tenant.slug}@blunari.ai`;
    
    console.log(`\n🔧 Processing: ${tenant.name} (${tenant.slug})`);
    console.log(`   Current owner_id: ${tenant.owner_id}`);
    console.log(`   New owner email: ${uniqueEmail}`);

    try {
      const { data, error } = await supabase.functions.invoke('fix-tenant-owner', {
        body: {
          tenantId: tenant.id,
          newOwnerEmail: uniqueEmail
        }
      });

      if (error) {
        console.error(`   ❌ Failed:`, error);
        results.push({ 
          tenant: tenant.name, 
          slug: tenant.slug,
          status: '❌ FAILED', 
          error: error.message 
        });
      } else if (data.error) {
        console.error(`   ❌ Failed:`, data.error);
        results.push({ 
          tenant: tenant.name, 
          slug: tenant.slug,
          status: '❌ FAILED', 
          error: data.error 
        });
      } else {
        console.log(`   ✅ Success!`);
        console.log(`   📧 Email: ${data.newOwner.email}`);
        console.log(`   🔑 Password: ${data.newOwner.temporaryPassword}`);
        console.log(`   👤 User ID: ${data.newOwner.userId}`);
        
        results.push({ 
          tenant: tenant.name,
          slug: tenant.slug,
          email: data.newOwner.email,
          password: data.newOwner.temporaryPassword,
          userId: data.newOwner.userId,
          status: '✅ SUCCESS'
        });
      }
    } catch (err) {
      console.error(`   ❌ Exception:`, err);
      results.push({ 
        tenant: tenant.name, 
        slug: tenant.slug,
        status: '❌ ERROR', 
        error: err.message 
      });
    }

    // Rate limit - wait 500ms between operations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Step 4: Display results
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.table(results);

  // Step 5: Verify separation
  console.log('\n🔍 Step 5: Verifying separation...\n');
  
  const { data: verifyTenants } = await supabase
    .from('tenants')
    .select('name, slug, owner_id')
    .order('name');

  const ownerCountsAfter = {};
  verifyTenants.forEach(t => {
    if (t.owner_id) {
      ownerCountsAfter[t.owner_id] = (ownerCountsAfter[t.owner_id] || 0) + 1;
    }
  });

  const sharedOwnersAfter = Object.entries(ownerCountsAfter).filter(([_, count]) => count > 1);
  
  if (sharedOwnersAfter.length === 0) {
    console.log('✅ VERIFICATION PASSED: All tenants now have unique owners!\n');
  } else {
    console.log('⚠️  VERIFICATION WARNING: Some tenants still share owners:\n');
    sharedOwnersAfter.forEach(([ownerId, count]) => {
      console.log(`   Owner ID: ${ownerId} is shared by ${count} tenants`);
    });
    console.log('\n');
  }

  // Step 6: Display credentials summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔑 CREDENTIALS SUMMARY - SAVE THESE SECURELY!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const successResults = results.filter(r => r.status === '✅ SUCCESS');
  
  if (successResults.length > 0) {
    successResults.forEach(r => {
      console.log(`Tenant: ${r.tenant} (${r.slug})`);
      console.log(`  Email: ${r.email}`);
      console.log(`  Password: ${r.password}`);
      console.log(`  User ID: ${r.userId}`);
      console.log('');
    });
    
    console.log('⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Copy all passwords from above to a secure location');
    console.log('   2. Send credentials to each tenant owner');
    console.log('   3. Instruct them to change password on first login');
    console.log('   4. Test login for each tenant to verify access');
  }

  console.log('\n✅ TENANT OWNER SEPARATION COMPLETE!\n');
})();
