import { createClient } from "npm:@supabase/supabase-js@2";

// Initialize Supabase client with service role
const supabaseUrl = "https://kbfbbkcaxhzlnbqxwgoz.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 Checking Tenant Database State...\n");

// 1. Check tenants with admin email
console.log("1️⃣ Tenants with admin@blunari.ai email:");
const { data: adminTenants, error: adminError } = await supabase
  .from("tenants")
  .select("id, name, email, created_at")
  .eq("email", "admin@blunari.ai")
  .order("created_at", { ascending: false });

if (adminError) {
  console.error("❌ Error:", adminError);
} else {
  console.log(`   Found ${adminTenants.length} tenants with admin email:`);
  adminTenants.forEach(t => {
    console.log(`   - ${t.name} (${t.id}) - Created: ${new Date(t.created_at).toLocaleString()}`);
  });
}

console.log("\n2️⃣ Recent tenants (last 10):");
const { data: recentTenants, error: recentError } = await supabase
  .from("tenants")
  .select("id, name, email, created_at, status")
  .order("created_at", { ascending: false })
  .limit(10);

if (recentError) {
  console.error("❌ Error:", recentError);
} else {
  recentTenants.forEach(t => {
    const emoji = t.email === "admin@blunari.ai" ? "⚠️" : "✅";
    console.log(`   ${emoji} ${t.name} - ${t.email} (${t.status || "active"})`);
  });
}

console.log("\n3️⃣ Auto-provisioning records:");
const { data: provRecords, error: provError } = await supabase
  .from("auto_provisioning")
  .select("tenant_id, user_id, status, created_at")
  .order("created_at", { ascending: false })
  .limit(10);

if (provError) {
  console.error("❌ Error:", provError);
} else {
  console.log(`   Found ${provRecords.length} provisioning records:`);
  provRecords.forEach(p => {
    console.log(`   - Tenant: ${p.tenant_id.slice(0, 8)}... User: ${p.user_id.slice(0, 8)}... Status: ${p.status}`);
  });
}

console.log("\n4️⃣ Profiles consistency check:");
const { data: profiles, error: profileError } = await supabase
  .from("profiles")
  .select("id, user_id, email")
  .order("created_at", { ascending: false })
  .limit(15);

if (profileError) {
  console.error("❌ Error:", profileError);
} else {
  console.log(`   Found ${profiles.length} profiles:`);
  profiles.forEach(p => {
    const emoji = p.user_id ? "✅" : "⚠️";
    console.log(`   ${emoji} ${p.email} - user_id: ${p.user_id ? p.user_id.slice(0, 8) + "..." : "NULL"}`);
  });
}

// 5. Check for orphaned tenants (no auto_provisioning record)
console.log("\n5️⃣ Orphaned tenants (no provisioning record):");
const { data: allTenants } = await supabase
  .from("tenants")
  .select("id, name, email");

const { data: allProv } = await supabase
  .from("auto_provisioning")
  .select("tenant_id");

const provTenantIds = new Set(allProv?.map(p => p.tenant_id) || []);
const orphaned = allTenants?.filter(t => !provTenantIds.has(t.id)) || [];

console.log(`   Found ${orphaned.length} orphaned tenants:`);
orphaned.forEach(t => {
  console.log(`   ⚠️ ${t.name} - ${t.email} (${t.id.slice(0, 8)}...)`);
});

console.log("\n" + "=".repeat(60));
console.log("📊 SUMMARY:");
console.log(`   Total tenants with admin email: ${adminTenants?.length || 0}`);
console.log(`   Total orphaned tenants: ${orphaned.length}`);
console.log(`   Recent provisioning records: ${provRecords?.length || 0}`);
console.log("=".repeat(60));
