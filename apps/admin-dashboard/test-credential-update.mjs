import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = "https://kbfbbkcaxhzlnbqxwgoz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3NDkwMTUsImV4cCI6MjA0MjMyNTAxNX0.zXRy-8XSUJ-8wvfOaGBTp47vH-9OVAaAJf-9y1GgYdQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("🧪 Testing Credential Update\n");

// First, let's sign in as admin
const email = prompt("Enter your admin email: ");
const password = prompt("Enter your admin password: ");

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (authError) {
  console.error("❌ Login failed:", authError);
  Deno.exit(1);
}

console.log("✅ Logged in as:", authData.user.email);

// Get a tenant to test with
console.log("\n📋 Fetching tenants...");
const { data: tenants, error: tenantsError } = await supabase
  .from("tenants")
  .select("id, name, email")
  .limit(5);

if (tenantsError) {
  console.error("❌ Failed to fetch tenants:", tenantsError);
  Deno.exit(1);
}

console.log("\nAvailable tenants:");
tenants.forEach((t, i) => {
  console.log(`${i + 1}. ${t.name} - ${t.email} (${t.id})`);
});

const tenantChoice = parseInt(prompt("\nSelect tenant number: ")) - 1;
const selectedTenant = tenants[tenantChoice];

if (!selectedTenant) {
  console.error("❌ Invalid selection");
  Deno.exit(1);
}

console.log(`\n🎯 Selected: ${selectedTenant.name}`);
console.log(`   Current email: ${selectedTenant.email}`);

// Now test the credential update
const newEmail = prompt("\nEnter new email to test (or press Enter to skip): ");

if (newEmail && newEmail.trim()) {
  console.log("\n🔄 Calling manage-tenant-credentials function...");
  
  const { data, error } = await supabase.functions.invoke(
    "manage-tenant-credentials",
    {
      body: {
        tenantId: selectedTenant.id,
        action: "update_email",
        newEmail: newEmail.trim()
      }
    }
  );

  if (error) {
    console.error("\n❌ Function call failed:");
    console.error("   Status:", error.status);
    console.error("   Message:", error.message);
    console.error("   Details:", JSON.stringify(error, null, 2));
    
    // Try to get function logs
    console.log("\n📋 Check the Supabase Dashboard > Edge Functions > manage-tenant-credentials > Logs");
    console.log("   Look for entries with [CREDENTIALS] prefix to see detailed error");
    
    Deno.exit(1);
  }

  console.log("\n✅ Success!");
  console.log("   Response:", JSON.stringify(data, null, 2));
} else {
  console.log("\n⏭️  Skipped email update test");
}

// Check if we can see the profile
console.log("\n🔍 Checking profile data for this tenant...");
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, user_id, email")
  .eq("email", selectedTenant.email)
  .maybeSingle();

if (profileError) {
  console.error("❌ Profile lookup failed:", profileError);
} else if (!profile) {
  console.log("⚠️  No profile found for this tenant email");
} else {
  console.log("✅ Profile found:");
  console.log("   Profile ID:", profile.id);
  console.log("   User ID:", profile.user_id || "NULL ⚠️");
  console.log("   Email:", profile.email);
  
  if (!profile.user_id) {
    console.log("\n⚠️  WARNING: Profile has NULL user_id!");
    console.log("   This will cause credential update failures.");
    console.log("   The profile needs to be linked to an auth user.");
  }
}

console.log("\n✨ Test complete!");
