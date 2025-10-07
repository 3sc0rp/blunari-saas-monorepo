import { createClient } from "npm:@supabase/supabase-js@2";

// Initialize Supabase client with service role
const supabaseUrl = "https://kbfbbkcaxhzlnbqxwgoz.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjc0OTAxNSwiZXhwIjoyMDQyMzI1MDE1fQ.Bi1ZSNiVOzlfch2RqFO8LURqz9mO4kLBWKhQf1xM0lM";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 DEBUGGING 500 ERROR\n");
console.log("=".repeat(60));

// 1. Check if profiles have user_id
console.log("\n1️⃣  CHECKING PROFILES TABLE STRUCTURE:");
const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, user_id, email")
  .limit(10);

if (profilesError) {
  console.error("❌ Error fetching profiles:", profilesError);
} else {
  console.log(`   Found ${profiles.length} profiles`);
  
  const withUserId = profiles.filter(p => p.user_id !== null);
  const withoutUserId = profiles.filter(p => p.user_id === null);
  
  console.log(`   ✅ Profiles with user_id: ${withUserId.length}`);
  console.log(`   ❌ Profiles WITHOUT user_id: ${withoutUserId.length}`);
  
  if (withoutUserId.length > 0) {
    console.log("\n   ⚠️  PROBLEM FOUND: Profiles with NULL user_id:");
    withoutUserId.forEach(p => {
      console.log(`      - ${p.email} (profile_id: ${p.id})`);
    });
  }
}

// 2. Check tenants and their profiles
console.log("\n2️⃣  CHECKING TENANT-PROFILE LINKAGE:");
const { data: tenants, error: tenantsError } = await supabase
  .from("tenants")
  .select("id, name, email")
  .neq("email", "admin@blunari.ai")
  .limit(10);

if (tenantsError) {
  console.error("❌ Error fetching tenants:", tenantsError);
} else {
  console.log(`   Checking ${tenants.length} tenants...\n`);
  
  for (const tenant of tenants) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, user_id, email")
      .eq("email", tenant.email)
      .maybeSingle();
    
    let status = "❌ NO PROFILE";
    if (profile) {
      if (profile.user_id) {
        status = "✅ HAS user_id";
      } else {
        status = "⚠️  NULL user_id";
      }
    }
    
    console.log(`   ${status} - ${tenant.name} (${tenant.email})`);
    if (profile && !profile.user_id) {
      console.log(`      Profile ID: ${profile.id}, User ID: NULL`);
    }
  }
}

// 3. Check auto_provisioning records
console.log("\n3️⃣  CHECKING AUTO-PROVISIONING RECORDS:");
const { data: provisioning, error: provError } = await supabase
  .from("auto_provisioning")
  .select("tenant_id, user_id, status")
  .limit(10);

if (provError) {
  console.error("❌ Error fetching provisioning:", provError);
} else {
  console.log(`   Found ${provisioning.length} provisioning records`);
  console.log(`   Status breakdown:`);
  
  const completed = provisioning.filter(p => p.status === "completed");
  const failed = provisioning.filter(p => p.status === "failed");
  const pending = provisioning.filter(p => p.status === "pending");
  
  console.log(`   ✅ Completed: ${completed.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   ⏳ Pending: ${pending.length}`);
}

// 4. Check RLS policies
console.log("\n4️⃣  CHECKING RLS POLICIES:");
const { data: policies, error: policiesError } = await supabase
  .rpc("exec_sql", { 
    sql: "SELECT tablename, policyname, roles FROM pg_policies WHERE tablename IN ('profiles', 'tenants', 'auto_provisioning') ORDER BY tablename, policyname" 
  })
  .catch(() => {
    // RPC might not exist, try direct query
    return { data: null, error: { message: "Cannot query policies directly" } };
  });

if (policiesError) {
  console.log("   ⚠️  Cannot check policies (this is okay)");
} else if (policies) {
  console.log(`   Found ${policies.length} policies`);
}

// 5. Try to simulate the credential update logic
console.log("\n5️⃣  SIMULATING CREDENTIAL UPDATE LOGIC:");

if (tenants && tenants.length > 0) {
  const testTenant = tenants[0];
  console.log(`   Testing with: ${testTenant.name} (${testTenant.email})\n`);
  
  // Step 1: Check auto_provisioning
  const { data: prov } = await supabase
    .from("auto_provisioning")
    .select("user_id")
    .eq("tenant_id", testTenant.id)
    .eq("status", "completed")
    .maybeSingle();
  
  if (prov) {
    console.log(`   ✅ Step 1: Found provisioning record (user_id: ${prov.user_id})`);
  } else {
    console.log(`   ℹ️  Step 1: No provisioning record, will use fallback`);
    
    // Step 2: Lookup by email
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id, email")
      .eq("email", testTenant.email)
      .maybeSingle();
    
    if (profileError) {
      console.log(`   ❌ Step 2: Profile lookup FAILED: ${profileError.message}`);
    } else if (!profileData) {
      console.log(`   ❌ Step 2: No profile found for ${testTenant.email}`);
    } else {
      console.log(`   ✅ Step 2: Profile found`);
      console.log(`      Profile ID: ${profileData.id}`);
      console.log(`      User ID: ${profileData.user_id || "NULL ⚠️"}`);
      
      if (!profileData.user_id) {
        console.log(`\n   🔥 ISSUE FOUND: Profile exists but user_id is NULL!`);
        console.log(`      This is why credential updates fail.`);
        console.log(`      The profile needs to be linked to an auth user.`);
      } else {
        // Step 3: Try to verify the auth user exists
        console.log(`   ✅ Step 3: Checking if auth user exists...`);
        
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profileData.user_id);
        
        if (authError) {
          console.log(`   ❌ Auth user lookup failed: ${authError.message}`);
        } else if (!authUser || !authUser.user) {
          console.log(`   ❌ Auth user not found!`);
        } else {
          console.log(`   ✅ Auth user verified: ${authUser.user.email}`);
        }
      }
    }
  }
}

// 6. Summary and recommendations
console.log("\n" + "=".repeat(60));
console.log("📊 DIAGNOSIS SUMMARY:");
console.log("=".repeat(60));

const issuesFound = [];

if (profiles) {
  const nullUserIds = profiles.filter(p => p.user_id === null).length;
  if (nullUserIds > 0) {
    issuesFound.push(`${nullUserIds} profiles with NULL user_id`);
  }
}

if (issuesFound.length > 0) {
  console.log("\n⚠️  ISSUES FOUND:");
  issuesFound.forEach(issue => {
    console.log(`   - ${issue}`);
  });
  
  console.log("\n💡 RECOMMENDED FIXES:");
  console.log("   1. Run the fix_null_user_ids.sql script (I'll create it)");
  console.log("   2. Or use 'Regenerate Credentials' for affected tenants");
  console.log("   3. Re-deploy the edge function to ensure latest code");
} else {
  console.log("\n✅ No obvious issues found!");
  console.log("   Check edge function logs for the specific error.");
}

console.log("\n" + "=".repeat(60));
