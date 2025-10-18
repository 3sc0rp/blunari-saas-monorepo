// Secure test harness (no hardcoded secrets). Usage:
//   $Env:SUPABASE_URL="https://<project>.supabase.co" \
//   $Env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
//   node apps/admin-dashboard/test-500-error.js
// Optional:
//   $Env:TEST_TENANT_EMAIL="owner@example.com"
// This script ONLY performs read + reversible email change on profiles for diagnostics.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmail = process.env.TEST_TENANT_EMAIL || "drood.tech@gmail.com";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log("🧪 Credential diagnostics starting...\n");
console.log("Tenant owner email target:", testEmail);

async function main() {
  // 1. Tenant lookup
  console.log("1️⃣ Tenant lookup");
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, email")
    .eq("email", testEmail)
    .maybeSingle();

  if (tenantError) throw new Error(`Tenant lookup failed: ${tenantError.message}`);
  if (!tenant) throw new Error("No tenant found with that email");
  console.log("✅ Tenant:", tenant.id, tenant.name);

  // 2. Provisioning record
  console.log("\n2️⃣ Provisioning record");
  const { data: prov, error: provError } = await supabase
    .from("auto_provisioning")
    .select("user_id, status")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (provError) throw new Error(`Provisioning lookup failed: ${provError.message}`);
  console.log("ℹ️ provisioning:", prov || null);

  let tenantOwnerId = prov?.user_id || null;

  // 3. Profile fallback
  if (!tenantOwnerId) {
    console.log("\n3️⃣ Profile lookup (provisioning missing)");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id, email")
      .eq("email", tenant.email)
      .maybeSingle();
    if (profileError) throw new Error(`Profile lookup failed: ${profileError.message}`);
    if (!profile) throw new Error("No profile for tenant email");
    console.log("✅ Profile:", profile);
    if (!profile.user_id) throw new Error("Profile user_id NULL — needs manual fix");
    tenantOwnerId = profile.user_id;
  }

  console.log("\n✅ Tenant owner user_id:", tenantOwnerId);

  // 4. Auth user verification
  console.log("\n4️⃣ Auth user verification");
  const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(tenantOwnerId);
  if (authUserError) throw new Error(`Auth user lookup failed: ${authUserError.message}`);
  if (!authUser?.user) throw new Error("Auth user not found");
  console.log("✅ Auth user email:", authUser.user.email);

  // 5. Reversible profile update test
  console.log("\n5️⃣ Reversible profile update test");
  const tempEmail = `temp_${Date.now()}_${testEmail}`;
  const { error: updErr } = await supabase
    .from("profiles")
    .update({ email: tempEmail })
    .eq("user_id", tenantOwnerId);
  if (updErr) throw new Error(`Profile temp update failed: ${updErr.message}`);
  console.log("✅ Temp email set:", tempEmail);
  // revert
  const { error: revertErr } = await supabase
    .from("profiles")
    .update({ email: testEmail })
    .eq("user_id", tenantOwnerId);
  if (revertErr) throw new Error(`Revert failed: ${revertErr.message}`);
  console.log("✅ Reverted to original email");

  console.log("\n🎉 Diagnostics complete — underlying tables responsive. Edge function should succeed if caller JWT has proper roles.");
}

main().catch((e) => {
  console.error("❌ Diagnostic failure:", e.message);
  process.exit(1);
});
